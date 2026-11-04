import CoreLocation
import MapKit
import Observation

/// Cats by area, for a map zoomed out past the street. Each cat belongs to the
/// geohash cell where it was first caught; save_catch stores the cells,
/// because Fóir has no clustering of map points. An area with many cats shows
/// as a count; an area with a few shows each cat, where it was last seen.
@MainActor @Observable
final class AreaCells {
    struct Cell: Identifiable {
        let hash: String
        let precision: Int
        let count: Int
        let center: CLLocationCoordinate2D
        /// The cell's own box, for when its cats can't be read.
        let region: MKCoordinateRegion
        var id: String { hash }
    }

    /// Areas with enough cats to show as a count.
    private(set) var clusters: [Cell] = []
    /// The cats of the sparser areas, one by one.
    private(set) var items: [Sightings.Sighting] = []
    private(set) var loaded = false
    private var generation = 0

    /// The height of a geohash cell, in degrees of latitude, by length.
    private static let cellHeight: [CLLocationDegrees] = [45, 5.625, 1.40625, 0.17578, 0.04394, 0.00549]

    /// The cell length that puts a few cells across the map's height: whole
    /// continents far out, about half a kilometre near street level.
    static func precision(forLatitudeSpan span: CLLocationDegrees) -> Int {
        (cellHeight.firstIndex { $0 <= span / 3 } ?? cellHeight.count - 1) + 1
    }

    func load(_ region: MKCoordinateRegion, clusterAt: Int, foir: Foir, copy: AppConfig) async {
        generation += 1
        let mine = generation
        let precision = Self.precision(forLatitudeSpan: region.span.latitudeDelta)
        // Narrowed to the coarser cells the map covers, so the counts are only
        // the ones on screen. Cell 1 is the whole world in 32 counts.
        let within = precision > 1 ? Geohash.cells(covering: region, precision: precision - 1) : []
        var counts: [String: Int] = [:]
        // Each parent has 32 children: eight parents yield at most 256 groups,
        // below the aggregate limit of 500. Aggregates have no cursor.
        let pieces: [[String]?] = within.isEmpty ? [nil] : Paging.pieces(within, of: 8).map { $0 }
        for piece in pieces {
            let filter = piece.map { Self.filter(cells: $0, precision: precision - 1) }
            guard let found = try? await foir.fetch(FoirAPI.CatCellsQuery(where: .maybe(filter), groupBy: .case(Self.field(precision)))) else { continue }
            for group in found.catAggregate.groups {
                if let key = group.key { counts[key, default: 0] += group.count }
            }
        }
        let cells = counts.map { Self.cell($0.key, precision: precision, count: $0.value) }
        let sparse = cells.filter { $0.count < clusterAt }.map(\.hash)
        let shown = (try? await Self.cats(in: sparse, precision: precision, foir: foir, copy: copy)) ?? []
        guard mine == generation else { return }
        clusters = cells.filter { $0.count >= clusterAt }
        items = shown
        loaded = true
    }

    /// Where every cat in an area was last seen, for zooming to fit them.
    func members(of cell: Cell, foir: Foir, copy: AppConfig) async -> [Sightings.Sighting] {
        (try? await Self.cats(in: [cell.hash], precision: cell.precision, foir: foir, copy: copy)) ?? []
    }

    func clear() {
        generation += 1
        clusters = []
        items = []
    }

    /// The cats whose home is in these cells, each at its latest sighting.
    private static func cats(in hashes: [String], precision: Int, foir: Foir, copy: AppConfig) async throws -> [Sightings.Sighting] {
        guard !hashes.isEmpty else { return [] }
        let ids = try await Paging.all(in: hashes) { piece, after in
            let page = try await foir.fetch(FoirAPI.CatsInCellsQuery(where: .some(filter(cells: piece, precision: precision)), after: .maybe(after))).cats
            return (page.edges.map(\.node._id), page.pageInfo.fragments.more)
        }
        return try await Sightings.latest(of: ids, foir: foir, copy: copy).values.sorted { $0.seenAt > $1.seenAt }
    }

    private static func field(_ precision: Int) -> FoirAPI.CatAggregatableField {
        [.cell1, .cell2, .cell3, .cell4, .cell5, .cell6][precision - 1]
    }

    private static func filter(cells: [String], precision: Int) -> FoirAPI.CatWhereInput {
        let text = FoirAPI.TextWhereInput(in: .some(cells))
        switch precision {
        case 1: return FoirAPI.CatWhereInput(cell1: .some(text))
        case 2: return FoirAPI.CatWhereInput(cell2: .some(text))
        case 3: return FoirAPI.CatWhereInput(cell3: .some(text))
        case 4: return FoirAPI.CatWhereInput(cell4: .some(text))
        case 5: return FoirAPI.CatWhereInput(cell5: .some(text))
        default: return FoirAPI.CatWhereInput(cell6: .some(text))
        }
    }

    private static func cell(_ hash: String, precision: Int, count: Int) -> Cell {
        let box = Geohash.bounds(of: hash)
        let center = CLLocationCoordinate2D(latitude: (box.minLat + box.maxLat) / 2, longitude: (box.minLng + box.maxLng) / 2)
        return Cell(
            hash: hash,
            precision: precision,
            count: count,
            center: center,
            region: MKCoordinateRegion(center: center, span: MKCoordinateSpan(latitudeDelta: (box.maxLat - box.minLat) * 1.2, longitudeDelta: (box.maxLng - box.minLng) * 1.2))
        )
    }
}

extension MKCoordinateRegion {
    /// The smallest region that shows every one of these points, with room
    /// around the edge for their markers.
    static func fitting(_ points: [CLLocationCoordinate2D]) -> MKCoordinateRegion? {
        guard let first = points.first else { return nil }
        var (minLat, maxLat, minLng, maxLng) = (first.latitude, first.latitude, first.longitude, first.longitude)
        for point in points {
            minLat = min(minLat, point.latitude)
            maxLat = max(maxLat, point.latitude)
            minLng = min(minLng, point.longitude)
            maxLng = max(maxLng, point.longitude)
        }
        // At least about 600 m across, so one cat isn't zoomed to a doorstep.
        return MKCoordinateRegion(
            center: CLLocationCoordinate2D(latitude: (minLat + maxLat) / 2, longitude: (minLng + maxLng) / 2),
            span: MKCoordinateSpan(latitudeDelta: max((maxLat - minLat) * 1.5, 0.006), longitudeDelta: max((maxLng - minLng) * 1.5, 0.006))
        )
    }
}

/// Geohash cells, as save_catch writes them.
enum Geohash {
    private static let base32 = Array("0123456789bcdefghjkmnpqrstuvwxyz")

    static func encode(_ coordinate: CLLocationCoordinate2D, precision: Int) -> String {
        var lat = (-90.0, 90.0), lng = (-180.0, 180.0)
        var hash = "", bits = 0, value = 0, even = true
        while hash.count < precision {
            if even {
                let mid = (lng.0 + lng.1) / 2
                if coordinate.longitude >= mid { value = value * 2 + 1; lng.0 = mid } else { value *= 2; lng.1 = mid }
            } else {
                let mid = (lat.0 + lat.1) / 2
                if coordinate.latitude >= mid { value = value * 2 + 1; lat.0 = mid } else { value *= 2; lat.1 = mid }
            }
            even.toggle()
            bits += 1
            if bits == 5 {
                hash.append(base32[value])
                bits = 0
                value = 0
            }
        }
        return hash
    }

    static func bounds(of hash: String) -> (minLat: Double, maxLat: Double, minLng: Double, maxLng: Double) {
        var lat = (-90.0, 90.0), lng = (-180.0, 180.0)
        var even = true
        for character in hash {
            guard let value = base32.firstIndex(of: character) else { break }
            for bit in (0..<5).reversed() {
                let on = (value >> bit) & 1 == 1
                if even {
                    let mid = (lng.0 + lng.1) / 2
                    if on { lng.0 = mid } else { lng.1 = mid }
                } else {
                    let mid = (lat.0 + lat.1) / 2
                    if on { lat.0 = mid } else { lat.1 = mid }
                }
                even.toggle()
            }
        }
        return (lat.0, lat.1, lng.0, lng.1)
    }

    /// Every cell of this length the region touches.
    static func cells(covering region: MKCoordinateRegion, precision: Int) -> [String] {
        let sample = bounds(of: encode(region.center, precision: precision))
        let (cellLat, cellLng) = (sample.maxLat - sample.minLat, sample.maxLng - sample.minLng)
        let minLat = max(region.center.latitude - region.span.latitudeDelta / 2, -89.999)
        let maxLat = min(region.center.latitude + region.span.latitudeDelta / 2, 89.999)
        let minLng = region.center.longitude - region.span.longitudeDelta / 2
        let maxLng = region.center.longitude + region.span.longitudeDelta / 2
        var found = Set<String>()
        // Half a cell apart, so no cell between two samples is missed.
        var lat = minLat
        while lat <= maxLat + cellLat / 2 {
            var lng = minLng
            while lng <= maxLng + cellLng / 2 {
                let wrapped = ((min(lng, maxLng) + 180).truncatingRemainder(dividingBy: 360) + 360).truncatingRemainder(dividingBy: 360) - 180
                found.insert(encode(CLLocationCoordinate2D(latitude: min(lat, maxLat), longitude: wrapped), precision: precision))
                lng += cellLng / 2
            }
            lat += cellLat / 2
        }
        return found.sorted()
    }
}
