import CoreLocation
import Foundation

/// Where a feed's posts come from, a few at a time as the user scrolls.
@MainActor
protocol PostSource: AnyObject {
    /// The next posts, up to `count`. Fewer only when there are no more.
    func next(_ count: Int) async throws -> [FoirAPI.Post]
    var finished: Bool { get }
}

extension PostSource {
    /// A feed list over this source: each page is the cards the next `count`
    /// posts make. A page whose posts all fold into cards already shown reads
    /// on, so the list never stalls on an empty page.
    func paged(count: Int = 20, build: @escaping ([FoirAPI.Post]) async -> [FeedPost]) -> Paged<FeedPost> {
        Paged(cursorBased: false) { [self] _ in
            var cards: [FeedPost] = []
            repeat {
                cards = await build(try await next(count))
            } while cards.isEmpty && !finished
            return (cards, finished ? nil : "more")
        }
    }
}

/// One list of posts, newest first, read a page at a time.
typealias PostPage = (_ after: String?) async throws -> (rows: [FoirAPI.Post], next: String?)

/// Several lists of posts as one, newest first. A list's next page is read
/// only when its last read post is the next one due, so a long list costs
/// nothing until the feed reaches it.
@MainActor
final class MergedPosts: PostSource {
    private let source: ChronologicalPages<IdentifiedPost>
    init(_ reads: [PostPage]) {
        source = ChronologicalPages(reads.map { read in
            { after in
                let page = try await read(after)
                return (page.rows.map(IdentifiedPost.init), page.next)
            }
        }, date: { Posts.date($0.post) })
    }
    var finished: Bool { source.finished }
    func next(_ count: Int) async throws -> [FoirAPI.Post] {
        try await source.next(count).rows.map(\.post)
    }
}

/// Whether a post is a capture itself, rather than a reshare of one.
private func isOriginal(_ post: FoirAPI.Post) -> Bool { post.reshareOf == nil }

/// Trending anywhere in the world: the captures most liked in the period, most
/// liked first, up to a few for any one cat; then the period's other public
/// captures, newest first.
@MainActor
final class TrendingWorldwide: PostSource {
    /// How many ranked captures one read asks for the posts of.
    static let capturesPerRead = 50

    private let foir: Foir
    private let since: String
    private let start: Date
    private let perCat: Int
    private var ranked: [String]?
    private var rankedDone = 0
    private var rest: Paged<IdentifiedPost>?
    private var restWaiting: [FoirAPI.Post] = []
    private var shown: [String: Int] = [:]
    private var seen = Set<String>()
    private(set) var finished = false

    init(foir: Foir, since: String, perCat: Int) {
        self.foir = foir
        self.since = since
        start = Recency.date(since) ?? .distantPast
        self.perCat = perCat
    }

    func next(_ count: Int) async throws -> [FoirAPI.Post] {
        var out: [FoirAPI.Post] = []
        if ranked == nil {
            // Most liked first: Fóir answers groups in count order.
            let aggregate = try await foir.fetch(FoirAPI.TopLikedCapturesQuery(since: .some(since))).captureLikeAggregate
            guard !aggregate.truncated else { throw FoirError(message: "The ranking is incomplete. Choose a shorter period or a nearby area.", code: nil) }
            ranked = aggregate.groups.compactMap(\.key)
        }
        while out.count < count, let ranked, rankedDone < ranked.count {
            let captures = Array(ranked[rankedDone..<min(rankedDone + Self.capturesPerRead, ranked.count)])
            rankedDone += captures.count
            let posts = try await Paging.all(in: captures) { [foir] piece, after in
                let page = try await foir.fetch(FoirAPI.PostsForCapturesQuery(photoKeys: .some(piece), after: .maybe(after))).capturePosts
                return (page.edges.map(\.node.fragments.post), page.pageInfo.fragments.more)
            }
            let order = Dictionary(uniqueKeysWithValues: captures.enumerated().map { ($1, $0) })
            out += posts
                .filter { $0.audience == "public" && isOriginal($0) && Posts.date($0) >= start }
                .sorted { (order[$0.photoKey ?? ""] ?? .max) < (order[$1.photoKey ?? ""] ?? .max) }
                .filter(take)
        }
        while out.count < count, let post = try await nextUnranked() {
            out.append(post)
        }
        if out.count < count { finished = true }
        return out
    }

    /// The next public capture of the period not already shown.
    private func nextUnranked() async throws -> FoirAPI.Post? {
        if rest == nil {
            rest = Paged { [foir, since] after in
                let page = try await foir.fetch(FoirAPI.PublicPostsQuery(since: .some(since), first: Int32(Paging.pageSize), after: .maybe(after))).capturePosts
                return (page.edges.map { IdentifiedPost($0.node.fragments.post) }, page.pageInfo.fragments.more.next)
            }
        }
        guard let rest else { return nil }
        while true {
            if restWaiting.isEmpty {
                if rest.finished { return nil }
                let before = rest.rows.count
                await rest.loadMore()
                if let failure = rest.failure { throw FoirError(message: failure, code: nil) }
                restWaiting = rest.rows.dropFirst(before).map(\.post)
                if restWaiting.isEmpty { return nil }
            }
            let post = restWaiting.removeFirst()
            if isOriginal(post), take(post) { return post }
        }
    }

    /// Whether a post still has room beside its cat's others.
    private func take(_ post: FoirAPI.Post) -> Bool {
        guard seen.insert(post.photoKey ?? post._id).inserted else { return false }
        let key = post.catKey ?? post._id
        guard shown[key, default: 0] < perCat else { return false }
        shown[key, default: 0] += 1
        return true
    }
}

/// Trending around one place: every public capture of the period shared within
/// reach of it, ranked by the likes it was given in the period, up to a few
/// for any one cat. A place is a bounded search, so the whole board is worked
/// out first and then shown a page at a time.
@MainActor
final class TrendingNearby: PostSource {
    private let foir: Foir
    private let center: CLLocationCoordinate2D
    private let radius: CLLocationDistance
    private let since: String
    private let perCat: Int
    private var board: [FoirAPI.Post]?
    private var shown = 0

    init(foir: Foir, center: CLLocationCoordinate2D, radius: CLLocationDistance, since: String, perCat: Int) {
        self.foir = foir
        self.center = center
        self.radius = radius
        self.since = since
        self.perCat = perCat
    }

    var finished: Bool { board.map { shown >= $0.count } ?? false }

    func next(_ count: Int) async throws -> [FoirAPI.Post] {
        if board == nil { board = try await rank() }
        let board = board ?? []
        let page = Array(board[min(shown, board.count)..<min(shown + count, board.count)])
        shown += page.count
        return page
    }

    private func rank() async throws -> [FoirAPI.Post] {
        let ids = try await Paging.all { after in
            let page = try await self.foir.fetch(FoirAPI.NearbyPostsQuery(lat: self.center.latitude, lng: self.center.longitude, radius: self.radius, after: .maybe(after))).searchByLocation
            return (page.edges.map(\.node.recordId), page.pageInfo.fragments.more)
        }
        let start = Recency.date(since) ?? .distantPast
        let posts = try await Paging.all(in: Set(ids)) { piece, after in
            let page = try await self.foir.fetch(FoirAPI.PostsWithIdsQuery(ids: .some(piece), after: .maybe(after))).capturePosts
            return (page.edges.map(\.node.fragments.post), page.pageInfo.fragments.more)
        }
        .filter { $0.audience == "public" && isOriginal($0) && Posts.date($0) >= start }

        var likes: [String: Int] = [:]
        for piece in Paging.pieces(Set(posts.compactMap(\.photoKey))) {
            let counted = try await foir.fetch(FoirAPI.CaptureLikesSinceQuery(photoKeys: .some(piece), since: .some(since)))
            for group in counted.captureLikeAggregate.groups {
                if let key = group.key { likes[key] = group.count }
            }
        }
        var perCat: [String: Int] = [:]
        return posts
            .sorted { a, b in
                let la = likes[a.photoKey ?? ""] ?? 0, lb = likes[b.photoKey ?? ""] ?? 0
                return la != lb ? la > lb : Posts.date(a) > Posts.date(b)
            }
            .filter { post in
                let key = post.catKey ?? post._id
                perCat[key, default: 0] += 1
                return perCat[key]! <= self.perCat
            }
    }
}

/// A stored post that a paged list can tell apart from the others.
struct IdentifiedPost: Identifiable {
    let post: FoirAPI.Post
    var id: String { post._id }

    init(_ post: FoirAPI.Post) {
        self.post = post
    }
}
