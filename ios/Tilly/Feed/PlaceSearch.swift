import MapKit
import Observation
import SwiftUI

/// A place chosen to browse from afar. It centres a search; it is never a
/// cat's position, and never the user's.
struct Destination: Hashable {
    let name: String
    let center: CLLocationCoordinate2D
    /// How far around the centre the search reaches, in metres.
    let radius: CLLocationDistance

    static func == (a: Destination, b: Destination) -> Bool { a.name == b.name }
    func hash(into hasher: inout Hasher) { hasher.combine(name) }
}

/// Native place suggestions for an address, city, postcode or ZIP code.
@MainActor @Observable
final class PlaceSearch: NSObject, MKLocalSearchCompleterDelegate {
    private(set) var results: [MKLocalSearchCompletion] = []
    var query = "" {
        didSet { completer.queryFragment = query }
    }

    private let completer = MKLocalSearchCompleter()

    override init() {
        super.init()
        completer.delegate = self
        completer.resultTypes = [.address, .pointOfInterest]
    }

    nonisolated func completerDidUpdateResults(_ completer: MKLocalSearchCompleter) {
        let found = completer.results
        Task { @MainActor in self.results = found }
    }

    nonisolated func completer(_ completer: MKLocalSearchCompleter, didFailWithError error: any Error) {
        Task { @MainActor in self.results = [] }
    }

    /// Where a suggestion is. A city keeps its own bounds; an address or a
    /// postcode is searched around, so the radius it uses is shown.
    func destination(for completion: MKLocalSearchCompletion) async -> Destination? {
        let request = MKLocalSearch.Request(completion: completion)
        guard let response = try? await MKLocalSearch(request: request).start(), let item = response.mapItems.first else { return nil }
        let span = response.boundingRegion.span
        let radius = min(max(span.latitudeDelta * 111_000 / 2, 1500), 20_000)
        let name = [completion.title, completion.subtitle].filter { !$0.isEmpty }.joined(separator: ", ")
        return Destination(name: name, center: item.location.coordinate, radius: radius)
    }
}

/// The travel sheet: search a place, choose it, browse its cats.
struct TravelSheet: View {
    @Environment(AppModel.self) private var model
    let chosen: (Destination) -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var search = PlaceSearch()
    @State private var resolving = false

    var body: some View {
        NavigationStack {
            List {
                Section {
                    TextField(model.config.t("feed.travelSearch"), text: $search.query)
                        .textInputAutocapitalization(.words)
                        .autocorrectionDisabled()
                } footer: {
                    Text(model.config.t("feed.travelPrivacy"))
                }
                Section {
                    ForEach(search.results, id: \.self) { result in
                        Button {
                            resolving = true
                            Task {
                                if let destination = await search.destination(for: result) {
                                    chosen(destination)
                                    dismiss()
                                }
                                resolving = false
                            }
                        } label: {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(result.title).foregroundStyle(Theme.ink)
                                if !result.subtitle.isEmpty {
                                    Text(result.subtitle).font(.meta).foregroundStyle(Theme.muted)
                                }
                            }
                        }
                        .disabled(resolving)
                    }
                }
            }
            .navigationTitle(model.config.t("feed.travelling"))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button(model.config.t("common.cancel")) { dismiss() } }
            }
        }
    }
}
