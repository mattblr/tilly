import Foundation
import Observation

/// Likes are on captures: one photo, from one catch. A cat's likes are its
/// captures' likes added up. Every screen shares one count per capture and
/// one total per cat, so a heart tapped in the feed shows on the cat's page.
@MainActor @Observable
final class Likes {
    /// Likes per capture, by photo key.
    private(set) var counts: [String: Int] = [:]
    /// The captures the user likes.
    private(set) var mine: Set<String> = []
    /// Likes per cat, across all its captures.
    private(set) var totals: [String: Int] = [:]
    private(set) var failure: String?

    private var photoCats: [String: Set<String>] = [:]
    private let foir: Foir

    init(foir: Foir) {
        self.foir = foir
    }

    func count(capture photoKey: String) -> Int { counts[photoKey] ?? 0 }
    func likes(capture photoKey: String) -> Bool { mine.contains(photoKey) }
    func total(cat catId: String) -> Int { totals[catId] ?? 0 }

    /// Reads the likes of these captures, and the totals of these cats.
    func load(captures photoKeys: some Sequence<String>, cats catIds: some Sequence<String> = [String](), me: String?) async {
        let captures = Array(Set(photoKeys))
        let cats = Array(Set(catIds))
        // Up to 100 a request, so no request has more groups than it answers.
        for piece in Paging.pieces(captures) {
            guard let found = try? await foir.fetch(FoirAPI.CaptureLikeCountsQuery(photoKeys: .some(piece))) else { continue }
            for key in piece { counts[key] = 0 }
            for group in found.captureLikeAggregate.groups {
                if let key = group.key { counts[key] = group.count }
            }
        }
        await loadTaggedTotals(cats)
        guard let me, !captures.isEmpty else { return }
        let liked = try? await Paging.all(in: captures) { piece, after in
            let page = try await self.foir.fetch(FoirAPI.MyCaptureLikesQuery(photoKeys: .some(piece), me: .some(me), after: .maybe(after))).captureLikes
            return (page.edges.compactMap(\.node.photoKey), page.pageInfo.fragments.more)
        }
        guard let liked else { return }
        mine.subtract(captures)
        mine.formUnion(liked)
    }

    /// Likes or unlikes a capture, showing the change at once and undoing it
    /// if the platform refuses.
    func toggle(capture photoKey: String, cat catId: String) async {
        await set(photoKey, cat: catId, liked: !likes(capture: photoKey))
    }

    /// Likes a capture, as a double tap on its photo does: never an unlike.
    func like(capture photoKey: String, cat catId: String) async {
        guard !likes(capture: photoKey) else { return }
        await set(photoKey, cat: catId, liked: true)
    }

    private func set(_ photoKey: String, cat catId: String, liked: Bool) async {
        apply(photoKey, cat: catId, liked: liked)
        do {
            let now = try await foir.setLike(photoKey: photoKey, liked: liked)
            if now != liked { apply(photoKey, cat: catId, liked: now) }
            failure = nil
        } catch {
            apply(photoKey, cat: catId, liked: !liked)
            failure = UserFailure.key(error)
        }
    }

    private func apply(_ photoKey: String, cat catId: String, liked: Bool) {
        guard liked != likes(capture: photoKey) else { return }
        if liked { mine.insert(photoKey) } else { mine.remove(photoKey) }
        let step = liked ? 1 : -1
        counts[photoKey] = max(0, count(capture: photoKey) + step)
        for cat in photoCats[photoKey] ?? [catId] { totals[cat] = max(0, total(cat: cat) + step) }
    }

    /// Likes retain one canonical photo key. A corrected association changes
    /// which cat receives the total, without copying or rewriting any likes.
    private func loadTaggedTotals(_ cats: [String]) async {
        do {
            let tagged = try await Paging.all(in: cats) { piece, after in
                let page = try await self.foir.fetch(FoirAPI.TaggedCatCaptureKeysQuery(catKeys: .some(piece), after: .maybe(after))).captureCatTags
                return (page.edges.map(\.node), page.pageInfo.fragments.more)
            }
            var keys: [String: Set<String>] = [:]
            for tag in tagged {
                guard let cat = tag.catKey, let capture = tag.capture, capture.state == "ready", capture.tagRevision == tag.revision, capture._ownerId == tag._ownerId else { continue }
                keys[cat, default: []].insert(capture._id)
            }
            let all = keys.values.reduce(into: Set<String>()) { $0.formUnion($1) }
            var found: [String: Int] = [:]
            for piece in Paging.pieces(all) {
                let aggregate = try await foir.fetch(FoirAPI.CaptureLikeCountsQuery(photoKeys: .some(piece))).captureLikeAggregate
                guard !aggregate.truncated else { throw FoirError(message: "The like totals are incomplete. Try again.", code: nil) }
                for group in aggregate.groups { if let key = group.key { found[key] = group.count } }
            }
            for cat in cats {
                for key in Array(photoCats.keys) { photoCats[key]?.remove(cat) }
                totals[cat] = keys[cat, default: []].reduce(0) { $0 + (found[$1] ?? 0) }
                for key in keys[cat, default: []] { photoCats[key, default: []].insert(cat) }
            }
            failure = nil
        } catch { failure = UserFailure.key(error) }
    }

    func forget() {
        mine = []
    }
}
