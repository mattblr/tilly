import Foundation
import Observation
import UIKit
import UserNotifications

/// Reads artwork created by native finalized-request hooks.
@MainActor @Observable
final class Art {
    struct Piece: Hashable {
        enum Status: String {
            case making, ready, failed
        }

        let status: Status
        let style: String
        let image: URL?
        let ownerId: String?
    }

    /// Art by capture (its photo key).
    private(set) var pieces: [String: Piece] = [:]
    /// Whether the signed-in user has premium.
    private(set) var premium = false

    private let foir: Foir

    init(foir: Foir) {
        self.foir = foir
    }

    func piece(for photoKey: String) -> Piece? { pieces[photoKey] }

    /// Active Fóir grants include verified subscriptions and separately awarded access.
    func reloadPremium(signedIn: Bool) async {
        guard signedIn else { return premium = false }
        let identity = await foir.tokens.identity
        let now = ISO8601DateFormatter().string(from: .now)
        let count = try? await foir.fetch(FoirAPI.MyPremiumQuery(now: .some(now)), ifIdentity: identity).myPremiumGrants.totalCount
        let current = await foir.tokens.identity
        guard current.generation == identity.generation, current.userId == identity.userId else { return }
        premium = (count ?? 0) > 0
    }

    /// Reads the art of these captures, a page at a time.
    func load(_ photoKeys: some Sequence<String>) async {
        let keys = Array(Set(photoKeys))
        guard !keys.isEmpty else { return }
        let identity = await foir.tokens.identity
        let found = try? await Paging.all(in: keys) { piece, after in
            let page = try await self.foir.fetch(FoirAPI.ArtForQuery(photoKeys: .some(piece), after: .maybe(after)), ifIdentity: identity).catchArts
            return (page.edges.map(\.node), page.pageInfo.fragments.more)
        }
        let current = await foir.tokens.identity
        guard current.generation == identity.generation, current.userId == identity.userId, let found else { return }
        // A successful empty read means access was narrowed. Do not retain an
        // old signed image link from a previous audience or account.
        for key in keys { pieces.removeValue(forKey: key) }
        for node in found {
            guard let key = node.photoKey, let status = node.status.flatMap(Piece.Status.init(rawValue:)) else { continue }
            pieces[key] = Piece(status: status, style: node.style ?? "", image: node.art?.fragments.photoThumb.mediumURL, ownerId: node._ownerId)
        }
    }

    func forget() {
        premium = false
        pieces = [:]
    }
}

extension Foir {
    /// Tells Fóir where to send this phone's pushes.
    func registerDevice(token: Data) async throws {
        let hex = token.map { String(format: "%02x", $0) }.joined()
        let input = FoirAPI.RegisterDeviceTokenInput(deviceName: .some(await UIDevice.current.name), platform: .case(.ios), token: hex)
        _ = try await perform(FoirAPI.RegisterDeviceMutation(input: input))
    }
}

/// Push notifications: asked for when they're first worth having, and the
/// phone's address handed to Fóir whenever the system gives one.
@MainActor
enum Push {
    static var deviceToken: Data?
    /// Asks once to send notifications, then registers with APNs. A user who
    /// says no isn't asked again; their art still arrives, just unannounced.
    static func askAndRegister() async {
        let center = UNUserNotificationCenter.current()
        let settings = await center.notificationSettings()
        switch settings.authorizationStatus {
        case .notDetermined:
            guard (try? await center.requestAuthorization(options: [.alert, .sound, .badge])) == true else { return }
        case .denied:
            return
        default:
            break
        }
        UIApplication.shared.registerForRemoteNotifications()
    }

    /// Registers again at launch when notifications are already allowed, since
    /// the system can change the phone's address.
    static func registerIfAllowed() async {
        let settings = await UNUserNotificationCenter.current().notificationSettings()
        if settings.authorizationStatus == .authorized || settings.authorizationStatus == .provisional {
            UIApplication.shared.registerForRemoteNotifications()
        }
    }
}
