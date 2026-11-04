import SwiftUI

/// A user's page: who they are, their counts, and what they've shared that
/// the viewer may see. Fóir decides which posts that is. A private user's page
/// shows only who they are until the viewer is an accepted follower. Its
/// counts are hidden too for now (Fóir gap, docs/known-gaps.md: closes when an
/// operation can keep counts on both profiles). The user's own page, opened from their avatar, adds
/// their streak, challenges and cats, and a gear for their profile and settings.
struct PersonView: View {
    let userId: String

    @Environment(AppModel.self) private var model
    @State private var posts: Paged<FeedPost>?
    @State private var working = false
    @State private var failure: String?
    @State private var destination: PostRoute?
    @State private var people: PeopleList.Kind?
    @State private var catCounts: (cats: Int, catches: Int)?
    @State private var counts: Foir.Counts?

    private var profile: Profile? { model.circle.profiles[userId] }
    private var isMe: Bool { userId == model.account?.userId }
    /// Private, and the viewer isn't an accepted follower.
    private var locked: Bool { !isMe && profile?.isPrivate == true && model.circle.follow(of: userId) != .following }

    var body: some View {
        if model.circle.blocked.contains(userId) {
            VStack(alignment: .leading, spacing: 20) {
                Text(model.config.t("safety.blockedTitle")).font(.sectionTitle)
                ContentSafetyMenu(targetType: "profile", targetId: profile?.id ?? userId, ownerId: userId)
            }.padding(Theme.margin)
        } else {
        ScrollView {
            LazyVStack(alignment: .leading, spacing: 0) {
                HStack(spacing: 15) {
                    Avatar(profile: profile, size: 70)
                    VStack(alignment: .leading, spacing: 4) {
                        Text(profile?.displayName ?? model.config.t("profile.aUser")).font(.sectionTitle)
                        if let username = profile?.username, !username.isEmpty {
                            Text("@\(username)").font(.meta).foregroundStyle(Theme.muted)
                        }
                        if !isMe, model.circle.followers.contains(userId) {
                            Text(model.config.t("profile.followsYou")).font(.meta).foregroundStyle(Theme.muted)
                        }
                    }
                    if isMe {
                        Spacer(minLength: 8)
                        HStack(spacing: 6) {
                            OwnerStreakIndicator()
                            ChallengeTrophy()
                        }
                    }
                }
                .padding(.top, 16)
                if let bio = profile?.bio, !bio.isEmpty {
                    Text(bio).font(.body15).padding(.top, 14)
                }
                // For now, no counts on a private page the viewer doesn't
                // follow: Fóir can't count them for a non-follower yet.
                if !locked {
                    HStack(spacing: 0) {
                        if isMe {
                            stat(model.circle.followers.count, "profile.stat.followers", label: "profile.followerCount") { people = .followers(userId) }
                            stat(model.circle.following.count, "profile.stat.following", label: "profile.followingCount") { people = .following(userId) }
                            stat(catCounts?.cats, "profile.stat.cats", label: "profile.cats.count")
                            stat(catCounts?.catches, "profile.stat.catches", label: "profile.catchCount")
                        } else {
                            stat(counts?.followers, "profile.stat.followers", label: "profile.followerCount") { people = .followers(userId) }
                            stat(counts?.following, "profile.stat.following", label: "profile.followingCount") { people = .following(userId) }
                            stat(counts?.cats, "profile.stat.cats", label: "profile.cats.count")
                            stat(counts?.catches, "profile.stat.catches", label: "profile.catchCount")
                        }
                    }
                    .padding(.top, 14)
                }
                if !isMe, model.account != nil {
                    FollowUserButton(userId: userId).padding(.top, 16)
                    ContentSafetyMenu(targetType: "profile", targetId: profile?.id ?? userId, ownerId: userId)
                }

                if isMe { YourCats(open: { destination = .cat($0) }, counted: { catCounts = ($0, $1) }).padding(.top, 16) }
                if locked {
                    VStack(alignment: .leading, spacing: 6) {
                        Label(model.config.t("profile.private.title"), systemImage: "lock.fill").font(.sectionTitle)
                        Text(model.config.t("profile.private.body", ["name": profile?.displayName ?? model.config.t("profile.aUser")]))
                            .font(.meta).foregroundStyle(Theme.muted)
                    }
                    .padding(.top, 28)
                } else {
                Text(model.config.t("profile.sharedCaptures")).font(.sectionTitle).padding(.top, 24)
                if let posts, posts.started {
                    if posts.rows.isEmpty {
                        Text(isMe ? model.config.t("profile.sharedOwnEmpty") : model.config.t("profile.sharedOtherEmpty"))
                            .font(.meta)
                            .foregroundStyle(Theme.muted)
                            .padding(.top, 6)
                    }
                    ForEach(posts.rows) { post in
                        PostCard(post: post) { route in
                            destination = route
                        }
                        .task { await posts.reached(post) }
                    }
                    if posts.loading { LoadingMore() }
                    if let failure = posts.failure {
                        Text(model.config.failureText(failure)).font(.meta).foregroundStyle(Theme.muted)
                        Button(model.config.t("common.retry")) { Task { await posts.loadMore() } }.buttonStyle(.plainAction)
                    }
                } else {
                    Loading(minHeight: 160)
                }
                }
            }
            .padding(.horizontal, Theme.margin)
            .padding(.bottom, 24)
        }
        .background(Theme.background)
        .navigationTitle(profile?.displayName ?? model.config.t("profile.user"))
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            if isMe {
                ToolbarItem(placement: .topBarTrailing) {
                    Button { model.showingProfile = true } label: { Image(systemName: "gearshape") }
                        .accessibilityLabel(model.config.t("profile.settings"))
                }
            }
        }
        .navigationDestination(item: $people) { kind in PeoplePage(kind: kind) }
        .navigationDestination(item: $destination) { route in
            switch route {
            case .cat(let catId): CatBiographyView(catId: catId)
            case .person(let userId): PersonView(userId: userId)
            case .reshare(let post): ShareComposer(subject: .reshare(post))
            }
        }
        .loadWhenChanged(id: "\(userId)|\(model.catchesSaved)|\(model.circle.follow(of: userId))") { await load() }
        }
    }

    /// One of the profile's counts: the number, and what it counts beneath.
    @ViewBuilder
    private func stat(_ count: Int?, _ key: String, label: String, _ action: (() -> Void)? = nil) -> some View {
        let content = VStack(spacing: 2) {
            Text(count?.formatted() ?? "–").font(.body15.weight(.semibold)).monospacedDigit().foregroundStyle(Theme.ink)
            Text(model.config.t(key, count: count ?? 0)).font(.meta).foregroundStyle(Theme.muted)
        }
        .frame(maxWidth: .infinity, minHeight: 44)
        .contentShape(Rectangle())
        Group {
            if let action { Button(action: action) { content }.buttonStyle(.plain) } else { content }
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(model.config.t(label, count: count ?? 0))
        .accessibilityAddTraits(action == nil ? [] : .isButton)
    }

    private func load() async {
        await model.circle.load(profilesOf: [userId], refreshing: [userId])
        if !isMe, !locked { counts = try? await model.foir.profileCounts(userId: userId) }
        let foir = model.foir, circle = model.circle, likes = model.likes, art = model.art, reshares = model.reshares
        let me = model.account?.userId, userId = userId
        var shown = Set<String>()
        let list = Paged<FeedPost> { after in
            let page = try await foir.fetch(FoirAPI.PostsByQuery(owners: .some([userId]), first: 20, after: .maybe(after))).capturePosts
            // A user's page shows what they reshared, each capture once.
            let built = reshares.cards(await Posts.build(page.edges.map(\.node.fragments.post), foir: foir, circle: circle), shown: &shown) { _ in false }
            await likes.load(captures: built.map(\.photoKey), cats: built.map(\.catId), me: me)
            await art.load(built.map(\.photoKey))
            return (built, page.pageInfo.fragments.more.next)
        }
        posts = list
        await list.reload()
    }
}

/// A user's followers, or the people they follow, as a page of its own.
struct PeoplePage: View {
    let kind: PeopleList.Kind

    @Environment(AppModel.self) private var model
    @State private var opened: String?

    var body: some View {
        ScrollView {
            PeopleList(kind: kind, open: { opened = $0 })
                .padding(.horizontal, Theme.margin)
                .padding(.bottom, 24)
        }
        .background(Theme.background)
        .navigationTitle(model.config.t(kind.isFollowers ? "profile.followers" : "profile.following"))
        .navigationBarTitleDisplayMode(.inline)
        .navigationDestination(item: $opened) { PersonView(userId: $0) }
    }
}

/// Follow, Requested or Following for one user, with a tap of haptic
/// feedback. Following a private user asks them; tapping Requested takes
/// the request back.
struct FollowUserButton: View {
    let userId: String

    @Environment(AppModel.self) private var model
    @State private var working = false
    @State private var failure: String?

    var body: some View {
        let state = model.circle.follow(of: userId)
        let name = model.circle.name(of: userId)
        VStack(alignment: .leading, spacing: 6) {
            Button(model.config.t(state == .following ? "profile.following" : state == .requested ? "profile.requested" : "profile.follow")) {
                working = true
                failure = nil
                Task {
                    do { try await model.circle.setFollowing(userId, state == .notFollowing) } catch { failure = UserFailure.key(error) }
                    working = false
                }
            }
            .buttonStyle(state == .notFollowing ? AnyButtonStyle(.primary) : AnyButtonStyle(.secondary))
            .disabled(working)
            .accessibilityHint(state == .requested ? model.config.t("profile.cancelRequest") : "")
            .sensoryFeedback(trigger: state) { _, now in now == .notFollowing ? .impact(weight: .light) : .success }
            if state == .requested {
                Text(model.config.t("profile.requestedHint", ["name": name])).font(.meta).foregroundStyle(Theme.muted)
            }
            if let failure {
                Text(model.config.failureText(failure)).font(.meta).foregroundStyle(.red)
            }
        }
    }
}

/// A button style chosen at run time.
struct AnyButtonStyle: ButtonStyle {
    private let make: (Configuration) -> AnyView

    init(_ style: some ButtonStyle) {
        make = { AnyView(style.makeBody(configuration: $0)) }
    }

    func makeBody(configuration: Configuration) -> some View { make(configuration) }
}
