import AuthenticationServices
import SwiftUI

/// Apple and email-code sign-in share the same Fóir user pool.
struct SignInSheet: View {
    let reason: String
    var detail: String? = nil
    var onSignedIn: (() -> Void)? = nil

    @Environment(AppModel.self) private var model
    @Environment(\.colorScheme) private var colorScheme
    @State private var code = ""
    @State private var link: Foir.LinkNeeded?
    @State private var working = false
    @State private var failure: String?
    @State private var email = ""
    @State private var emailCode = ""
    @State private var emailStep: Foir.EmailCodeStep?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                Wordmark().padding(.top, 20)
                ScreenTitle(title: reason, subtitle: detail ?? model.config.t("sign-in.intro"))
                    .padding(.bottom, 20)
                if let link {
                    linkEntry(link)
                } else {
                    SignInWithAppleButton(.signIn) { request in
                        request.requestedScopes = [.email]
                    } onCompletion: { result in
                        signInWithApple(result)
                    }
                    .signInWithAppleButtonStyle(colorScheme == .dark ? .white : .black)
                    .frame(height: 50)
                    .clipShape(Capsule())
                    .disabled(working)
                    emailSignIn
                }
                if let failure {
                    Text(model.config.failureText(failure)).font(.meta).foregroundStyle(.red).padding(.top, 14)
                }
            }
            .padding(.horizontal, Theme.margin)
            .padding(.bottom, 24)
        }
        .background(Theme.background)
        .tint(Theme.signal)
    }

    /// An Apple ID whose address already has an account links to it once the
    /// address's owner enters the code Fóir has just emailed.
    private func linkEntry(_ link: Foir.LinkNeeded) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            Text(model.config.t("sign-in.linkCode")).font(.meta)
            field("123456", text: $code)
                .keyboardType(.numberPad)
                .textContentType(.oneTimeCode)
                .padding(.top, 7)
            Text(model.config.t("sign-in.linkExplanation")).font(.meta).foregroundStyle(Theme.muted).padding(.top, 8)
            Button(model.config.t("sign-in.link")) { run { try await model.foir.confirmLink(code: code, link: link); onSignedIn?() } }
                .buttonStyle(.primary)
                .disabled(code.isEmpty || working)
                .padding(.top, 14)
            Button(model.config.t("common.cancel")) {
                code = ""
                self.link = nil
            }
            .buttonStyle(.plainAction)
            .padding(.top, 4)
        }
    }

    /// Email-code sign-in also serves people who joined on the web.
    private var emailSignIn: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text(model.config.t("sign-in.emailTitle")).font(.meta).foregroundStyle(Theme.muted).padding(.top, 28)
            field(model.config.t("sign-in.email"), text: $email)
                .keyboardType(.emailAddress)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
                .disabled(emailStep != nil || working)
                .padding(.top, 8)
            if let emailStep {
                field(model.config.t("sign-in.code"), text: $emailCode)
                    .keyboardType(.numberPad)
                    .textContentType(.oneTimeCode)
                    .padding(.top, 8)
                Button(model.config.t("sign-in.verify")) {
                    run { try await model.foir.confirmSignInCode(emailCode.trimmingCharacters(in: .whitespacesAndNewlines), step: emailStep); onSignedIn?() }
                }
                .buttonStyle(.secondary)
                .disabled(emailCode.isEmpty || working)
                .padding(.top, 10)
                Button(model.config.t("sign-in.differentEmail")) { self.emailStep = nil; emailCode = "" }
                    .buttonStyle(.plainAction)
                    .disabled(working)
            } else {
                Button(model.config.t("sign-in.send")) {
                    run { emailStep = try await model.foir.requestSignInCode(email: email.trimmingCharacters(in: .whitespacesAndNewlines)) }
                }
                .buttonStyle(.secondary)
                .disabled(!email.contains("@") || working)
                .padding(.top, 10)
            }
        }
    }

    private func field(_ prompt: String, text: Binding<String>) -> some View {
        TextField(prompt, text: text)
            .padding(12)
            .frame(minHeight: 46)
            .background(Theme.raised, in: RoundedRectangle(cornerRadius: 10))
            .overlay(RoundedRectangle(cornerRadius: 10).stroke(Theme.rule, lineWidth: 1))
    }

    /// Apple's sheet hands back an authorization code, and Fóir redeems it.
    private func signInWithApple(_ result: Result<ASAuthorization, any Error>) {
        switch result {
        case .success(let authorization):
            guard let credential = authorization.credential as? ASAuthorizationAppleIDCredential,
                  let data = credential.authorizationCode,
                  let code = String(data: data, encoding: .utf8)
            else {
                failure = "errors.appleCode"
                return
            }
            run { try await model.foir.signInWithApple(code: code); onSignedIn?() }
        case .failure(let error):
            if (error as? ASAuthorizationError)?.code != .canceled {
                failure = UserFailure.key(error)
            }
        }
    }

    private func run(_ action: @escaping () async throws -> Void) {
        working = true
        failure = nil
        Task {
            do {
                try await action()
            } catch let needed as Foir.LinkNeeded {
                code = ""
                link = needed
            } catch {
                failure = UserFailure.key(error)
            }
            working = false
        }
    }
}
