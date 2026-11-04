import Foundation

/// Challenge rules are published content; qualification and progress only come
/// from the signed operation's private evidence, never local face detection.
struct PhotoChallenge: Identifiable, Sendable {
    let id: String
    let title: String
    let description: String
    let icon: String
    let startsAt: Date
    let endsAt: Date
    let version: String
    let targetCount: Int
    let enabled: Bool

    func active(at date: Date) -> Bool { enabled && startsAt <= date && date < endsAt }

    /// Explicit boundary ticks keep an already-open invitation accurate without
    /// polling the network or changing the device clock.
    static func timelineDates(_ challenges: [PhotoChallenge], from now: Date) -> [Date] {
        Array(Set([now] + challenges.filter(\.enabled).flatMap { [$0.startsAt, $0.endsAt] }.filter { $0 > now })).sorted()
    }

    static func date(_ value: String?) -> Date? {
        guard let value else { return nil }
        let fractional = ISO8601DateFormatter()
        fractional.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return fractional.date(from: value) ?? ISO8601DateFormatter().date(from: value)
    }

    static func symbol(_ value: String) -> String {
        switch value {
        case "postbox": "envelope"
        case "selfie": "person.crop.square"
        case "camera": "camera"
        case "tree": "tree"
        default: "sparkles"
        }
    }
}

struct ChallengeBadge: Identifiable, Sendable {
    let id: String
    let challengeKey: String
    let version: String
    let title: String
    let icon: String
    let progress: Int
    let targetCount: Int
    let active: Bool
    let earnedAt: Date?

    var earned: Bool { active && targetCount > 0 && progress >= targetCount && earnedAt != nil }
}

struct ChallengeEvidence: Identifiable, Sendable {
    enum Status: String, Sendable {
        case reserved, evaluating, qualified
        case notQualified = "not-qualified"
        case unavailable, recovery, removed
    }
    let id: String
    let challengeKey: String
    let version: String
    let captureId: String
    let status: Status
    let reasonCode: String?
    let attemptCount: Int
    let retryCount: Int
}

struct ChallengeCollection: Sendable {
    var challenges: [PhotoChallenge] = []
    var badges: [ChallengeBadge] = []
    var evidence: [ChallengeEvidence] = []

    func activeChallenges(at date: Date) -> [PhotoChallenge] { challenges.filter { $0.active(at: date) } }
}
