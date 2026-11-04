import Foundation
import Observation

/// Who has reshared each capture the user has seen, newest first. A capture
/// is one card wherever it shows: a reshare floats on it rather than making
/// another.
@MainActor @Observable
final class Reshares {
    struct Reshare: Hashable {
        let postId: String
        let userId: String
        let comment: String?
        let at: Date
    }

    private(set) var byCapture: [String: [Reshare]] = [:]

    func on(_ photoKey: String) -> [Reshare] { byCapture[photoKey] ?? [] }

    func add(_ reshare: Reshare, to photoKey: String) {
        var list = byCapture[photoKey] ?? []
        guard !list.contains(where: { $0.postId == reshare.postId }) else { return }
        list.append(reshare)
        byCapture[photoKey] = list.sorted { $0.at > $1.at }
    }

    /// Takes in the reshares among these posts, and answers the posts as
    /// cards: one a capture, a reshare dropped where the user already sees
    /// its capture.
    ///
    /// `follows` is whether the user sees a capture without the reshare:
    /// they follow its catcher or its cat, or caught it themselves.
    func cards(_ posts: [FeedPost], shown: inout Set<String>, follows: (FeedPost) -> Bool) -> [FeedPost] {
        var cards: [FeedPost] = []
        for post in posts {
            if let resharer = post.resharerId {
                add(Reshare(postId: post.id, userId: resharer, comment: post.comment, at: post.postedAt), to: post.photoKey)
                // The capture keeps its own place in the feed, wearing the reshare.
                if follows(post) { continue }
            }
            if shown.insert(post.photoKey).inserted { cards.append(post) }
        }
        return cards
    }
}
