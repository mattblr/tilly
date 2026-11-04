import Apollo
import Foundation

/// Fóir's data API as Tilly uses it: GraphQL through Apollo, and the two routes
/// beside it (a sign-in step's code, an upload's landing).
///
/// Every request carries the publishable app key, and the user's access token
/// once they have signed in. There is no server of Tilly's own in between:
/// whatever the app may not do itself runs as a Fóir operation.
final class Foir: Sendable {
    let config: FoirConfig
    let tokens: TokenStore
    let operationRetries = OperationRetries()
    /// The app key alone, for the calls that begin or renew a session.
    let anonymous: ApolloClient
    private let networkSession: URLSession

    init(config: FoirConfig = .main, tokens: TokenStore) {
        self.config = config
        self.tokens = tokens
        let session = URLSession(configuration: .ephemeral)
        networkSession = session
        anonymous = Self.client(config, tokens: nil, session: session)
    }

    private static func client(_ config: FoirConfig, tokens: TokenStore?, identity: TokenStore.Identity? = nil,
                               session: URLSession) -> ApolloClient {
        let store = ApolloStore(cache: InMemoryNormalizedCache())
        let transport = RequestChainNetworkTransport(
            urlSession: session,
            interceptorProvider: FoirInterceptors(tokens: tokens, identity: identity),
            store: store,
            endpointURL: config.graphQLURL,
            additionalHeaders: ["x-api-key": config.appKey]
        )
        return ApolloClient(networkTransport: transport, store: store)
    }

    func fetch<Query: GraphQLQuery>(_ query: Query, ifIdentity expected: TokenStore.Identity? = nil) async throws -> Query.Data
    where Query.ResponseFormat == SingleResponseFormat {
        try await withRenewal(ifIdentity: expected) { client in
            try await client.fetch(query: query, cachePolicy: .networkOnly)
        }
    }

    func perform<Mutation: GraphQLMutation>(_ mutation: Mutation, ifIdentity expected: TokenStore.Identity? = nil) async throws -> Mutation.Data
    where Mutation.ResponseFormat == SingleResponseFormat {
        try await withRenewal(ifIdentity: expected) { client in
            try await client.perform(mutation: mutation)
        }
    }

    /// A refused deletion never clears the active session or its cached data.
    func forgetDeletedAccount(identity: TokenStore.Identity) async -> Bool {
        guard await tokens.clear(ifIdentity: identity) else { return false }
        let signedOut = await tokens.identity
        if signedOut.userId == nil { await forgetNotificationDevice(ifIdentity: signedOut) }
        await MainActor.run {
            if let userID = identity.userId {
                UserDefaults.standard.removeObject(forKey: "postedEarlierCatches.v3.\(userID)")
            }
            PhotoLoader.forget()
        }
        return await tokens.current == nil
    }

    /// Runs a request, and once more if the user's access token had lapsed.
    ///
    /// A lapsed token isn't refused: the request is served as if no user had
    /// sent it, and `extensions.auth` says why. Public reads still answer, so
    /// the answer is read for that, not for an error.
    private func withRenewal<Operation: GraphQLOperation>(
        ifIdentity expected: TokenStore.Identity? = nil,
        _ send: (ApolloClient) async throws -> GraphQLResponse<Operation>
    ) async throws -> Operation.Data {
        let identity = await tokens.identity
        guard expected == nil || expected == identity else {
            throw FoirError(message: "The signed-in account changed.", code: nil)
        }
        // Bind credential lookup to this session, including requests Apollo
        // starts later. A switched account must never supply its bearer to an
        // earlier account's mutation. Reads are network-only; keep Apollo's
        // record cache inside this request so a late response cannot refill
        // another account's cache after deletion. Reuse the HTTP session only.
        let scoped = Self.client(config, tokens: tokens, identity: identity, session: networkSession)
        var response = try await send(scoped)
        guard await tokens.identity == identity else {
            throw FoirError(message: "The signed-in account changed.", code: nil)
        }
        switch Downgrade(response.extensions) {
        case .expired:
            if await renew(ifIdentity: identity) != nil { response = try await send(scoped) }
        case .rejected:
            await tokens.clear(ifIdentity: identity)
        case nil:
            break
        }
        // A retry can also finish after sign-out or an account switch.
        guard await tokens.identity == identity else {
            throw FoirError(message: "The signed-in account changed.", code: nil)
        }
        return try Self.data(of: response)
    }

    static func data<Operation: GraphQLOperation>(of response: GraphQLResponse<Operation>) throws -> Operation.Data {
        if let error = response.errors?.first {
            throw FoirError(message: error.message ?? "The request was refused.", code: error.extensions?["code"] as? String)
        }
        guard let data = response.data else { throw FoirError(message: "The request came back empty.", code: nil) }
        return data
    }
}

/// A refusal from Fóir, in the platform's own words.
struct FoirError: LocalizedError, Sendable, UserFailureCode {
    var userFailureCode: String? { code }
    let message: String
    let code: String?

    var errorDescription: String? { message }
}

/// How the platform served a request whose access token it would not accept.
private enum Downgrade {
    /// The token had lapsed: renewing the session and asking again will do.
    case expired
    /// The token was not one this project issued, or not a token at all.
    case rejected

    init?(_ extensions: [String: any Sendable & Hashable]?) {
        guard let auth = extensions?["auth"] as? [String: Any] else { return nil }
        self = auth["reason"] as? String == "expired" ? .expired : .rejected
    }
}

/// Apollo's default chain, with the user's access token added to each request.
private struct FoirInterceptors: InterceptorProvider {
    let tokens: TokenStore?
    let identity: TokenStore.Identity?

    func httpInterceptors<Operation: GraphQLOperation>(for operation: Operation) -> [any HTTPInterceptor] {
        [BearerInterceptor(tokens: tokens, identity: identity), ResponseCodeInterceptor()]
    }
}

private struct BearerInterceptor: HTTPInterceptor {
    let tokens: TokenStore?
    let identity: TokenStore.Identity?

    func intercept(request: URLRequest, next: NextHTTPInterceptorFunction) async throws -> HTTPResponse {
        var request = request
        let token: String?
        if let identity { token = try await tokens?.accessToken(ifIdentity: identity) }
        else { token = await tokens?.accessToken }
        if let token {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        return try await next(request)
    }
}
