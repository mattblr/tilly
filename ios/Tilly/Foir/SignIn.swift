import Apollo
import Foundation

/// Apple and email-code sign-in finish on the platform's step route. The
/// short-lived step credential authorizes verification; session tokens stay
/// in the native Keychain for the selected environment.
extension Foir {
    /// An Apple sign-in for an address that already has an account waits for
    /// the code Fóir has just sent there, so the address's owner says yes.
    struct LinkNeeded: LocalizedError, Sendable {
        let stepId: String
        let stepToken: String
        let pending: String

        var errorDescription: String? {
            "That Apple ID's address already has a Tilly account. Enter the code we've just emailed it to link them."
        }
    }

    /// Signs in with the authorization code Apple's sheet handed the app. Fóir
    /// redeems it with Apple server to server, so Apple's answer is the proof,
    /// not anything the app says.
    func signInWithApple(code: String) async throws {
        let started = try await anonymous.perform(mutation: FoirAPI.StartProviderSignInMutation(providerKey: "apple"))
        if let error = started.errors?.first {
            signInRefusalDiagnostic(stage: "provider-start", code: error.extensions?["code"] as? String)
        }
        let begun = try Self.data(of: started).signInWithProvider
        guard let step = begun?.step,
              let state = begun?.redirectUrl.flatMap(URLComponents.init(string:))?.queryItems?.first(where: { $0.name == "state" })?.value
        else {
            throw FoirError(message: "Sign in with Apple isn't available right now.", code: nil)
        }
        do {
            try await finish(step: step.id, token: step.token, route: "provider", body: ["providerKey": "apple", "code": code, "state": state], email: nil)
        } catch let refusal as StepRefusal {
            if let pending = refusal.providerSignIn?.pending, !pending.isEmpty {
                throw LinkNeeded(stepId: step.id, stepToken: step.token, pending: pending)
            }
            throw refusal.error
        }
    }

    func confirmLink(code: String, link: LinkNeeded) async throws {
        try await finish(step: link.stepId, token: link.stepToken, route: "link", body: ["pending": link.pending, "code": code], email: nil)
    }

    struct EmailCodeStep: Sendable {
        let id: String
        let token: String
        let email: String
    }

    /// Uses the platform's step credential, never a custom password or a
    /// console-operator session. The same account can sign in on web and native.
    func requestSignInCode(email: String) async throws -> EmailCodeStep {
        let response = try await anonymous.perform(mutation: FoirAPI.RequestSignInCodeMutation(email: email))
        let step = try Self.data(of: response).requestOTP
        return EmailCodeStep(id: step.id, token: step.token, email: email)
    }

    func confirmSignInCode(_ code: String, step: EmailCodeStep) async throws {
        try await finish(step: step.id, token: step.token, route: "code", body: ["code": code], email: step.email)
    }

    /// Ends the session on the platform as well as on the phone. The phone
    /// forgets it even when the platform can't be reached.
    func signOut() async {
        let identity = await tokens.identity
        await unregisterNotificationDevice(ifIdentity: identity)
        _ = try? await perform(FoirAPI.EndSessionMutation(), ifIdentity: identity)
        await tokens.clear(ifIdentity: identity)
    }

    /// Swaps the refresh token for a new pair. The session ends if it's refused.
    @discardableResult
    func renew(ifIdentity expected: TokenStore.Identity? = nil) async -> TokenStore.Tokens? {
        await tokens.renew(ifIdentity: expected) { [anonymous] refresh in
            let response = try await anonymous.perform(mutation: FoirAPI.RefreshSessionMutation(refreshToken: refresh))
            guard let result = try Foir.data(of: response).refreshToken else {
                throw FoirError(message: "The session could not be renewed.", code: nil)
            }
            return .init(access: result.token, refresh: result.refreshToken, userId: result.userId, email: result.email)
        }
    }

    /// Posts a step's proof to its route and keeps the session it answers.
    private func finish(step id: String, token: String, route: String, body: [String: String], email: String?) async throws {
        let id = id.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? id
        var request = URLRequest(url: config.route("/v1/sign-ins/\(id)/\(route)"))
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(token, forHTTPHeaderField: "X-Foir-Token")
        request.httpBody = try JSONEncoder().encode(body)

        let (data, response) = try await URLSession.shared.data(for: request)
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        guard (200..<300).contains(status) else {
            let refusal = (try? JSONDecoder().decode(StepRefusal.self, from: data)) ?? StepRefusal(message: nil, code: nil, providerSignIn: nil)
            signInRefusalDiagnostic(stage: route, status: status, code: refusal.code, reason: refusal.providerSignIn?.code)
            throw refusal
        }
        // A provider's finish names its user flat; a link's may name it in `user`.
        let signedIn = try JSONDecoder().decode(StepSignIn.self, from: data)
        guard let userId = signedIn.user?.id ?? signedIn.userId else {
            throw FoirError(message: "The sign-in came back without a user.", code: nil)
        }
        await tokens.save(.init(
            access: signedIn.accessToken,
            refresh: signedIn.refreshToken,
            userId: userId,
            email: signedIn.user?.email ?? signedIn.email ?? email ?? ""
        ))
    }
}

/// Only stable protocol codes enter debug logs; never proofs, tokens or addresses.
private func signInRefusalDiagnostic(stage: String, status: Int = 0, code: String?, reason: String? = nil) {
    #if DEBUG
    let codes = ["PERMISSION_DENIED", "UNAUTHENTICATED", "INVALID_ARGUMENT", "FAILED_PRECONDITION", "NOT_FOUND", "UNAVAILABLE", "INTERNAL", "RESOURCE_EXHAUSTED"]
    let reasons = ["signup_closed", "user_cap_reached", "account_unavailable", "account_not_here", "email_unavailable", "provider_refused", "provider_unavailable", "provider_exchange_failed", "provider_not_offered", "provider_named_no_address", "sign_in_not_completed", "mfa_required"]
    print("Tilly SignIn refused stage=\(stage) status=\(status) code=\(code.flatMap { codes.contains($0) ? $0 : nil } ?? "other") reason=\(reason.flatMap { reasons.contains($0) ? $0 : nil } ?? "other")")
    #endif
}

private struct StepSignIn: Decodable {
    struct User: Decodable {
        let id: String
        let email: String?
    }

    let accessToken: String
    let refreshToken: String
    let user: User?
    let userId: String?
    let email: String?
}

/// A step route's refusal, in the platform's words.
private struct StepRefusal: Error, Decodable {
    struct ProviderSignIn: Decodable {
        let code: String?
        let pending: String?
    }

    let message: String?
    let code: String?
    let providerSignIn: ProviderSignIn?

    var error: FoirError { FoirError(message: message ?? "That didn't work. Try again.", code: code) }

    enum CodingKeys: String, CodingKey {
        case message = "error"
        case code
        case providerSignIn
    }
}
