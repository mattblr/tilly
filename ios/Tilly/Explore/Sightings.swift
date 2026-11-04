import CoreLocation
import MapKit
import Observation

/// Where each cat around a place was last reported: the newest photo of each
/// cat seen there, wherever that newest photo was taken. A cat last seen
/// somewhere else isn't left pinned where it was once caught.
@MainActor @Observable
final class Sightings {
    struct Sighting: Identifiable, Hashable {
        let catId: String
        let name: String
        let coordinate: CLLocationCoordinate2D
        let seenAt: Date
        let thumbnail: URL?
        let photo: URL?
        var id: String { catId }

        var isFresh: Bool { Date.now.timeIntervalSince(seenAt) < Recency.fresh }

        static func == (a: Sighting, b: Sighting) -> Bool { a.catId == b.catId && a.seenAt == b.seenAt }
        func hash(into hasher: inout Hasher) { hasher.combine(catId) }
    }

    private(set) var latest: [Sighting] = []
    private(set) var loaded = false
    private(set) var failure: String?
    /// Counts requests, so a slow answer for a place already left is dropped.
    private var generation = 0

    func load(around center: CLLocationCoordinate2D, radius: CLLocationDistance, foir: Foir, copy: AppConfig) async {
        generation += 1
        let mine = generation
        do {
            let found = try await Self.fetch(around: center, radius: radius, foir: foir, copy: copy)
            guard mine == generation else { return }
            latest = found
            failure = nil
        } catch {
            guard mine == generation else { return }
            failure = UserFailure.key(error)
        }
        loaded = true
    }

    static func fetch(around center: CLLocationCoordinate2D, radius: CLLocationDistance, foir: Foir, copy: AppConfig) async throws -> [Sighting] {
        // Every cat tagged in reach, however many pages that is.
        let tagged = try await Paging.all { after in
            let page = try await foir.fetch(FoirAPI.NearbyTaggedCatsQuery(lat: center.latitude, lng: center.longitude, radius: radius, after: .maybe(after))).searchByLocation
            return (page.edges.map(\.node), page.pageInfo.fragments.more)
        }
        let keys = Set(tagged.compactMap { $0.content?["catKey"]?.string })
        return try await latest(of: keys, foir: foir, copy: copy).values.sorted { $0.seenAt > $1.seenAt }
    }

    /// Each cat's newest photo: newest first, reading on only until every
    /// cat in the piece has one.
    static func latest(of keys: some Collection<String>, foir: Foir, copy: AppConfig) async throws -> [String: Sighting] {
        let blocked = try await foir.blockedAccounts()
        var newest: [String: Sighting] = [:]
        for piece in Paging.pieces(keys) {
            var missing = Set(piece), after: String?
            var seen = Set<String>()
            repeat {
                let page = try await foir.fetch(FoirAPI.LatestTaggedSightingsQuery(catKeys: .some(piece), after: .maybe(after))).captureCatTags
                for edge in page.edges {
                    let tag = edge.node
                    guard let key = tag.catKey, missing.contains(key), let capture = tag.capture?.fragments.canonicalMedia,
                          capture.state == "ready", capture.tagRevision == tag.revision, capture._ownerId == tag._ownerId,
                          !blocked.contains(capture._ownerId ?? ""),
                          let lat = capture.area?.lat, let lng = capture.area?.lng, let at = Recency.date(capture._createdAt) else { continue }
                    missing.remove(key)
                    let photo = capture.photo?.fragments.photoThumb
                    newest[key] = Sighting(catId: key, name: tag.cat?.name ?? copy.t("cat.unnamed"), coordinate: CLLocationCoordinate2D(latitude: lat, longitude: lng), seenAt: at, thumbnail: photo?.thumbnailURL, photo: photo?.mediumURL)
                }
                if page.pageInfo.hasNextPage && page.pageInfo.endCursor == nil { throw PaginationFailure.missingCursor }
                after = page.pageInfo.fragments.more.next
                if let after, !seen.insert(after).inserted { throw PaginationFailure.repeatedCursor }
            } while after != nil && !missing.isEmpty
        }
        return newest
    }
}

/// The name of the neighbourhood around a point, for "Around Islington".
/// Looked up once per point: every area is already rounded to about 110 m.
///
/// CLGeocoder is deprecated in iOS 26, but MapKit's replacement names only
/// the city and region: it would turn every "Around Hackney" into "Around
/// London". It stays until MapKit names neighbourhoods.
@MainActor
enum AreaNames {
    private static var known: [String: String] = [:]

    /// A wide view names the region or country instead of the street's area.
    static func name(of coordinate: CLLocationCoordinate2D, wide: Bool = false) async -> String? {
        let key = String(format: "%.3f,%.3f,%d", coordinate.latitude, coordinate.longitude, wide ? 1 : 0)
        if let name = known[key] { return name }
        let place = try? await CLGeocoder().reverseGeocodeLocation(CLLocation(latitude: coordinate.latitude, longitude: coordinate.longitude)).first
        let name = wide ? (place?.administrativeArea ?? place?.country) : (place?.subLocality ?? place?.locality)
        if let name { known[key] = name }
        return name
    }
}
