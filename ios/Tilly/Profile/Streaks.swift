import Foundation
import Observation

/// Days in a row the user has caught a cat, and the badges those runs
/// earn. Worked out on the phone from the user's own sightings, in the
/// phone's time zone: a day is a calendar day where they are.
@MainActor @Observable
final class Streaks {
    typealias Tier = AppConfig.Tier

    /// The run that's still alive: it ends today, or yesterday when today's
    /// catch hasn't happened yet.
    private(set) var current = 0
    private(set) var best = 0
    private(set) var caughtToday = false
    private(set) var loaded = false
    private(set) var ownerId: String?
    private var revision = 0
    /// A tier the last reload reached that the one before hadn't.
    private(set) var newlyEarned: Tier?

    /// The streak tiers, as the console sets them, shortest first.
    var tiers: [Tier] { config.tiers }
    var earned: [Tier] { tiers.filter { best >= $0.days } }
    var nextTier: Tier? { tiers.first { best < $0.days } }
    /// The tier the current run is in: the style premium art takes today.
    var currentTier: Tier? { tiers.last { current >= $0.days } }

    private let foir: Foir
    private let config: AppConfig

    init(foir: Foir, config: AppConfig) {
        self.foir = foir
        self.config = config
    }

    func reload(signedIn: Bool) async {
        revision += 1
        let request = revision
        let identity = await foir.tokens.identity
        guard signedIn, let userId = identity.userId else {
            ownerId = nil
            (current, best, caughtToday, loaded, newlyEarned) = (0, 0, false, false, nil)
            return
        }
        if ownerId != userId {
            (current, best, caughtToday, loaded, newlyEarned) = (0, 0, false, false, nil)
            ownerId = userId
        }
        let before = loaded ? Set(earned) : nil
        guard let dates = try? await Paging.all({ after in
            let page = try await self.foir.fetch(FoirAPI.MyCanonicalCaptureDaysQuery(after: .maybe(after)), ifIdentity: identity).myCapturePhotos
            return (page.edges.compactMap { Recency.date($0.node._createdAt) }, page.pageInfo.fragments.more)
        }) else { return }
        // A slow page from a previous account must not populate this account's badge.
        guard request == revision, await foir.tokens.identity == identity else { return }
        let stats = CaptureStreak(dates)
        (current, best, caughtToday) = (stats.current, stats.best, stats.caughtToday)
        newlyEarned = before.flatMap { before in earned.last { !before.contains($0) } }
        loaded = true
    }
}
