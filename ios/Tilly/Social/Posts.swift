import CoreLocation
import Foundation

/// One shared capture as the feed shows it. A reshare keeps the original's
/// author and photo in front, and carries the resharer and their comment.
struct FeedPost: Identifiable, Hashable {
    let id: String
    /// The post the reshare button reshares: the original, never a reshare of it.
    let originalId: String
    let authorId: String
    let resharerId: String?
    let comment: String?
    let catId: String
    let catName: String
    let photoKey: String
    let photo: URL?
    /// When the post went up: the catch's time, or the reshare's.
    let postedAt: Date
    /// When the cat was caught, which a reshare shows as the original's.
    let caughtAt: Date
    /// What the catcher said about it: the post's caption, or else their
    /// field note from the catch.
    let note: String?
    let coordinate: CLLocationCoordinate2D?
    let isPublic: Bool
    var cats: [TaggedCaptures.Cat] = []
    var captureRevision: String? = nil
    var highlightKeys = Set<String>()
    var highlightCatalog: [PostHighlight]? = nil

    static func == (a: FeedPost, b: FeedPost) -> Bool { a.id == b.id }
    func hash(into hasher: inout Hasher) { hasher.combine(id) }
}

/// Turns posts as Fóir stores them into the feed's posts: the originals
/// reshares point at, their photos, and their people's names.
enum Posts {
    @MainActor
    static func build(_ stored: [FoirAPI.Post], foir: Foir, circle: SocialCircle) async -> [FeedPost] {
        let stored = stored.filter { circle.allows($0._ownerId) }
        guard !stored.isEmpty else { return [] }
        let reshared = Set(stored.compactMap(\.reshareOf))
        var originals: [String: FoirAPI.Post] = [:]
        let found = try? await Paging.all(in: reshared) { piece, after in
            let page = try await foir.fetch(FoirAPI.PostsWithIdsQuery(ids: .some(piece), after: .maybe(after))).capturePosts
            return (page.edges.map(\.node.fragments.post), page.pageInfo.fragments.more)
        }
        for post in found ?? [] { originals[post._id] = post }

        var photos: [String: URL] = [:]
        let canonical = (try? await TaggedCaptures.media(Set(stored.compactMap(\.photoKey)), foir: foir)) ?? [:]
        let associations = (try? await TaggedCaptures.cats(Array(canonical.keys), media: canonical, foir: foir)) ?? [:]
        for (id, capture) in canonical {
            if let url = capture.photo?.fragments.photoThumb.mediumURL { photos[id] = url }
        }
        let highlights = (try? await foir.captureHighlightKeys(Array(canonical.keys))) ?? [:]
        let highlightCatalog = try? await foir.postHighlightCatalog()

        // The catcher's own notes at each capture.
        var notes: [String: String] = [:]
        let written = try? await Paging.all(in: Set(stored.compactMap(\.photoKey))) { piece, after in
            let page = try await foir.fetch(FoirAPI.NotesForCapturesQuery(photoKeys: .some(piece), after: .maybe(after))).fieldNotes
            return (page.edges.map(\.node), page.pageInfo.fragments.more)
        }
        let authors = Dictionary((stored + Array(originals.values)).compactMap { post in post.photoKey.flatMap { key in post._ownerId.map { (key, $0) } } }, uniquingKeysWith: { first, _ in first })
        for note in written ?? [] {
            guard let key = note.photoKey, note._ownerId == authors[key] else { continue }
            let words = CatBiographyView.words(tags: note.tags?.array?.compactMap(\.string) ?? [], text: note.text)
            if !words.isEmpty { notes[key] = words }
        }

        let people = stored.compactMap(\._ownerId) + originals.values.compactMap(\._ownerId)
        await circle.load(profilesOf: people)

        return stored.compactMap { post -> FeedPost? in
            guard let owner = post._ownerId, let catKey = post.catKey, let photoKey = post.photoKey else { return nil }
            if photos[photoKey] == nil { return nil }
            let original = post.reshareOf.flatMap { originals[$0] }
            guard circle.allows(original?._ownerId ?? owner, repostedBy: original == nil ? nil : owner) else { return nil }
            // A readable repost never proves its author took an unavailable
            // original. Do not invent attribution while hydrating canonical media.
            if post.reshareOf != nil && original == nil { return nil }
            let shown = original ?? post
            return FeedPost(
                id: post._id,
                originalId: shown._id,
                authorId: shown._ownerId ?? owner,
                resharerId: original == nil ? nil : owner,
                comment: original == nil ? nil : post.comment,
                catId: catKey,
                catName: post.cat?.name ?? circle.copy.t("cat.unnamed"),
                photoKey: photoKey,
                photo: photos[photoKey],
                postedAt: Posts.date(post),
                caughtAt: Posts.date(shown),
                note: shown.note.flatMap { $0.isEmpty ? nil : $0 } ?? notes[photoKey],
                coordinate: shown.area.flatMap { area in
                    guard let lat = area.lat, let lng = area.lng else { return nil }
                    return CLLocationCoordinate2D(latitude: lat, longitude: lng)
                },
                isPublic: shown.audience == "public",
                cats: associations[photoKey] ?? [],
                captureRevision: canonical[photoKey]?.tagRevision,
                highlightKeys: highlights[photoKey] ?? [],
                highlightCatalog: highlightCatalog
            )
        }
    }

    /// When a post stands for, for putting posts in order: the catch, or the
    /// reshare. A post from before posts had a time falls back to its making.
    static func date(_ post: FoirAPI.Post) -> Date {
        Recency.date(post.postedAt) ?? Recency.date(post._createdAt) ?? .distantPast
    }
}
