import Foundation

/// The user's session: the access token every request carries, and the
/// refresh token that renews it. One renewal runs at a time, however many
/// requests find the access token lapsed together.
actor TokenStore {
    struct Tokens: Codable, Sendable {
        let access: String
        let refresh: String
        let userId: String
        let email: String
    }
    struct Identity: Equatable, Sendable {
        let generation: UInt64
        let userId: String?
    }
    enum SessionError: LocalizedError, UserFailureCode {
        var userFailureCode: String? { "UNAUTHENTICATED" }
        case changed
        var errorDescription: String? { "The signed-in account changed." }
    }

    private let account: String

    private(set) var current: Tokens?
    private var generation: UInt64 = 0
    private var renewal: (generation: UInt64, task: Task<Tokens?, Never>)?
    private let changed: @Sendable (Tokens?) -> Void

    /// `changed` hears every sign-in, renewal and sign-out, so the UI can follow.
    init(account: String = "tokens", changed: @escaping @Sendable (Tokens?) -> Void) {
        self.account = account
        self.changed = changed
        current = Keychain.read(account).flatMap { try? JSONDecoder().decode(Tokens.self, from: $0) }
        changed(current)
    }

    var accessToken: String? { current?.access }
    var identity: Identity { .init(generation: generation, userId: current?.userId) }
    func accessToken(ifIdentity expected: Identity) throws -> String? {
        guard identity == expected else { throw SessionError.changed }
        return current?.access
    }

    func save(_ tokens: Tokens) {
        invalidateRenewal()
        persist(tokens)
    }

    private func persist(_ tokens: Tokens) {
        current = tokens
        if let data = try? JSONEncoder().encode(tokens) {
            Keychain.write(data, for: account)
        }
        changed(tokens)
    }

    func clear() {
        invalidateRenewal()
        remove()
    }

    @discardableResult
    func clear(ifIdentity expected: Identity) -> Bool {
        guard identity == expected else { return false }
        clear()
        return true
    }

    private func remove() {
        current = nil
        Keychain.delete(account)
        changed(nil)
    }

    private func invalidateRenewal() {
        generation &+= 1
        renewal?.task.cancel()
        renewal = nil
    }

    /// Renews the session with `exchange`, or joins the renewal already running.
    /// A refused refresh token ends the session.
    func renew(ifIdentity expected: Identity? = nil, _ exchange: @escaping @Sendable (String) async throws -> Tokens) async -> Tokens? {
        if let expected, identity != expected { return nil }
        if let renewal {
            let result = await renewal.task.value
            return generation == renewal.generation ? result : nil
        }
        guard let refresh = current?.refresh else { return nil }
        let started = generation
        let task = Task<Tokens?, Never> {
            let result = try? await exchange(refresh)
            // Cancellation alone cannot stop a response already in flight.
            // Commit once, inside the actor, before any joined waiter returns.
            return finishRenewal(result, generation: started)
        }
        renewal = (started, task)
        let result = await task.value
        return generation == started ? result : nil
    }

    private func finishRenewal(_ result: Tokens?, generation started: UInt64) -> Tokens? {
        guard generation == started, renewal?.generation == started else { return nil }
        renewal = nil
        if let result { persist(result) } else { remove() }
        return result
    }
}
