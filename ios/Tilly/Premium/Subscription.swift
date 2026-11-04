@preconcurrency import RevenueCat
import Foundation
import Observation

/// Buying Tilly Premium. RevenueCat talks to the store, but whether a user has
/// Premium is only ever decided by their grant in Fóir: after any purchase the
/// `claim-premium` operation checks RevenueCat against the webhook-written grant.
/// Refreshes the verified grant on sign-in, foreground, purchase and restore.
/// Closed-app provider changes arrive through the installation’s signed webhook.
@MainActor @Observable
final class Subscription {
    enum Outcome: Equatable {
        case done, cancelled, nothingToRestore, pending, failed
    }

    static let offering = "premium"
    static let entitlement = "premium"

    /// What's on sale, once the store has said. Its price is the store's own.
    private(set) var package: Package?
    /// Whether the store was asked and had nothing to sell.
    private(set) var unavailable = false

    private let foir: Foir
    private let art: Art

    init(foir: Foir, art: Art) {
        self.foir = foir
        self.art = art
        if let key = Bundle.main.infoDictionary?["RevenueCatKey"] as? String, !key.isEmpty {
            Purchases.configure(withAPIKey: key)
            watchStore()
        }
    }

    // MARK: Changes while the app is open

    private var storeUpdates: Task<Void, Never>?
    private var storeState: String?

    /// RevenueCat reports renewals, expiries, refunds and purchases made elsewhere
    /// while the app is open. Its first report is the state identify() already
    /// reconciles; after that, any change re-reads the Fóir grant.
    private func watchStore() {
        storeUpdates = Task { [weak self] in
            for await info in Purchases.shared.customerInfoStream {
                guard let self else { return }
                let entitlement = info.entitlements[Self.entitlement]
                let state = "\(entitlement?.isActive == true)|\(entitlement?.expirationDate?.timeIntervalSince1970 ?? 0)"
                let first = storeState == nil
                guard state != storeState else { continue }
                storeState = state
                if !first { await storeChanged(active: entitlement?.isActive == true) }
            }
        }
    }

    /// Fóir's grant follows RevenueCat's webhook, which can land a few seconds
    /// after the store reports. Read now and again shortly after; if the store
    /// says active and Fóir hasn't caught up, show the syncing state.
    private func storeChanged(active: Bool) async {
        let identity = await foir.tokens.identity
        guard let userId = identity.userId, userId == identifiedUserId else { return }
        for wait in [0, 5, 15, 30] {
            if wait > 0 { try? await Task.sleep(for: .seconds(wait)) }
            guard await foir.tokens.identity == identity else { return }
            await art.reloadPremium(signedIn: true)
            if art.premium == active { awaitingPremium = false; return }
        }
        if active { awaitingPremium = true }
    }

    // RevenueCat is process-wide. Queue identity, purchase and restore work so a
    // delayed login cannot switch the SDK underneath another account's purchase.
    private var storeWork: Task<Void, Never>?
    private var identifiedUserId: String?
    private var transacting = false
    private(set) var awaitingPremium = false

    private func serialized(_ work: @escaping @MainActor () async -> Outcome) async -> Outcome {
        let previous = storeWork
        let task = Task { @MainActor in
            await previous?.value
            return await work()
        }
        storeWork = Task { _ = await task.value }
        return await task.value
    }

    /// Line the SDK up with the verified account before reconciling its grant.
    func identify(_ userId: String?) async {
        let identity = await foir.tokens.identity
        _ = await serialized { [self] in
            guard identity.userId == userId, await foir.tokens.identity == identity else { return .cancelled }
            if identifiedUserId != userId { package = nil; unavailable = false; awaitingPremium = false }
            identifiedUserId = nil
            guard Purchases.isConfigured else { unavailable = true; return .failed }
            do {
                if let userId {
                    _ = try await Purchases.shared.logIn(userId)
                } else if !Purchases.shared.isAnonymous {
                    _ = try await Purchases.shared.logOut()
                }
                guard await foir.tokens.identity == identity else { return .cancelled }
                guard userId == nil || Purchases.shared.appUserID == userId else { return .failed }
                identifiedUserId = userId
                if userId != nil { try await foir.claimPremium(ifIdentity: identity); awaitingPremium = false }
                guard await foir.tokens.identity == identity else { return .cancelled }
                await art.reloadPremium(signedIn: userId != nil)
                return .done
            } catch {
                if await foir.tokens.identity == identity,
                   (error as? FoirError)?.code == "PREMIUM_SYNC_PENDING" { awaitingPremium = true }
                // Keep the SDK's matched identity when only server reconciliation
                // failed: a deliberate purchase/restore can retry that boundary.
                if await foir.tokens.identity == identity {
                    await art.reloadPremium(signedIn: userId != nil)
                }
                return .failed
            }
        }
    }

    func loadOffer() async {
        guard Purchases.isConfigured else { unavailable = true; return }
        let identity = await foir.tokens.identity
        _ = await serialized { [self] in
            guard await foir.tokens.identity == identity else { return .cancelled }
            let offerings = try? await Purchases.shared.offerings()
            guard await foir.tokens.identity == identity else { return .cancelled }
            let offer = offerings?.offering(identifier: Self.offering) ?? offerings?.current
            package = offer?.monthly ?? offer?.availablePackages.first
            unavailable = package == nil
            return .done
        }
    }

    func buy() async -> Outcome {
        guard Purchases.isConfigured else { return .failed }
        guard !transacting else { return .cancelled }
        if awaitingPremium { return await refresh() }
        transacting = true
        defer { transacting = false }
        let identity = await foir.tokens.identity
        return await serialized { [self] in
            guard let userId = identity.userId, await foir.tokens.identity == identity,
                  identifiedUserId == userId, Purchases.shared.appUserID == userId else { return .cancelled }
            guard let package else { return .failed }
            do {
                let result = try await Purchases.shared.purchase(package: package)
                if result.userCancelled { return .cancelled }
                guard await foir.tokens.identity == identity else { return .cancelled }
                awaitingPremium = true
                let active = try await foir.claimPremium(ifIdentity: identity)
                guard await foir.tokens.identity == identity else { return .cancelled }
                guard active else { return .pending }
                await art.reloadPremium(signedIn: true)
                guard await foir.tokens.identity == identity else { return .cancelled }
                guard art.premium else { return .pending }
                awaitingPremium = false
                return .done
            } catch {
                if await foir.tokens.identity != identity { return .cancelled }
                if awaitingPremium { return .pending }
                let failure = error as NSError
                return failure.domain == ErrorCode.errorDomain && failure.code == ErrorCode.purchaseCancelledError.rawValue ? .cancelled : .failed
            }
        }
    }

    func restore() async -> Outcome {
        guard Purchases.isConfigured else { return .failed }
        guard !transacting else { return .cancelled }
        transacting = true
        defer { transacting = false }
        let identity = await foir.tokens.identity
        return await serialized { [self] in
            guard let userId = identity.userId, await foir.tokens.identity == identity,
                  identifiedUserId == userId, Purchases.shared.appUserID == userId else { return .cancelled }
            do {
                let info = try await Purchases.shared.restorePurchases()
                guard await foir.tokens.identity == identity else { return .cancelled }
                // Check provider state against the sole webhook writer; a
                // restore never races that writer or synthesizes a grant.
                awaitingPremium = info.entitlements[Self.entitlement]?.isActive == true
                let active = try await foir.claimPremium(ifIdentity: identity)
                guard await foir.tokens.identity == identity else { return .cancelled }
                if awaitingPremium && !active { return .pending }
                await art.reloadPremium(signedIn: true)
                guard await foir.tokens.identity == identity else { return .cancelled }
                if info.entitlements[Self.entitlement]?.isActive != true { awaitingPremium = false; return .nothingToRestore }
                guard art.premium else { return .pending }
                awaitingPremium = false
                return .done
            } catch {
                guard await foir.tokens.identity == identity else { return .cancelled }
                if (error as? FoirError)?.code == "PREMIUM_SYNC_PENDING" { awaitingPremium = true }
                return awaitingPremium ? .pending : .failed
            }
        }
    }

    /// Retry the read-only status check, never the completed purchase.
    func refresh() async -> Outcome {
        let identity = await foir.tokens.identity
        return await serialized { [self] in
            guard identity.userId != nil, await foir.tokens.identity == identity else { return .cancelled }
            do {
                let active = try await foir.claimPremium(ifIdentity: identity)
                guard await foir.tokens.identity == identity else { return .cancelled }
                if awaitingPremium && !active { return .pending }
                await art.reloadPremium(signedIn: true)
                guard await foir.tokens.identity == identity else { return .cancelled }
                if active && !art.premium { awaitingPremium = true; return .pending }
                awaitingPremium = false
                return art.premium ? .done : .nothingToRestore
            } catch {
                guard await foir.tokens.identity == identity else { return .cancelled }
                return awaitingPremium ? .pending : .failed
            }
        }
    }

}

extension Foir {
    @discardableResult
    func claimPremium(ifIdentity expected: TokenStore.Identity? = nil) async throws -> Bool {
        let run = try await perform(FoirAPI.ClaimPremiumMutation(), ifIdentity: expected).executeTillyClaimPremium
        if let error = run?.result?.error ?? run?.execution.error {
            throw FoirError(message: error, code: error == "PREMIUM_SYNC_PENDING" ? error : nil)
        }
        guard run?.result?.ok == true, let active = run?.result?.active else {
            throw FoirError(message: "Premium verification did not complete. Try again.", code: nil)
        }
        return active
    }
}
