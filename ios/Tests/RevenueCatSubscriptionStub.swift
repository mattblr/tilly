// Host-only RevenueCat double. Never part of the application target.
import Foundation
public struct Package: Sendable { public init() {} }
public struct EntitlementInfo: Sendable { public var isActive: Bool; public var expirationDate: Date? = nil }
public struct CustomerInfo: Sendable { public var entitlements: [String: EntitlementInfo] }
public struct Offering: Sendable { public var monthly: Package? = Package(); public var availablePackages = [Package()] }
public struct Offerings: Sendable { public var current: Offering? = Offering(); public func offering(identifier: String) -> Offering? { current } }
public struct PurchaseResult: Sendable { public var userCancelled: Bool }
public enum ErrorCode: Int, Error, CustomNSError { case purchaseCancelledError = 1 }
@MainActor public final class Purchases {
    public static var isConfigured = false
    public static let shared = Purchases()
    public static func configure(withAPIKey: String) { isConfigured = true }
    public var appUserID = "anonymous"
    public var isAnonymous: Bool { appUserID == "anonymous" }
    public var loginUsers: [String] = []
    public var purchaseUsers: [String] = []
    public var loginFails = false
    public var holdLogin = false
    public var holdPurchase = false
    public var cancelPurchase = false
    public var restoreActive = true
    public var loginWaiting: CheckedContinuation<Void, Never>?
    public var purchaseWaiting: CheckedContinuation<Void, Never>?
    public func reset() {
        appUserID = "anonymous"; loginUsers = []; purchaseUsers = []
        loginFails = false; holdLogin = false; holdPurchase = false
        cancelPurchase = false; restoreActive = true
        loginWaiting = nil; purchaseWaiting = nil
    }
    public func releaseLogin() { holdLogin = false; loginWaiting?.resume(); loginWaiting = nil }
    public func releasePurchase() { holdPurchase = false; purchaseWaiting?.resume(); purchaseWaiting = nil }
    public func logIn(_ userId: String) async throws -> CustomerInfo {
        loginUsers.append(userId)
        if holdLogin { await withCheckedContinuation { loginWaiting = $0 } }
        if loginFails { throw NSError(domain: "fixture", code: 2) }
        appUserID = userId
        return CustomerInfo(entitlements: [:])
    }
    public func logOut() async throws -> CustomerInfo { appUserID = "anonymous"; return CustomerInfo(entitlements: [:]) }
    public func offerings() async throws -> Offerings { Offerings() }
    public func purchase(package: Package) async throws -> PurchaseResult {
        purchaseUsers.append(appUserID)
        if holdPurchase { await withCheckedContinuation { purchaseWaiting = $0 } }
        return PurchaseResult(userCancelled: cancelPurchase)
    }
    /// Reports nothing in host checks; the app only reacts to changes after the first.
    public var customerInfoStream: AsyncStream<CustomerInfo> { AsyncStream { $0.finish() } }
    public func restorePurchases() async throws -> CustomerInfo { CustomerInfo(entitlements: ["premium": EntitlementInfo(isActive: restoreActive)]) }
}
