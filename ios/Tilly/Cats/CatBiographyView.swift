import CoreLocation
import SwiftUI

/// A cat's biography: its photos, how it's been caught and liked, the
/// user's own history with it, and its story: every catch, newest first,
/// with who caught it and what they noticed. The public parts read with the
/// app key alone; a catcher's name shows to whoever they let see it.
struct CatBiographyView: View {
    let catId: String

    @Environment(AppModel.self) private var model
    @State private var biography: Biography?
    @State private var gallery: Paged<GalleryPhoto>?
    @State private var details = CaptureDetails()
    @State private var failure: String?
    @State private var sharing = false

    struct Biography {
        let name: String
        let catches: Int
        let seenAt: Date?
        let area: String?
        /// Nil when nobody is signed in: the count is the user's own.
        let timesMet: Int?
    }

    static let headerHeight: CGFloat = 430

    private func t(_ key: String, _ values: [String: String] = [:]) -> String { model.config.t(key, values) }

    var body: some View {
        ScrollView {
            if let biography, let gallery {
                content(biography, gallery: gallery)
            } else if let failure {
                VStack(alignment: .leading, spacing: 6) {
                    Text(model.config.t("cat.loadFailed")).font(.sectionTitle)
                    Text(model.config.failureText(failure)).font(.meta).foregroundStyle(Theme.muted)
                }
                .padding(Theme.margin)
                .padding(.top, 100)
            } else {
                Loading(label: model.config.t("cat.loading"), minHeight: 420)
            }
        }
        .ignoresSafeArea(edges: .top)
        .scrollEdgeEffectHidden(true, for: .top)
        .background(Theme.background)
        .navigationTitle(biography?.name ?? "Cat")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar(removing: .title)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button { sharing = true } label: { Label(model.config.t("common.share"), systemImage: "square.and.arrow.up") }
                    .disabled(biography == nil)
            }
        }
        .navigationDestination(isPresented: $sharing) {
            if let biography {
                ShareCardView(story: .init(catName: biography.name, photo: .remote(gallery?.rows.first?.medium), quote: quote(for: biography), area: biography.area))
            }
        }
        .loadWhenChanged(id: "\(catId)|\(model.account?.userId ?? "")|\(model.catchesSaved)") { await load() }
        .task(id: gallery?.rows.count ?? 0) {
            // Who caught each capture, and what they noticed, as each page comes.
            guard let gallery else { return }
            await details.load(gallery.rows.map(\.id), foir: model.foir, circle: model.circle, likes: model.likes, art: model.art, me: model.account?.userId)
        }
    }

    private func content(_ cat: Biography, gallery: Paged<GalleryPhoto>) -> some View {
        LazyVStack(alignment: .leading, spacing: 0) {
            CatGallery(catId: catId, catName: cat.name, photos: gallery, details: details)
                .frame(height: Self.headerHeight)

            VStack(alignment: .leading, spacing: 0) {
                HStack(alignment: .firstTextBaseline) {
                    Text(cat.name).font(.system(size: 32, weight: .semibold)).kerning(-0.7)
                    Spacer()
                    // A cat's likes are its captures'; the hearts are on each one below.
                    HStack(spacing: 5) {
                        Ph.heart.fill.frame(width: 17, height: 17).foregroundStyle(Theme.signal)
                        Text("\(model.likes.total(cat: catId))").font(.meta).monospacedDigit()
                    }
                    .accessibilityElement(children: .ignore)
                    .accessibilityLabel(t("cat.totalLikes", ["count": String(model.likes.total(cat: catId)), "name": cat.name]))
                }
                .padding(.top, 17)
                Text(t(cat.catches > 1 ? "cat.familiar" : "cat.new", ["area": cat.area ?? "here"]))
                    .font(.meta)
                    .foregroundStyle(Theme.muted)

                AppearanceSuggestionView(catId: catId)
                    .padding(.top, 12)

                HStack(alignment: .top) {
                    stat(cat.catches, cat.catches == 1 ? "catch" : "catches")
                    stat(model.likes.total(cat: catId), model.likes.total(cat: catId) == 1 ? "like" : "likes")
                    if let met = cat.timesMet { stat(met, "times you’ve met") }
                }
                .padding(.vertical, 14)
                .overlay(alignment: .bottom) { Rectangle().fill(Theme.rule).frame(height: 1) }
                .padding(.top, 12)

                HStack(spacing: 9) {
                    FollowCatButton(catId: catId)
                }
                .padding(.vertical, 17)

                if let seenAt = cat.seenAt {
                    Text(t("cat.lastSpotted", ["when": Recency.long(since: seenAt, copy: model.config)])).font(.meta).foregroundStyle(Theme.muted)
                }

                Text(t("cat.story.title", ["name": cat.name])).font(.sectionTitle).padding(.top, 20)
                Text(t("cat.story.subtitle")).font(.meta).foregroundStyle(Theme.muted).padding(.top, 4)
            }
            .padding(.horizontal, Theme.margin)

            story(cat, gallery: gallery)
                .padding(.horizontal, Theme.margin)
                .padding(.top, 14)
                .padding(.bottom, 24)
        }
    }

    private func stat(_ value: Int, _ label: String) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text("\(value)").font(.system(size: 24, weight: .semibold)).monospacedDigit()
            Text(label).font(.system(size: 12)).foregroundStyle(Theme.muted)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    /// Every capture, newest first and a page at a time, then the user's
    /// own line with the cat once they're all in.
    @ViewBuilder
    private func story(_ cat: Biography, gallery: Paged<GalleryPhoto>) -> some View {
        // Lazy: a capture's photo and glow only exist while it's near the screen.
        LazyVStack(alignment: .leading, spacing: 0) {
            ForEach(Array(gallery.rows.enumerated()), id: \.element.id) { index, capture in
                CaptureMoment(catId: catId, catName: cat.name, capture: capture, detail: details.detail(of: capture.id), first: index == 0)
                    .task { await gallery.reached(capture) }
            }
            if gallery.finished {
                TimelineMoment(dot: Theme.muted) {
                    Text(model.config.t("cat.firstHello")).font(.meta).foregroundStyle(Theme.muted)
                    Text(mine(cat)).font(.body15)
                }
            } else if let failure = gallery.failure {
                // No loader spinning for ever behind a read that failed.
                VStack(alignment: .leading, spacing: 4) {
                    Text(model.config.failureText(failure)).font(.meta).foregroundStyle(Theme.muted)
                    Button(model.config.t("common.retry")) { Task { await gallery.loadMore() } }.buttonStyle(.plainAction)
                }
                .padding(.vertical, 12)
            } else {
                LoadingMore().task { await gallery.loadMore() }
            }
        }
        .padding(.leading, 3)
    }

    private func mine(_ cat: Biography) -> String {
        switch cat.timesMet {
        case nil: t("cat.mine.signedOut")
        case 0?: t("cat.mine.none", ["name": cat.name])
        case 1?: t("cat.mine.once", ["name": cat.name])
        case let met?: t("cat.mine.many", ["name": cat.name, "met": "\(met)"])
        }
    }

    /// "Today", "Yesterday", a weekday this week, or the date.
    static func day(_ date: Date, copy: AppConfig) -> String {
        let calendar = Calendar.current
        if calendar.isDateInToday(date) { return copy.t("common.today") }
        if calendar.isDateInYesterday(date) { return copy.t("common.yesterday") }
        if let days = calendar.dateComponents([.day], from: date, to: .now).day, days < 7 {
            return date.formatted(.dateTime.weekday(.wide))
        }
        return date.formatted(.dateTime.day().month(.abbreviated))
    }

    /// The card quotes the user's own history with the cat, never someone
    /// else's words.
    private func quote(for cat: Biography) -> String {
        if let mine = details.ownNote(by: model.account?.userId) { return mine }
        switch cat.timesMet ?? 0 {
        case 0: return t("cat.familiar", ["area": cat.area ?? t("cat.neighbourhood")])
        case 1: return t("cat.quote.once", ["catches": String(cat.catches)])
        case let met: return t("cat.quote.many", ["met": String(met), "catches": String(cat.catches)])
        }
    }

    /// The words of a note: its tags, then its line.
    static func words(tags: [String], text: String?) -> String {
        (tags + [text ?? ""].filter { !$0.isEmpty }).joined(separator: " · ")
    }

    private func load() async {
        biography = nil; gallery = nil; failure = nil
        let viewer = model.account?.userId, revision = model.catchesSaved
        do {
            let foir = model.foir, catId = catId
            let blocked = try await foir.blockedAccounts()
            async let page = foir.fetch(FoirAPI.CatBiographyQuery(id: catId))
            async let met: Int? = model.account == nil ? nil : TaggedCaptures.count(catId: catId, mine: true, foir: foir)
            async let catches = TaggedCaptures.count(catId: catId, foir: foir)
            let first = try await foir.fetch(FoirAPI.TaggedCatGalleryQuery(catKey: .some(catId), after: .none)).captureCatTags
            let found = try await page
            let latest = first.edges.lazy.compactMap { $0.node.capture?.fragments.canonicalMedia }.first { $0.state == "ready" }
            var area: String?
            if let lat = latest?.area?.lat, let lng = latest?.area?.lng {
                area = await AreaNames.name(of: CLLocationCoordinate2D(latitude: lat, longitude: lng))
            }

            // The first page of photos came with the biography; the rest
            // come as the user swipes or scrolls towards them.
            let read: ChronologicalPages<GalleryPhoto>.Read = { after in
                let page = if let after {
                    try await foir.fetch(FoirAPI.TaggedCatGalleryQuery(catKey: .some(catId), after: .some(after))).captureCatTags
                } else { first }
                // A blocked author's photo must not reappear through a cat's gallery or full-screen viewer.
                return (TaggedCaptures.gallery(page, blocked: blocked), page.pageInfo.fragments.more.next)
            }
            let photos = Paged(read)
            let timesMet = try await met
            await photos.reload()
            let catchCount = try await catches
            // Finish every awaited read before committing this viewer's biography.
            // A session change during the count must not install stale private state.
            guard !Task.isCancelled, viewer == model.account?.userId, revision == model.catchesSaved else { return }
            biography = Biography(
                name: found.cat?.name ?? t("cat.thisCat"),
                catches: catchCount,
                seenAt: photos.rows.first?.at ?? Recency.date(latest?._createdAt),
                area: area,
                timesMet: timesMet
            )
            details = CaptureDetails()
            gallery = photos
            await model.likes.load(captures: photos.rows.map(\.id), cats: [catId], me: model.account?.userId)
        } catch {
            guard !Task.isCancelled, viewer == model.account?.userId, revision == model.catchesSaved else { return }
            failure = UserFailure.key(error)
        }
    }
}

/// Who caught each capture and what they noticed, read a page of captures at a
/// time. A catcher who keeps their catches to themselves, or to their friends,
/// is simply not there for anyone else.
@MainActor @Observable
final class CaptureDetails {
    struct Note: Identifiable {
        let id: String
        let ownerId: String?
        let text: String
    }
    struct Detail {
        var catcherId: String?
        var postId: String?
        var notes: [Note] = []
        var highlightKeys = Set<String>()
        var highlightCatalog: [PostHighlight] = []
    }

    private(set) var details: [String: Detail] = [:]
    private var asked = Set<String>()

    func detail(of photoKey: String) -> Detail? { details[photoKey] }

    /// The user's own words at any capture, for the share card.
    func ownNote(by userId: String?) -> String? {
        guard let userId else { return nil }
        return details.values.first { $0.catcherId == userId && !$0.notes.isEmpty }?.notes.first?.text
    }

    func load(_ photoKeys: [String], foir: Foir, circle: SocialCircle, likes: Likes, art: Art, me: String?) async {
        let fresh = photoKeys.filter { asked.insert($0).inserted }
        guard !fresh.isEmpty else { return }
        let identity = await foir.tokens.identity
        async let highlights = try? foir.captureHighlightKeys(fresh)
        async let catalog = try? foir.postHighlightCatalog(ifIdentity: identity)
        async let posts = try? Paging.all(in: fresh) { piece, after in
            let page = try await foir.fetch(FoirAPI.PostsForCapturesQuery(photoKeys: .some(piece), after: .maybe(after))).capturePosts
            return (page.edges.map(\.node.fragments.post), page.pageInfo.fragments.more)
        }
        async let notes = try? Paging.all(in: fresh) { piece, after in
            let page = try await foir.fetch(FoirAPI.NotesForCapturesQuery(photoKeys: .some(piece), after: .maybe(after))).fieldNotes
            return (page.edges.map(\.node), page.pageInfo.fragments.more)
        }
        var found: [String: Detail] = Dictionary(uniqueKeysWithValues: fresh.map { ($0, Detail()) })
        // The capture's own post names its catcher; reshares name the resharer.
        for post in (await posts) ?? [] where post.reshareOf == nil {
            if let key = post.photoKey { found[key]?.catcherId = post._ownerId; found[key]?.postId = post._id }
        }
        for note in (await notes) ?? [] where circle.allows(note._ownerId) {
            guard let key = note.photoKey else { continue }
            let words = CatBiographyView.words(tags: note.tags?.array?.compactMap(\.string) ?? [], text: note.text)
            if !words.isEmpty { found[key]?.notes.append(Note(id: note._id, ownerId: note._ownerId, text: words)) }
        }
        let verifiedKeys = (await highlights) ?? [:]
        let verifiedCatalog = (await catalog) ?? []
        guard await foir.tokens.identity == identity else { return }
        for key in fresh {
            found[key]?.highlightKeys = verifiedKeys[key] ?? []
            found[key]?.highlightCatalog = verifiedCatalog
        }
        details.merge(found) { _, new in new }
        await circle.load(profilesOf: found.values.compactMap(\.catcherId))
        await likes.load(captures: fresh, me: me)
        await art.load(fresh)
    }
}

/// One catch in a cat's story: who caught it and when, the photo, its likes,
/// and what the catcher noticed.
private struct CaptureMoment: View {
    let catId: String
    let catName: String
    let capture: GalleryPhoto
    let detail: CaptureDetails.Detail?
    let first: Bool

    @Environment(AppModel.self) private var model
    @State private var hearts = 0

    var body: some View {
        TimelineMoment(dot: first ? Theme.signal : Theme.muted) {
            HStack(spacing: 8) {
                if let catcher = detail?.catcherId {
                    Avatar(profile: model.circle.profiles[catcher], fallbackSeed: catcher, size: 22)
                }
                Text("\(capture.at.map { CatBiographyView.day($0, copy: model.config) } ?? "") · \(model.config.t("cat.caughtBy", ["catcher": catcherName]))")
                    .font(.meta)
                    .foregroundStyle(Theme.muted)
            }
            ArtFlip(photoKey: capture.id) {
                Color.clear
                    .aspectRatio(4 / 3, contentMode: .fit)
                    .overlay { CatPhoto(url: capture.medium) }
                    .clipShape(RoundedRectangle(cornerRadius: Theme.photoCorner))
            }
            .overlay { HeartBurst(trigger: hearts) }
            .contentShape(Rectangle())
            .onTapGesture(count: 2) {
                hearts += 1
                guard model.account != nil else { return model.signInReason = model.config.t("social.likeSignIn") }
                Task { await model.likes.like(capture: capture.id, cat: catId) }
            }
            .sensoryFeedback(.impact(weight: .medium), trigger: hearts)
            .accessibilityLabel("\(catName), \(capture.at.map { CatBiographyView.day($0, copy: model.config) } ?? "")")
            .accessibilityAction(named: model.config.t("cat.likeAction")) { Task { await model.likes.like(capture: capture.id, cat: catId) } }
            if let detail {
                PostHighlightBadges(catalog: detail.highlightCatalog, selected: detail.highlightKeys)
            }
            ForEach(detail?.notes ?? []) { note in
                HStack(alignment: .top) {
                    Text(note.text).font(.body15)
                    Spacer()
                    ContentSafetyMenu(targetType: "note", targetId: note.id, ownerId: note.ownerId)
                }
            }
            HStack {
                LikeButton(photoKey: capture.id, catId: catId, catName: catName)
                Spacer()
                if let post = detail?.postId { ContentSafetyMenu(targetType: "post", targetId: post, ownerId: detail?.catcherId) }
            }
        }
    }

    private var catcherName: String {
        guard let catcher = detail?.catcherId else { return model.config.t("cat.aUser") }
        return model.circle.name(of: catcher)
    }
}

/// One moment on a cat's story: a quiet rule down the side and a dot.
struct TimelineMoment<Content: View>: View {
    let dot: Color
    @ViewBuilder let content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: 8) { content }
            .padding(.leading, 18)
            .padding(.top, 10)
            .padding(.bottom, 22)
            .frame(maxWidth: .infinity, alignment: .leading)
            .overlay(alignment: .leading) { Rectangle().fill(Theme.rule).frame(width: 1) }
            .overlay(alignment: .topLeading) {
                Circle().fill(dot).frame(width: 7, height: 7).offset(x: -3, y: 14)
            }
    }
}

/// One photo in a cat's gallery, at the sizes the screens show it. Its id is
/// the capture's: the cat photo one catch made.
struct GalleryPhoto: Identifiable, Hashable {
    let id: String
    let medium: URL?
    let full: URL?
    let at: Date?

    init?(_ photo: FoirAPI.PhotoThumb?, id: String, at: String? = nil) {
        guard let photo else { return nil }
        self.id = id
        medium = photo.mediumURL
        full = photo.fullURL ?? photo.mediumURL
        self.at = Recency.date(at)
    }
}

/// Follow cat, or Following, with a tap of haptic feedback.
struct FollowCatButton: View {
    let catId: String

    @Environment(AppModel.self) private var model
    @State private var working = false
    @State private var failure: String?

    var body: some View {
        let following = model.circle.followedCats.contains(catId)
        Button {
            guard model.account != nil else {
                model.signInReason = model.config.t("cat.followSignIn")
                return
            }
            working = true
            failure = nil
            Task {
                do { try await model.circle.setFollowingCat(catId, !following) } catch { failure = UserFailure.key(error) }
                working = false
            }
        } label: {
            Label { Text(model.config.t(following ? "cat.following" : "cat.follow")) } icon: { Icon(icon: following ? .bellSimple : .plus) }
        }
        .buttonStyle(.secondary)
        .disabled(working)
        .sensoryFeedback(trigger: following) { _, now in now ? .success : .impact(weight: .light) }
        .overlay(alignment: .bottom) {
            if let failure {
                Text(model.config.failureText(failure)).font(.system(size: 11)).foregroundStyle(.red).offset(y: 18)
            }
        }
    }
}

/// A cat's photos, swiped through. A pinch zooms in place, a double tap likes
/// the capture on screen, and a tap opens the photos full screen.
struct CatGallery: View {
    let catId: String
    let catName: String
    let photos: Paged<GalleryPhoto>
    let details: CaptureDetails

    @Environment(AppModel.self) private var model
    @State private var selection: String?
    @State private var viewing: String?
    @State private var hearts = 0
    @State private var zoom: CGFloat = 1
    @State private var anchor: UnitPoint = .center

    var body: some View {
        ZStack {
            if photos.rows.isEmpty {
                CatPhoto(url: nil)
            } else {
                TabView(selection: $selection) {
                    ForEach(photos.rows) { photo in
                        ArtFlip(photoKey: photo.id) {
                            Color.clear
                                .overlay { CatPhoto(url: photo.medium) }
                                .clipped()
                        }
                            .scaleEffect(photo.id == selection ? zoom : 1, anchor: anchor)
                            .tag(Optional(photo.id))
                            .task { await photos.reached(photo) }
                    }
                }
                .tabViewStyle(.page(indexDisplayMode: photos.rows.count > 1 ? .always : .never))
            }
            if let detail = details.detail(of: selection ?? photos.rows.first?.id ?? ""), !detail.highlightKeys.isEmpty {
                VStack {
                    Spacer()
                    PostHighlightBadges(catalog: detail.highlightCatalog, selected: detail.highlightKeys)
                        .padding(.horizontal, 12)
                        .padding(.bottom, photos.rows.count > 1 ? 36 : 12)
                }
                .allowsHitTesting(false)
            }
            HeartBurst(trigger: hearts)
        }
        .contentShape(Rectangle())
        .simultaneousGesture(
            MagnifyGesture()
                .onChanged { value in
                    anchor = value.startAnchor
                    zoom = min(max(value.magnification, 1), 4)
                }
                .onEnded { _ in withAnimation(.snappy) { zoom = 1 } }
        )
        .onTapGesture(count: 2) {
            hearts += 1
            guard model.account != nil else {
                model.signInReason = model.config.t("social.likeSignIn")
                return
            }
            if let capture = selection ?? photos.rows.first?.id {
                Task { await model.likes.like(capture: capture, cat: catId) }
            }
        }
        .onTapGesture { viewing = selection ?? photos.rows.first?.id }
        .sensoryFeedback(.impact(weight: .medium), trigger: hearts)
        .onAppear { if selection == nil { selection = photos.rows.first?.id } }
        .onChange(of: photos.rows.first?.id) { if selection == nil { selection = photos.rows.first?.id } }
        .fullScreenCover(item: Binding(get: { viewing.map(Viewing.init) }, set: { viewing = $0?.id })) { open in
            PhotoViewer(photos: photos, start: open.id, catName: catName, details: details)
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel(model.config.t("cat.photosOf", ["name": catName]))
        .accessibilityHint(model.art.piece(for: selection ?? photos.rows.first?.id ?? "")?.status == .ready
            ? model.config.t("cat.galleryHint") + " " + model.config.t("art.flip")
            : model.config.t("cat.galleryHint"))
    }

    private struct Viewing: Identifiable {
        let id: String
    }
}

/// The heart that blooms over a photo when it's double tapped.
struct HeartBurst: View {
    let trigger: Int

    var body: some View {
        Ph.heart.fill
            .frame(width: 96, height: 96)
            .foregroundStyle(.white)
            .shadow(color: .black.opacity(0.25), radius: 12)
            .keyframeAnimator(initialValue: Burst(), trigger: trigger) { heart, burst in
                heart.scaleEffect(burst.scale).opacity(burst.opacity)
            } keyframes: { _ in
                KeyframeTrack(\.scale) {
                    SpringKeyframe(1.15, duration: 0.25, spring: .bouncy)
                    LinearKeyframe(1, duration: 0.35)
                    LinearKeyframe(1.3, duration: 0.2)
                }
                KeyframeTrack(\.opacity) {
                    LinearKeyframe(1, duration: 0.1)
                    LinearKeyframe(1, duration: 0.5)
                    LinearKeyframe(0, duration: 0.2)
                }
            }
            .allowsHitTesting(false)
            .accessibilityHidden(true)
    }

    struct Burst {
        var scale: CGFloat = 0.2
        var opacity: Double = 0
    }
}
