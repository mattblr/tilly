import Foundation

@main enum ChallengeChecks {
    static func main() {
        let start = PhotoChallenge.date("2026-11-01T00:00:00Z")!
        let end = PhotoChallenge.date("2026-11-06T00:00:00.000Z")!
        let challenge = PhotoChallenge(id: "postbox", title: "Postbox cats", description: "Cat and postbox", icon: "postbox", startsAt: start, endsAt: end, version: "v1", targetCount: 1, enabled: true)
        precondition(!challenge.active(at: start.addingTimeInterval(-1)))
        precondition(challenge.active(at: start))
        precondition(challenge.active(at: end.addingTimeInterval(-1)))
        precondition(!challenge.active(at: end))
        for active in [false, true] {
            for progress in [0, 1, 2] {
                for date in [nil, start] {
                    let badge = ChallengeBadge(id: "badge", challengeKey: "postbox", version: "v1", title: "Postbox cats", icon: "postbox", progress: progress, targetCount: 2, active: active, earnedAt: date)
                    precondition(badge.earned == (active && progress == 2 && date != nil))
                }
            }
        }
        precondition(PhotoChallenge.symbol("arbitrary-remote-asset") == "sparkles")
        precondition(PhotoChallenge.date("tomorrow") == nil)
        let collection = ChallengeCollection(challenges: [challenge])
        precondition(ChallengeCollection().activeChallenges(at: start).isEmpty)
        precondition(collection.activeChallenges(at: start.addingTimeInterval(-1)).isEmpty)
        precondition(collection.activeChallenges(at: end).isEmpty)
        let disabled = PhotoChallenge(id: "off", title: "Off", description: "Off", icon: "camera", startsAt: start, endsAt: end, version: "v1", targetCount: 1, enabled: false)
        precondition(ChallengeCollection(challenges: [disabled]).activeChallenges(at: start).isEmpty)
        precondition(PhotoChallenge.timelineDates([], from: start) == [start])
        precondition(PhotoChallenge.timelineDates([disabled], from: start) == [start])
        let beforeStart = start.addingTimeInterval(-1)
        precondition(PhotoChallenge.timelineDates([challenge], from: beforeStart) == [beforeStart, start, end])
        precondition(PhotoChallenge.timelineDates([challenge, challenge], from: start) == [start, end])
        precondition(PhotoChallenge.timelineDates([challenge], from: end) == [end])
        print("Native challenge window and earned badge controls passed.")
    }
}
