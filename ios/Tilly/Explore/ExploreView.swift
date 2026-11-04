import MapKit
import PhosphorSwift
import SwiftUI

/// Where cats were last reported. Every point is a neighbourhood, rounded to
/// about 110 m, and every time is the report's, never a live position. Zoomed
/// out past the street, an area with many cats shows as a count, and one with
/// a few shows each of them.
struct ExploreView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.scenePhase) private var scenePhase
    @State private var sightings = Sightings()
    @State private var areas = AreaCells()
    @State private var position: MapCameraPosition = .userLocation(fallback: .automatic)
    @State private var region: MKCoordinateRegion?
    @State private var selectedId: String?
    @State private var placeName: String?
    @State private var wide = false
    @State private var centred = false
    @State private var path: [Route] = []

    enum Route: Hashable {
        case cat(String)
        case person(String)
    }

    /// Where the map opens when the user's location can't be had.
    static let london = MKCoordinateRegion(
        center: CLLocationCoordinate2D(latitude: 51.5072, longitude: -0.1276),
        latitudinalMeters: 1600,
        longitudinalMeters: 1600
    )

    /// The widest view, as half its height in metres, that shows every cat
    /// one by one. Past it, the map counts the busy areas.
    static let streetRadius: CLLocationDistance = 1500

    private var shown: [Sightings.Sighting] { wide ? areas.items : sightings.latest }

    private var selected: Sightings.Sighting? {
        shown.first { $0.catId == selectedId }
    }

    var body: some View {
        NavigationStack(path: $path) {
            map
                .ignoresSafeArea(edges: .top)
                .overlay(alignment: .topLeading) {
                    HStack(alignment: .top) {
                        heading
                        Spacer()
                        Button {
                            centred = false
                            Task { await centreOnPerson() }
                        } label: {
                            Image(systemName: "location")
                                .frame(width: 44, height: 44)
                                .background(.regularMaterial, in: Circle())
                        }
                        .buttonStyle(.plain)
                        .foregroundStyle(Theme.signal)
                        .accessibilityLabel(model.config.t("explore.myLocation"))
                        .padding(13)
                    }
                    .padding(.top, 52)
                }
                .overlay(alignment: .bottom) {
                    if let selected {
                        SightingPanel(sighting: selected, open: { path.append(.cat($0)) }, dismiss: { selectedId = nil })
                            .id(selected.catId)
                            .transition(.move(edge: .bottom).combined(with: .opacity))
                    }
                }
                .animation(.snappy, value: selectedId)
                .tillyHeader(model.config.t("navigation.map"))
                .navigationDestination(for: Route.self) { route in
                    switch route {
                    case .cat(let catId): CatBiographyView(catId: catId)
                    case .person(let userId): PersonView(userId: userId)
                    }
                }
        }
        .task(id: LocationRefresh(active: scenePhase == .active, revision: model.location.revision)) {
            guard scenePhase == .active else { return }
            if !model.location.isAuthorized { centred = false }
            await centreOnPerson()
        }
        // Back on the map, or a catch just saved: what it shows may be old.
        .onChange(of: model.tab) { if model.tab == .explore { Task { await refresh() } } }
        .onChange(of: model.catchesSaved) { Task { await refresh() } }
        // The avatar opens the user's own page over the map.
        .onChange(of: model.profileRequests) {
            guard model.tab == .explore, let me = model.account?.userId, path.last != .person(me) else { return }
            path.append(.person(me))
        }
        .onChange(of: model.homeRequests) {
            path = []
            selectedId = nil
            centred = false
            Task { await centreOnPerson() }
        }
    }

    private struct LocationRefresh: Hashable {
        let active: Bool
        let revision: Int
    }

    /// Opens on the user: asks for their location the first time, and
    /// falls back to London only when it can't be had.
    private func centreOnPerson() async {
        guard !centred else { return }
        let here = try? await Location.current()
        guard !Task.isCancelled else { return }
        // A denied or cancelled first lookup must not prevent centering after access is enabled.
        centred = here != nil
        withAnimation(.snappy) {
            position = .region(here.map { MKCoordinateRegion(center: $0, latitudinalMeters: 1600, longitudinalMeters: 1600) } ?? Self.london)
        }
    }

    /// Tapping a cat selects it; tapping the map anywhere else puts it away.
    ///
    /// MapKit draws each annotation in its own hosting view, which doesn't
    /// always inherit the app's environment: reading `AppModel` there crashes.
    /// Annotation content takes its words as plain values instead.
    private var map: some View {
        let copy = model.config
        return Map(position: $position, selection: $selectedId) {
            UserAnnotation()
            if wide {
                ForEach(areas.clusters) { cell in
                    Annotation("", coordinate: cell.center, anchor: .center) {
                        AreaCount(
                            count: cell.count,
                            unit: copy.t(cell.count == 1 ? "explore.cat.one" : "explore.cat.other"),
                            label: copy.t(cell.count == 1 ? "explore.areaLabel.one" : "explore.areaLabel.other", ["count": "\(cell.count)"]),
                            hint: copy.t("explore.zoomIn")
                        ) { Task { await open(cell) } }
                    }
                    .annotationTitles(.hidden)
                }
            }
            ForEach(shown) { sighting in
                Annotation(sighting.name, coordinate: sighting.coordinate, anchor: .center) {
                    SightingMarker(
                        sighting: sighting,
                        caption: "\(sighting.name) · \(Recency.short(since: sighting.seenAt, copy: copy))",
                        isSelected: sighting.catId == selectedId
                    )
                    .accessibilityLabel(copy.t("explore.sightingLabel", ["name": sighting.name, "when": Recency.long(since: sighting.seenAt, copy: copy)]))
                }
                .annotationTitles(.hidden)
                .tag(sighting.catId)
            }
        }
        .scrollEdgeEffectHidden(true, for: .top)
        .mapStyle(.standard(pointsOfInterest: .excludingAll))
        .mapControls {}
        .sensoryFeedback(.selection, trigger: selectedId) { _, now in now != nil }
        .onMapCameraChange(frequency: .onEnd) { context in
            region = context.region
            Task { await refresh() }
        }
    }

    /// Reads what the map's region holds: every cat at street level, or the
    /// busy areas' counts and the quiet areas' cats further out.
    private func refresh() async {
        guard let region else { return }
        // Half the map's height, in metres.
        let radius = region.span.latitudeDelta * 111_000 / 2
        let isWide = radius > Self.streetRadius
        if isWide != wide {
            selectedId = nil
            withAnimation(.snappy) { wide = isWide }
        }
        if isWide {
            await areas.load(region, clusterAt: model.config.settings.clusterAt, foir: model.foir, copy: model.config)
        } else {
            areas.clear()
            await sightings.load(around: region.center, radius: max(radius, 300), foir: model.foir, copy: model.config)
        }
        placeName = await AreaNames.name(of: region.center, wide: radius > 20_000)
    }

    /// Zooms to fit every cat an area holds, where each was last seen.
    private func open(_ cell: AreaCells.Cell) async {
        let members = await areas.members(of: cell, foir: model.foir, copy: model.config)
        withAnimation(.snappy) {
            position = .region(MKCoordinateRegion.fitting(members.map(\.coordinate)) ?? cell.region)
        }
    }

    private var heading: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(placeName ?? model.config.t("explore.nearby")).font(.system(size: 17, weight: .semibold))
            Text(subheading)
                .font(.system(size: 12))
                .foregroundStyle(Theme.muted)
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 14))
        .padding(13)
    }

    private var subheading: String {
        let t = model.config
        if wide {
            let total = areas.clusters.map(\.count).reduce(0, +) + areas.items.count
            return areas.loaded && total == 0 ? t.t("explore.countedNone") : t.t("explore.counted", count: total)
        }
        return sightings.loaded && sightings.latest.isEmpty ? t.t("explore.none") : t.t("explore.latest")
    }
}

/// How many cats were caught in one area, drawn bigger for more.
private struct AreaCount: View {
    let count: Int
    let unit: String
    let label: String
    let hint: String
    let open: () -> Void

    var body: some View {
        let size = min(44 + log2(Double(count)) * 8, 84)
        Button(action: open) {
            VStack(spacing: 0) {
                Text("\(count)").font(.system(size: 17, weight: .bold)).monospacedDigit()
                Text(unit).font(.system(size: 10, weight: .medium))
            }
            .foregroundStyle(Theme.onSignal)
            .frame(width: size, height: size)
            .background(Theme.signal, in: Circle())
            .overlay(Circle().stroke(Theme.raised, lineWidth: 3))
            .shadow(color: .black.opacity(0.2), radius: 6, y: 2)
        }
        .buttonStyle(.plain)
        .accessibilityLabel(label)
        .accessibilityHint(hint)
    }
}

/// A cat on the map: its photo, and how long ago it was reported. Older
/// reports are drawn quieter.
private struct SightingMarker: View {
    let sighting: Sightings.Sighting
    let caption: String
    let isSelected: Bool

    var body: some View {
        VStack(spacing: 3) {
            CatPhoto(url: sighting.thumbnail)
                .frame(width: 45, height: 45)
                .clipShape(Circle())
                .overlay(Circle().stroke(Theme.raised, lineWidth: 3))
                .padding(9)
                .background(Circle().fill(Theme.signal.opacity(isSelected ? 0.22 : 0.11)))
                .overlay(Circle().stroke(Theme.signal.opacity(isSelected ? 0.6 : 0.31), lineWidth: 1))
                .scaleEffect(isSelected ? 1.12 : 1)
            Text(caption)
                .font(.system(size: 11))
                .foregroundStyle(Theme.ink)
                .padding(.horizontal, 6)
                .padding(.vertical, 1)
                .background(Theme.raised, in: RoundedRectangle(cornerRadius: 6))
        }
        .opacity(sighting.isFresh || isSelected ? 1 : 0.6)
    }
}

/// The cat that was tapped, at the foot of the map. Drag it up, or tap its
/// grabber, for the latest note from the cat's story; drag it down to put it
/// away.
private struct SightingPanel: View {
    let sighting: Sightings.Sighting
    let open: (String) -> Void
    let dismiss: () -> Void

    @Environment(AppModel.self) private var model
    @State private var area: String?
    @State private var expanded = false
    @State private var drag: CGFloat = 0
    @State private var latestNote: (words: String, when: String)?

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Button { withAnimation(.snappy) { expanded.toggle() } } label: {
                Capsule().fill(Theme.rule).frame(width: 34, height: 5).frame(maxWidth: .infinity, minHeight: 24)
            }
            .buttonStyle(.plain)
            .accessibilityLabel(model.config.t(expanded ? "explore.collapse" : "explore.expand"))

            Button { open(sighting.catId) } label: {
                HStack(spacing: 12) {
                    CatPhoto(url: sighting.thumbnail)
                        .frame(width: 70, height: 70)
                        .clipShape(RoundedRectangle(cornerRadius: Theme.photoCorner))
                    VStack(alignment: .leading, spacing: 2) {
                        Text(sighting.name).font(.system(size: 23, weight: .semibold)).kerning(-0.3)
                        Text(model.config.t("explore.panel.lastSpotted", ["when": Recency.long(since: sighting.seenAt, copy: model.config)])).font(.meta).foregroundStyle(Theme.muted)
                        Text(model.config.t("explore.panel.around", ["area": area ?? model.config.t("explore.here")])).font(.meta).foregroundStyle(Theme.muted)
                    }
                    Spacer()
                    Icon(icon: .caretRight).foregroundStyle(Theme.muted)
                }
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)

            if expanded {
                VStack(alignment: .leading, spacing: 4) {
                    Text(latestNote?.words ?? model.config.t("explore.panel.noNotes")).font(.body15)
                    Text(latestNote?.when ?? model.config.t("explore.noNotes")).font(.meta).foregroundStyle(Theme.muted)
                }
                .padding(.top, 12)
                .transition(.opacity)
            }

            HStack(spacing: 9) {
                FollowCatButton(catId: sighting.catId)
                Button(model.config.t("explore.panel.meet", ["name": sighting.name])) { open(sighting.catId) }
                    .buttonStyle(.primary)
            }
            .padding(.top, 14)

            Text(model.config.t("explore.panel.footer"))
                .font(.system(size: 12))
                .foregroundStyle(Theme.muted)
                .padding(.top, 11)
        }
        .padding([.horizontal, .bottom], 20)
        .padding(.top, 4)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Theme.background, in: RoundedRectangle(cornerRadius: 25))
        .padding(.horizontal, 10)
        .padding(.bottom, 8)
        .offset(y: drag)
        .gesture(
            DragGesture(minimumDistance: 8)
                .onChanged { value in
                    let y = value.translation.height
                    // Upwards it gives a little and no more; downwards it follows.
                    drag = y < 0 ? -sqrt(-y) * 3 : y
                }
                .onEnded { value in
                    let y = value.predictedEndTranslation.height
                    withAnimation(.snappy) {
                        if y < -60 {
                            expanded = true
                        } else if y > 90 {
                            if expanded { expanded = false } else { dismiss() }
                        }
                        drag = 0
                    }
                }
        )
        .sensoryFeedback(.impact(weight: .light), trigger: expanded)
        .task(id: sighting.catId) {
            area = await AreaNames.name(of: sighting.coordinate)
            if let notes = try? await model.foir.fetch(FoirAPI.CatNotesQuery(catKey: .some(sighting.catId), after: .none)),
               let note = notes.fieldNotes.edges.first?.node, let author = note._ownerId {
                await model.circle.load(profilesOf: [author])
                let words = CatBiographyView.words(tags: note.tags?.array?.compactMap(\.string) ?? [], text: note.text)
                let when = Recency.date(note._createdAt).map { CatBiographyView.day($0, copy: model.config) } ?? ""
                latestNote = (words, "\(when) · \(model.circle.name(of: author))")
            } else {
                latestNote = nil
            }
        }
    }
}
