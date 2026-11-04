import Foundation

@MainActor
enum TaggedCaptures {
    // Fóir gap (docs/known-gaps.md, "Nested capture predicate"): a nested
    // ready-state filter missed a readable tag. Here: read the tags and check
    // each parent's state, revision and owner directly. Closes when the
    // nested filter is fixed.
    struct Cat: Identifiable, Hashable {
        let id: String
        let name: String
    }
    static func media(_ keys: some Collection<String>, foir: Foir) async throws -> [String: FoirAPI.CanonicalMedia] {
        let rows = try await Paging.all(in: Set(keys)) { piece, after in
            let page = try await foir.fetch(FoirAPI.CanonicalPhotosQuery(keys: .some(piece), after: .maybe(after))).capturePhotos
            return (page.edges.map(\.node.fragments.canonicalMedia), page.pageInfo.fragments.more)
        }
        return Dictionary(rows.map { ($0._id, $0) }, uniquingKeysWith: { first, _ in first })
    }

    static func cats(_ keys: some Collection<String>, media: [String: FoirAPI.CanonicalMedia], foir: Foir) async throws -> [String: [Cat]] {
        let rows = try await Paging.all(in: Set(keys)) { piece, after in
            let page = try await foir.fetch(FoirAPI.CaptureTagsQuery(keys: .some(piece), after: .maybe(after))).captureCatTags
            return (page.edges.map(\.node), page.pageInfo.fragments.more)
        }
        var result: [String: [Cat]] = [:]
        for row in rows {
            guard let key = row.photoKey, let parent = media[key], parent.state == "ready", parent.tagRevision == row.revision,
                  parent._ownerId == row._ownerId, let cat = row.cat else { continue }
            result[key, default: []].append(Cat(id: cat._id, name: cat.name ?? "Cat"))
        }
        return result
    }

    /// A page of a cat's gallery, leaving out photos by blocked accounts.
    static func gallery(_ page: FoirAPI.TaggedCatGalleryQuery.Data.CaptureCatTags, blocked: Set<String>) -> [GalleryPhoto] {
        page.edges.compactMap { edge in
            guard let capture = edge.node.capture?.fragments.canonicalMedia, capture.state == "ready",
                  capture.tagRevision == edge.node.revision, capture._ownerId == edge.node._ownerId,
                  let owner = capture._ownerId, !blocked.contains(owner) else { return nil }
            return GalleryPhoto(capture.photo?.fragments.photoThumb, id: capture._id, at: capture._createdAt)
        }
    }

    static func count(catId: String, mine: Bool = false, foir: Foir) async throws -> Int {
        if mine {
            let rows = try await Paging.all { after in
                let page = try await foir.fetch(FoirAPI.MyTaggedEncountersQuery(catKey: .some(catId), after: .maybe(after))).myCaptureCatTags
                return (page.edges.map(\.node), page.pageInfo.fragments.more)
            }
            return Set(rows.compactMap { row -> String? in
                guard let parent = row.capture, parent.state == "ready", parent.tagRevision == row.revision,
                      parent._ownerId == row._ownerId else { return nil }
                return parent._id
            }).count
        }
        let rows = try await Paging.all { after in
            let page = try await foir.fetch(FoirAPI.TaggedCatGalleryQuery(catKey: .some(catId), after: .maybe(after))).captureCatTags
            return (page.edges.map(\.node), page.pageInfo.fragments.more)
        }
        return Set(rows.compactMap { row -> String? in
            guard let parent = row.capture?.fragments.canonicalMedia, parent.state == "ready", parent.tagRevision == row.revision,
                  parent._ownerId == row._ownerId else { return nil }
            return parent._id
        }).count
    }
}
