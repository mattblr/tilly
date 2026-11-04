import Foundation
import RevenueCat

// Compile alongside the production Subscription.swift and the host-only SDK
// double. These are account/race controls, not store or device acceptance.
actor TokenStore {
    struct Identity: Equatable, Sendable { let generation: Int; let userId: String? }
    enum SessionError: Error { case changed }
    private var generation = 0
    private var userId: String? = "alice"
    var identity: Identity { .init(generation: generation, userId: userId) }
    func replace(_ userId: String?) { generation += 1; self.userId = userId }
}
struct FoirError: Error { let message: String; let code: String? }
enum FoirAPI { struct ClaimPremiumMutation {} }
@MainActor final class Foir {
    struct Config {}
    struct Result { var ok: Bool? = true; var error: String?; var active: Bool? = true }
    struct Execution { var error: String? }
    struct Run { var result: Result? = Result(); var execution = Execution() }
    struct Answer { var executeTillyClaimPremium: Run? }
    let tokens = TokenStore()
    var config = Config()
    var claims: [String] = []
    var run: Run? = Run()
    var grant = false
    func perform(_ mutation: FoirAPI.ClaimPremiumMutation, ifIdentity expected: TokenStore.Identity?) async throws -> Answer {
        let identity = await tokens.identity
        guard expected == nil || expected == identity else { throw TokenStore.SessionError.changed }
        claims.append(identity.userId ?? "anonymous")
        return Answer(executeTillyClaimPremium: run)
    }
}
@MainActor final class Art {
    let foir: Foir
    private(set) var premium = false
    var reloads = 0
    init(foir: Foir) { self.foir = foir }
    func reloadPremium(signedIn: Bool) async { reloads += 1; premium = signedIn && foir.grant }
}
@main struct SubscriptionChecks {
    @MainActor static func fixture() -> (Foir, Art, Subscription) {
        Purchases.shared.reset(); Purchases.isConfigured = true
        let foir = Foir(), art: Art
        art = Art(foir: foir)
        return (foir, art, Subscription(foir: foir, art: art))
    }
    @MainActor static func waitFor(_ condition: () -> Bool) async {
        for _ in 0..<10_000 { if condition() { return }; await Task.yield() }
        fatalError("Held SDK call did not start")
    }
    @MainActor static func check(_ result: Subscription.Outcome, _ expected: Subscription.Outcome, _ message: String = "Unexpected purchase result") { precondition(result == expected, message) }
    @MainActor static func main() async throws {
        do {
            let (foir, _, store) = fixture()
            await store.identify("alice"); await store.loadOffer()
            foir.grant = true
            check(await store.buy(), .done)
            precondition(foir.claims == ["alice", "alice"])
        }
        do {
            let (foir, _, store) = fixture()
            Purchases.shared.loginFails = true
            await store.identify("alice"); await store.loadOffer()
            check(await store.buy(), .cancelled)
            precondition(Purchases.shared.purchaseUsers.isEmpty && foir.claims.isEmpty)
        }
        do {
            let (foir, _, store) = fixture()
            Purchases.shared.holdLogin = true
            let old = Task { await store.identify("alice") }
            await waitFor { Purchases.shared.loginWaiting != nil }
            await foir.tokens.replace("bob")
            let replacement = Task { await store.identify("bob") }
            Purchases.shared.releaseLogin()
            await old.value; await replacement.value
            precondition(Purchases.shared.appUserID == "bob")
            precondition(foir.claims == ["bob"], "Late A login cannot reconcile B or A")
        }
        do {
            let (foir, _, store) = fixture()
            await store.identify("alice"); await store.loadOffer(); foir.claims = []
            Purchases.shared.holdPurchase = true
            let purchase = Task { await store.buy() }
            await waitFor { Purchases.shared.purchaseWaiting != nil }
            check(await store.buy(), .cancelled, "Concurrent purchase is refused")
            await foir.tokens.replace("bob")
            let replacement = Task { await store.identify("bob") }
            await Task.yield()
            precondition(Purchases.shared.appUserID == "alice", "SDK identity stays fixed during its purchase")
            Purchases.shared.releasePurchase()
            check(await purchase.value, .cancelled)
            await replacement.value
            precondition(foir.claims == ["bob"], "Late A purchase cannot claim as replacement B")
        }
        do {
            let (foir, art, store) = fixture()
            await store.identify("alice"); await store.loadOffer(); foir.claims = []
            Purchases.shared.cancelPurchase = true
            check(await store.buy(), .cancelled)
            precondition(foir.claims.isEmpty)
            Purchases.shared.cancelPurchase = false; foir.run = nil; foir.grant = true
            check(await store.buy(), .pending, "Completed purchase with missing claim result stays pending")
            precondition(!art.premium)
        }
        do {
            let (foir, _, store) = fixture()
            await store.identify("alice"); foir.claims = []
            Purchases.shared.restoreActive = false
            check(await store.restore(), .nothingToRestore)
            precondition(foir.claims == ["alice"], "An empty restore still reconciles a lapsed server grant")
        }
        do {
            let (foir, _, store) = fixture()
            await store.identify("alice"); await store.loadOffer()
            foir.run = .init(result: .init(ok: false, error: "PREMIUM_SYNC_PENDING"))
            check(await store.buy(), .pending)
            precondition(store.awaitingPremium)
            check(await store.buy(), .pending)
            precondition(Purchases.shared.purchaseUsers.count == 1, "Pending status checks cannot buy twice")
            foir.run = .init(); foir.grant = true
            check(await store.refresh(), .done)
            precondition(!store.awaitingPremium && Purchases.shared.purchaseUsers.count == 1)
        }
        do {
            let (foir, _, store) = fixture()
            foir.run = .init(result: .init(ok: false, error: "PREMIUM_SYNC_PENDING"))
            await store.identify("alice")
            precondition(store.awaitingPremium, "Reopened account preserves provider/grant pending state")
            foir.run = .init()
            await foir.tokens.replace("bob"); await store.identify("bob")
            precondition(!store.awaitingPremium, "A different account never inherits purchase pending state")
        }
        do {
            let (foir, _, store) = fixture()
            await store.identify("alice"); await store.loadOffer()
            foir.run = .init(result: .init(active: false))
            check(await store.buy(), .pending, "A completed payment is not failure/rebuy when provider visibility lags")
            check(await store.buy(), .pending)
            precondition(Purchases.shared.purchaseUsers.count == 1 && store.awaitingPremium)
        }
        print("Subscription checks passed: successful server grant, refused SDK identity, held account login/purchase replacement, concurrent purchase, cancel, failed claim and empty restore.")
    }
}
