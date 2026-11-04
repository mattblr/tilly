import CoreLocation
import PhosphorSwift
import SwiftUI

/// Following and Trending. Following is the user's own posts and those of
/// the people and cats they follow, newest first. Trending is public captures
/// in a place and a period, ranked by the likes their cats were given in that
/// period.
struct FeedView: View {
    enum Mode: String, CaseIterable {
        case following = "Following"
        case trending = "Trending"
    }

    enum Scope: Hashable {
        case worldwide, nearMe, travelling
    }

    enum Period: String, CaseIterable {
        case today = "Today"
        case week = "This week"
        case month = "This month"
        case all = "All time"

        var copyKey: String { switch self { case .today: "today"; case .week: "week"; case .month: "month"; case .all: "all" } }

        /// When the period starts, in the phone's time zone.
        var start: Date? {
            let calendar = Calendar.current
            switch self {
            case .today: return calendar.startOfDay(for: .now)
            case .week: return calendar.dateInterval(of: .weekOfYear, for: .now)?.start
            case .month: return calendar.dateInterval(of: .month, for: .now)?.start
            case .all: return nil
            }
        }

        /// The start as Fóir takes it; all time starts at the epoch.
        var since: String {
            ISO8601DateFormatter().string(from: start ?? Date(timeIntervalSince1970: 0))
        }
    }

    @Environment(AppModel.self) private var model
    @Environment(\.scenePhase) private var scenePhase
    @State private var mode: Mode = .trending
    @State private var scope: Scope = .worldwide
    @State private var period: Period = .week
    @State private var destination: Destination?
    @State private var choosingPeriod = false
    @State private var travelling = false
    /// Following and Trending each keep the list they last read, so switching
    /// between them shows it again instead of reading everything anew.
    @State private var feeds: [Mode: Kept] = [:]
    @State private var failure: String?
    @State private var path: [PostRoute] = []

    var body: some View {
        NavigationStack(path: $path) {
            ScrollView {
                LazyVStack(alignment: .leading, spacing: 0) {
                    tabs
                    if mode == .trending { controls }
                    if model.circle.safetyFailed {
                        VStack(alignment: .leading, spacing: 8) {
                            Text(model.config.t("safety.failed")).font(.meta)
                            Button(model.config.t("safety.retry")) {
                                Task { await model.circle.reload(for: model.account?.userId); model.caught() }
                            }.buttonStyle(.plainAction)
                        }.padding(.vertical, 12)
                    }
                    content
                }
                .padding(.top, 52)
                .padding(.horizontal, Theme.margin)
                .padding(.bottom, 24)
            }
            .background(Theme.background)
            .tillyHeader(model.config.t("navigation.feed"))
            .navigationDestination(for: PostRoute.self) { route in
                switch route {
                case .cat(let catId): CatBiographyView(catId: catId)
                case .person(let userId): PersonView(userId: userId)
                case .reshare(let post): ShareComposer(subject: .reshare(post))
                }
            }
            .refreshable { await load(force: true) }
            // The avatar opens the user's own page over what the feed shows.
            .onChange(of: model.profileRequests) {
                guard model.tab == .feed, let me = model.account?.userId, path.last != .person(me) else { return }
                path.append(.person(me))
            }
            // Waits until the tab is showing, and then reads only when what it shows has
            // changed. Pulling down reads again whenever the user wants.
            .loadWhenChanged(id: model.tab == .feed && scenePhase == .active ? loadKey : nil) { await load() }
            .sheet(isPresented: $choosingPeriod) { periodSheet }
            .sheet(isPresented: $travelling) {
                TravelSheet { place in
                    destination = place
                    scope = .travelling
                }
            }
        }
    }

    private struct LoadKey: Hashable {
        let mode: Mode
        let scope: Scope
        let period: Period
        let destination: Destination?
        let user: String?
        let circle: Int
        /// Catches saved this session: a new one belongs at the top.
        let catches: Int
        let locationRevision: Int
    }

    private struct Kept {
        let key: LoadKey
        let list: Paged<FeedPost>
    }

    /// The shown mode's list, while what it was read for still holds.
    private var feed: Paged<FeedPost>? {
        guard let kept = feeds[mode], kept.key == loadKey else { return nil }
        return kept.list
    }

    private var loadKey: LoadKey {
        // Who the user follows only changes what Following shows.
        LoadKey(mode: mode, scope: scope, period: period, destination: destination, user: model.account?.userId, circle: mode == .following ? circleKey : 0, catches: model.catchesSaved, locationRevision: mode == .trending && scope == .nearMe ? model.location.revision : 0)
    }

    /// Changes when who or what the user follows changes.
    private var circleKey: Int {
        var hasher = Hasher()
        hasher.combine(model.circle.following)
        hasher.combine(model.circle.followedCats)
        return hasher.finalize()
    }

    private var tabs: some View {
        HStack(spacing: 21) {
            ForEach(Mode.allCases, id: \.self) { tab in
                Button { mode = tab } label: {
                    Text(model.config.t(tab == .following ? "feed.mode.following" : "feed.mode.trending"))
                        .font(.body15.weight(mode == tab ? .semibold : .regular))
                        .foregroundStyle(mode == tab ? Theme.ink : Theme.muted)
                        .padding(.vertical, 9)
                        .overlay(alignment: .bottom) {
                            Rectangle().fill(mode == tab ? Theme.ink : .clear).frame(height: 2)
                        }
                }
                .buttonStyle(.plain)
                .accessibilityAddTraits(mode == tab ? .isSelected : [])
            }
        }
        .padding(.top, 8)
        .padding(.bottom, 8)
    }

    /// Where and when: a three-way place switch beside the period.
    private var controls: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack {
                HStack(spacing: 2) {
                    scopeButton(.worldwide, icon: .globe, label: model.config.t("feed.worldwide"))
                    scopeButton(.nearMe, icon: .city, label: model.config.t("feed.nearMe"))
                    scopeButton(.travelling, icon: .airplaneTakeoff, label: model.config.t("feed.travelling"))
                }
                .padding(4)
                .background(Theme.raised, in: RoundedRectangle(cornerRadius: 13))
                Spacer()
                Button { choosingPeriod = true } label: {
                    HStack(spacing: 8) { Text(model.config.t("feed.period.\(period.copyKey)")).font(.meta); Icon(icon: .caretDown, size: 16) }
                        .padding(.horizontal, 12)
                        .frame(minHeight: 44)
                        .background(Theme.raised, in: Capsule())
                }
                .buttonStyle(.plain)
            }
            if scope == .travelling, let destination {
                Button { travelling = true } label: {
                    HStack(spacing: 6) {
                        Icon(icon: .mapPin, size: 16)
                        Text(destination.name).font(.meta).lineLimit(1)
                        Icon(icon: .caretDown, size: 16)
                    }
                    .foregroundStyle(Theme.muted)
                    .frame(minHeight: 44)
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.vertical, 6)
    }

    private func scopeButton(_ value: Scope, icon: Ph, label: String) -> some View {
        Button {
            if value == .travelling { travelling = true } else { scope = value }
        } label: {
            Icon(icon: icon, size: 20)
                .frame(width: 44, height: 44)
                .foregroundStyle(scope == value ? Theme.ink : Theme.muted)
                .background(scope == value ? Theme.background : .clear, in: RoundedRectangle(cornerRadius: 10))
        }
        .buttonStyle(.plain)
        .accessibilityLabel(label)
        .accessibilityAddTraits(scope == value ? .isSelected : [])
        .help(label)
    }

    private var periodSheet: some View {
        NavigationStack {
            List(Period.allCases, id: \.self) { choice in
                Button {
                    period = choice
                    choosingPeriod = false
                } label: {
                    HStack {
                        Text(model.config.t("feed.period.\(choice.copyKey)")).foregroundStyle(Theme.ink)
                        Spacer()
                        if choice == period { Image(systemName: "checkmark").foregroundStyle(Theme.signal) }
                    }
                }
            }
            .navigationTitle(model.config.t("feed.timePeriod"))
            .navigationBarTitleDisplayMode(.inline)
        }
        .presentationDetents([.height(320)])
    }

    @ViewBuilder
    private var content: some View {
        if let failure {
            VStack(alignment: .leading, spacing: 12) {
                Text(model.config.failureText(failure)).font(.meta).foregroundStyle(Theme.muted)
                if failure == "errors.locationDenied" {
                    Button(model.config.t("errors.openSettings")) { LocationPermission.openSettings() }.buttonStyle(.secondary)
                }
                Button(model.config.t("errors.retry")) { Task { await load(force: true) } }.buttonStyle(.secondary)
            }.padding(.vertical, 35)
        } else if let feed, feed.started {
            if feed.rows.isEmpty, feed.finished {
                empty
            } else {
                ForEach(feed.rows) { post in
                    PostCard(post: post) { path.append($0) }
                        .task { await feed.reached(post) }
                }
                if feed.loading { LoadingMore() }
                if let failure = feed.failure {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(feed.rows.isEmpty ? model.config.t("feed.loadFailed") : model.config.t("feed.moreFailed")).font(.body15.weight(.semibold))
                        Text(model.config.failureText(failure)).font(.meta).foregroundStyle(Theme.muted)
                        Button(model.config.t("common.retry")) { Task { await feed.loadMore() } }.buttonStyle(.plainAction)
                    }
                    .padding(.vertical, 12)
                }
            }
        } else {
            Loading(label: model.config.t(mode == .following ? "feed.loading.following" : "feed.loading.trending"))
        }
    }

    @ViewBuilder
    private var empty: some View {
        VStack(alignment: .leading, spacing: 8) {
            if mode == .following {
                Text(model.config.t("feed.following.emptyTitle")).font(.sectionTitle)
                Text(model.config.t("feed.following.emptyBody")).font(.meta).foregroundStyle(Theme.muted)
                HStack(spacing: 9) {
                    Button(model.config.t("feed.findFriends")) { model.openProfile() }.buttonStyle(.secondary)
                    Button(model.config.t("feed.exploreCats")) { model.tab = .explore }.buttonStyle(.secondary)
                }
                .padding(.top, 8)
            } else {
                Text(model.config.t("feed.trending.emptyTitle")).font(.sectionTitle)
                Text(model.config.t(period == .all && scope == .worldwide ? "feed.trending.emptyPublicBody" : "feed.trending.emptyBody", ["period": periodPhrase, "place": placePhrase]))
                    .font(.meta)
                    .foregroundStyle(Theme.muted)
                if period != .all {
                    Button(model.config.t("feed.allTimeAction")) { period = .all }.buttonStyle(.secondary).padding(.top, 8)
                }
            }
        }
        .padding(.vertical, 35)
    }

    private var periodPhrase: String {
        switch period {
        case .today: model.config.t("feed.phrase.today")
        case .week: model.config.t("feed.phrase.week")
        case .month: model.config.t("feed.phrase.month")
        case .all: model.config.t("feed.phrase.all")
        }
    }

    private var placePhrase: String {
        switch scope {
        case .worldwide: model.config.t("feed.place.worldwide")
        case .nearMe: model.config.t("feed.place.nearMe")
        case .travelling: model.config.t("feed.place.travelling", ["place": destination?.name ?? model.config.t("feed.place.fallback")])
        }
    }

    /// Reads the shown mode's list, unless it already holds one read for the
    /// same account, filters, follows and catches. Pulling down forces a read.
    private func load(force: Bool = false) async {
        let requested = loadKey
        // Another account's posts never stay behind after a sign-out or switch.
        if feeds.values.contains(where: { $0.key.user != requested.user }) { feeds = [:] }
        // Refocus/permission retries replace the stale denial immediately, even before a fix arrives.
        failure = nil
        if !force, let kept = feeds[requested.mode], kept.key == requested, kept.list.failure == nil { return }
        feeds[requested.mode] = nil
        do {
            let source = try await self.source()
            guard !Task.isCancelled, requested == loadKey else { return }
            let foir = model.foir, circle = model.circle, likes = model.likes, art = model.art, reshares = model.reshares, me = model.account?.userId
            // Who the user sees without a reshare: themselves, the people they
            // follow, and the cats they follow.
            let people = circle.following.union(me.map { [$0] } ?? [])
            let cats = circle.followedCats
            let shown = Shown()
            let list = source.paged { stored in
                let built = await Posts.build(stored, foir: foir, circle: circle)
                let cards = reshares.cards(built, shown: &shown.captures) { people.contains($0.authorId) || cats.contains($0.catId) }
                await likes.load(captures: cards.map(\.photoKey), cats: cards.map(\.catId), me: me)
                await art.load(cards.map(\.photoKey))
                return cards
            }
            failure = nil
            feeds[requested.mode] = Kept(key: requested, list: list)
            await list.reload()
        } catch {
            guard !Task.isCancelled, requested == loadKey else { return }
            failure = UserFailure.key(error)
        }
    }

    /// The captures a feed has shown, across its pages.
    private final class Shown {
        var captures = Set<String>()
    }

    private func source() async throws -> any PostSource {
        let foir = model.foir
        let settings = model.config.settings
        switch mode {
        case .following:
            // The user's own posts, and the people they follow: up to 100
            // people a list. Then the public posts of the cats they follow.
            let people = model.circle.following.union(model.account.map { [$0.userId] } ?? [])
            let byPeople: [PostPage] = Paging.pieces(people).map { owners in
                { after in
                    let page = try await foir.fetch(FoirAPI.PostsByQuery(owners: .some(owners), first: 20, after: .maybe(after))).capturePosts
                    return (page.edges.map(\.node.fragments.post), page.pageInfo.fragments.more.next)
                }
            }
            let aboutCats: [PostPage] = Paging.pieces(model.circle.followedCats).map { cats in
                { after in
                    let page = try await foir.fetch(FoirAPI.PostsAboutQuery(catKeys: .some(cats), since: .some(Period.all.since), first: 20, after: .maybe(after))).capturePosts
                    return (page.edges.map(\.node.fragments.post), page.pageInfo.fragments.more.next)
                }
            }
            let taggedCats: [PostPage] = Paging.pieces(model.circle.followedCats).map { cats in
                { after in
                    let page = try await foir.fetch(FoirAPI.TaggedCatFeedQuery(catKeys: .some(cats), after: .maybe(after))).captureCatTags
                    let keys = Set(page.edges.compactMap { edge -> String? in
                        let tag = edge.node
                        guard let capture = tag.capture, capture.state == "ready", capture.tagRevision == tag.revision, capture._ownerId == tag._ownerId else { return nil }
                        return capture._id
                    })
                    let posts = try await Paging.all(in: keys) { piece, cursor in
                        let found = try await foir.fetch(FoirAPI.PostsForCapturesQuery(photoKeys: .some(piece), after: .maybe(cursor))).capturePosts
                        return (found.edges.map(\.node.fragments.post), found.pageInfo.fragments.more)
                    }
                    return (posts.filter { $0.reshareOf == nil }.sorted { Posts.date($0) > Posts.date($1) }, page.pageInfo.fragments.more.next)
                }
            }
            return MergedPosts(byPeople + aboutCats + taggedCats)
        case .trending:
            switch scope {
            case .worldwide:
                return TrendingWorldwide(foir: foir, since: period.since, perCat: settings.trendingPerCat)
            case .nearMe:
                return TrendingNearby(
                    foir: foir,
                    center: try await Location.current(),
                    radius: CLLocationDistance(settings.nearMeMeters),
                    since: period.since,
                    perCat: settings.trendingPerCat
                )
            case .travelling:
                guard let destination else { return MergedPosts([]) }
                return TrendingNearby(foir: foir, center: destination.center, radius: destination.radius, since: period.since, perCat: settings.trendingPerCat)
            }
        }
    }
}
