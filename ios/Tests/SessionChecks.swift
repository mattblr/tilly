import Foundation

/// Host-only storage fake: these checks never read or change the real keychain.
enum Keychain {
    private final class Memory: @unchecked Sendable {
        let lock = NSLock()
        var values: [String: Data] = [:]
    }
    private static let memory = Memory()
    static func read(_ account: String) -> Data? {
        memory.lock.lock(); defer { memory.lock.unlock() }
        return memory.values[account]
    }
    static func write(_ data: Data, for account: String) {
        memory.lock.lock(); defer { memory.lock.unlock() }
        memory.values[account] = data
    }
    static func delete(_ account: String) {
        memory.lock.lock(); defer { memory.lock.unlock() }
        memory.values.removeValue(forKey: account)
    }
}

@main enum SessionChecks {
    struct Refused: Error {}
    actor Exchange {
        private var waiting: CheckedContinuation<TokenStore.Tokens, any Error>?
        private var started = false
        func run() async throws -> TokenStore.Tokens {
            started = true
            return try await withCheckedThrowingContinuation { waiting = $0 }
        }
        func waitUntilStarted() async { while !started { await Task.yield() } }
        func finish(_ result: Result<TokenStore.Tokens, any Error>) { waiting?.resume(with: result); waiting = nil }
    }
    static func fixture(_ user: String) -> TokenStore.Tokens {
        .init(access: "\(user)-access", refresh: "\(user)-refresh", userId: user, email: "\(user)@example.invalid")
    }
    static func expect(_ tokens: TokenStore.Tokens?, user: String?) {
        precondition(tokens?.userId == user, "An environment read another environment's session")
    }
    static func main() async {
        let live = TokenStore(changed: { _ in })
        await live.save(.init(access: "live-test-access", refresh: "live-test-refresh", userId: "live-user", email: "live@example.invalid"))
        let development = TokenStore(account: "tokens.development", changed: { _ in })
        expect(await development.current, user: nil)
        await development.save(.init(access: "dev-test-access", refresh: "dev-test-refresh", userId: "dev-user", email: "dev@example.invalid"))
        expect(await TokenStore(changed: { _ in }).current, user: "live-user")
        expect(await TokenStore(account: "tokens.development", changed: { _ in }).current, user: "dev-user")
        await development.clear()
        expect(await TokenStore(changed: { _ in }).current, user: "live-user")
        expect(await TokenStore(account: "tokens.development", changed: { _ in }).current, user: nil)
        await development.save(.init(access: "dev-test-access", refresh: "dev-test-refresh", userId: "dev-user", email: "dev@example.invalid"))
        _ = await live.renew { _ in throw Refused() }
        expect(await TokenStore(changed: { _ in }).current, user: nil)
        expect(await TokenStore(account: "tokens.development", changed: { _ in }).current, user: "dev-user")
        // The transport deliberately ignores cancellation, as a response may
        // already be in flight when sign-out/deletion clears the session.
        let race = TokenStore(account: "tokens.race", changed: { _ in })
        for replacement in [false, true] {
            for succeeds in [false, true] {
                await race.save(fixture("old"))
                let exchange = Exchange()
                let pending = Task { await race.renew { _ in try await exchange.run() } }
                await exchange.waitUntilStarted()
                await race.clear()
                if replacement { await race.save(fixture("new")) }
                await exchange.finish(succeeds ? .success(fixture("old")) : .failure(Refused()))
                let late = await pending.value
                precondition(late == nil, "A superseded refresh returned the old session")
                expect(await race.current, user: replacement ? "new" : nil)
                expect(await TokenStore(account: "tokens.race", changed: { _ in }).current, user: replacement ? "new" : nil)
            }
        }
        // A late completion must not remove the replacement account's own
        // renewal handle or prevent that renewal from committing.
        await race.save(fixture("old"))
        let oldExchange = Exchange(), newExchange = Exchange()
        let oldRequest = Task { await race.renew { _ in try await oldExchange.run() } }
        await oldExchange.waitUntilStarted()
        await race.save(fixture("new"))
        let newRequest = Task { await race.renew { _ in try await newExchange.run() } }
        await newExchange.waitUntilStarted()
        await oldExchange.finish(.failure(Refused()))
        let obsolete = await oldRequest.value
        precondition(obsolete == nil)
        expect(await race.current, user: "new")
        let renewed = TokenStore.Tokens(access: "new-renewed-access", refresh: "new-renewed-refresh", userId: "new", email: "new@example.invalid")
        await newExchange.finish(.success(renewed))
        let accepted = await newRequest.value
        precondition(accepted?.access == renewed.access)
        let stored = await TokenStore(account: "tokens.race", changed: { _ in }).current
        precondition(stored?.access == renewed.access)
        let previousIdentity = await race.identity
        await race.save(fixture("replacement"))
        let clearedOtherUser = await race.clear(ifIdentity: previousIdentity)
        precondition(!clearedOtherUser, "Old cleanup cleared the replacement account")
        let unexpectedRenewal = await race.renew(ifIdentity: previousIdentity) { _ in
            preconditionFailure("An old request renewed the replacement account")
        }
        precondition(unexpectedRenewal == nil)
        do {
            _ = try await race.accessToken(ifIdentity: previousIdentity)
            preconditionFailure("An old request obtained the replacement account's bearer")
        } catch TokenStore.SessionError.changed { }
        catch { preconditionFailure("Unexpected credential error") }
        expect(await race.current, user: "replacement")
        let activeIdentity = await race.identity
        let clearedExpectedUser = await race.clear(ifIdentity: activeIdentity)
        precondition(clearedExpectedUser)
        expect(await race.current, user: nil)
        print("Native session checks pass: environment isolation and late refresh after sign-out/account replacement, including refused responses.")
    }
}
