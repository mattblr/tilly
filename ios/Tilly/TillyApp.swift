import SwiftUI

@main
struct TillyApp: App {
    @Environment(\.scenePhase) private var scenePhase
    @UIApplicationDelegateAdaptor(PushDelegate.self) private var push
    @State private var model = AppModel()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(model)
                .environment(\.locale, Locale(identifier: model.config.locale ?? model.config.locales.first(where: { $0.isDefault })?.canonicalCode ?? Locale.current.identifier))
                .environment(\.layoutDirection, model.config.rightToLeft ? .rightToLeft : .leftToRight)
                .task {
                    push.model = model
                    model.location.requestOnOpen()
                }
                .onChange(of: scenePhase) { _, phase in
                    if phase == .active {
                        model.location.becameActive()
                        Task {
                            async let config: Void = model.config.reload()
                            async let premium: Void = model.subscription.identify(model.account?.userId)
                            // New follow requests arrive without a notification.
                            async let circle: Void = model.circle.reload(for: model.account?.userId)
                            _ = await (config, premium, circle)
                        }
                    }
                }
        }
    }
}

enum AppTab: Hashable {
    case explore, capture, feed
}

/// What every screen shares: the way to Fóir, who is signed in, and where the
/// user is in the app.
@MainActor @Observable
final class AppModel {
    struct Account: Equatable {
        let userId: String
        let email: String
    }

    /// A user page opened from outside the app, by their code or link.
    struct OpenedProfile: Identifiable {
        let id: String
    }

    /// A cat page opened from outside the app: a notification's link.
    struct OpenedCat: Identifiable {
        let id: String
    }

    private(set) var account: Account?
    let foir: Foir
    let location = LocationPermission()
    /// The signed-in user's profile, follows and the names of people seen.
    let circle: SocialCircle
    /// Every cat's likes, shared by every screen that shows a heart.
    let likes: Likes
    /// Days in a row the user has caught a cat.
    let streaks: Streaks
    /// The console's numbers, streak tiers and words.
    let config: AppConfig
    /// Tilly Premium's catch art, and whether the user has premium.
    let art: Art
    /// The current user’s platform-owned notification inbox.
    let inbox: NotificationInbox
    /// Who has reshared each capture the user has seen.
    let reshares = Reshares()
    /// Buying Tilly Premium.
    let subscription: Subscription

    var tab: AppTab = .feed
    var showingInbox = false
    var showingProfile = false
    var accountDeleted = false
    /// Why the sign-in sheet is up, or nil when it isn't.
    var signInReason: String?
    /// The catch open over the camera.
    var catching: CatchFlow?
    var openedProfile: OpenedProfile?
    var openedCat: OpenedCat?
    /// Catches saved this session. Screens that show catches reload when it changes.
    private(set) var catchesSaved = 0
    /// Asks Explore to go back to its map, when the wordmark is tapped.
    private(set) var homeRequests = 0
    /// Asks the showing tab to open the user's own profile page.
    private(set) var profileRequests = 0

    init() {
        let (changes, continuation) = AsyncStream.makeStream(of: Account?.self)
        let foir = Foir(tokens: TokenStore(account: FoirConfig.main.sessionAccount) { tokens in
            continuation.yield(tokens.map { Account(userId: $0.userId, email: $0.email) })
        })
        self.foir = foir
        inbox = NotificationInbox(foir: foir)
        let config = AppConfig(foir: foir)
        self.config = config
        circle = SocialCircle(foir: foir, copy: config)
        likes = Likes(foir: foir)
        streaks = Streaks(foir: foir, config: config)
        art = Art(foir: foir)
        subscription = Subscription(foir: foir, art: art)
        Task { await config.reload() }
        Task { [weak self] in
            for await account in changes {
                guard let self else { return }
                let changed = self.account?.userId != account?.userId
                self.account = account
                if account != nil { self.signInReason = nil }
                if changed {
                    self.showingProfile = false
                    self.showingInbox = false
                    self.catching = nil
                    self.inbox.reset(for: account?.userId)
                    self.openedCat = nil; self.openedProfile = nil
                    self.art.forget()
                    Task { await self.inbox.load() }
                    if account == nil {
                        self.likes.forget()
                    }
                    if account != nil { Task { await Push.registerIfAllowed() } }
                    Task { await self.subscription.identify(account?.userId) }
                    async let circle: Void = self.circle.reload(for: account?.userId)
                    async let streaks: Void = self.streaks.reload(signedIn: account != nil)
                    _ = await (circle, streaks)
                    self.caught()
                }
            }
        }
    }

    /// The avatar opens the user's profile, or asks them to sign in.
    func openProfile() {
        if account == nil { signInReason = config.t("catch.keepCats") } else {
            profileRequests += 1
            Task { await circle.reload(for: account?.userId) }
        }
    }

    /// Return to the Explore map.
    func goHome() {
        showingProfile = false
        tab = .explore
        homeRequests += 1
    }

    /// A catch was saved: what shows catches is out of date.
    func caught() {
        catchesSaved += 1
    }

    /// "Catch Pepper": back to a ready camera, from anywhere.
    func catchCat() {
        showingProfile = false
        openedProfile = nil
        catching = nil
        tab = .capture
    }

    func open(_ url: URL) {
        if url.scheme == "tilly", ["capture", "feed", "account"].contains(url.host() ?? "") {
            openedCat = nil
            openedProfile = nil
            showingProfile = url.host() == "account"
            if url.host() == "capture" { tab = .capture }
            if url.host() == "feed" { tab = .feed }
            return
        }
        if let userId = ProfileLink.userId(in: url) {
            showingProfile = false
            openedProfile = OpenedProfile(id: userId)
        } else if url.scheme == "tilly", url.host() == "cat", !url.lastPathComponent.isEmpty {
            showingProfile = false
            openedCat = OpenedCat(id: url.lastPathComponent)
        }
    }

}

/// The link in a user's code: `tilly://person/<id>`. The Camera app opens
/// it in Tilly, and so does Tilly's own scanner.
enum ProfileLink {
    static func url(for userId: String) -> URL {
        URL(string: "tilly://person/\(userId)")!
    }

    static func userId(in url: URL) -> String? {
        guard url.scheme == "tilly", url.host() == "person" else { return nil }
        let id = url.lastPathComponent
        return id.range(of: "^[a-z0-9]{10,40}$", options: .regularExpression) == nil ? nil : id
    }
}

struct RootView: View {
    @Environment(AppModel.self) private var model
    @State private var showingDeletionNotice = false
    @State private var inboxDestination: URL?
    @State private var signingInFromInbox = false

    var body: some View {
        @Bindable var model = model
        Group {
            if let account = model.account,
               model.circle.me != account.userId || model.circle.profileSetup != .ready {
                ProfileOnboardingView().id(account.userId)
            } else {
                tabs
            }
        }
        .tint(Theme.signal)
        .sheet(isPresented: $model.showingInbox, onDismiss: {
            // Present linked profiles/sign-in only after the inbox has dismissed.
            if let destination = inboxDestination {
                inboxDestination = nil
                model.open(destination)
            } else if signingInFromInbox {
                signingInFromInbox = false
                model.signInReason = model.config.t("inbox.signIn")
            }
        }) {
            NotificationsView(requestSignIn: {
                signingInFromInbox = true
                model.showingInbox = false
            }, openDestination: { destination in
                inboxDestination = destination
                model.showingInbox = false
            })
        }
        .sheet(isPresented: $model.showingProfile, onDismiss: {
            if model.accountDeleted { model.accountDeleted = false; showingDeletionNotice = true }
        }) { ProfileSettingsSheet().id(model.account?.userId) }
        .alert(model.config.t("account-deletion.deletedTitle"), isPresented: $showingDeletionNotice) {
            Button(model.config.t("account-deletion.done"), role: .cancel) {}
        } message: { Text(model.config.t("account-deletion.deleted")) }
        .sheet(isPresented: Binding(get: { model.signInReason != nil }, set: { if !$0 { model.signInReason = nil } })) {
            SignInSheet(reason: model.signInReason ?? "")
        }
        .sheet(item: $model.catching) { CatchSheet(flow: $0) }
        .sheet(item: $model.openedCat) { opened in
            NavigationStack {
                CatBiographyView(catId: opened.id)
                    .toolbar {
                        ToolbarItem(placement: .cancellationAction) {
                            Button(role: .close) { model.openedCat = nil }
                        }
                    }
            }
        }
        .sheet(item: $model.openedProfile) { opened in
            NavigationStack {
                PersonView(userId: opened.id)
                    .toolbar {
                        ToolbarItem(placement: .cancellationAction) {
                            Button(role: .close) { model.openedProfile = nil }
                        }
                    }
            }
        }
        .onOpenURL { model.open($0) }
    }

    private var tabs: some View {
        @Bindable var model = model
        return TabView(selection: $model.tab) {
            Tab(model.config.t("navigation.feed"), systemImage: "square.stack", value: AppTab.feed) { FeedView() }
            Tab(model.config.t("navigation.camera"), systemImage: "camera", value: AppTab.capture) { CaptureView() }
            Tab(model.config.t("navigation.map"), systemImage: "map", value: AppTab.explore) { ExploreView() }
        }
    }

}

/// Background-free navigation on the two root screens. The wordmark stays out
/// of the system bar so MapKit cannot add a blurred horizontal extension.
/// Where the system offers a side bar, it owns the profile button.
struct TillyHeader: ViewModifier {
    let title: String
    var usesVerticalBar = false
    @Environment(AppModel.self) private var model
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var hidden = false
    @State private var previousDrag: CGFloat = 0
    @State private var travel: CGFloat = 0

    func body(content: Content) -> some View {
        content
            .navigationTitle(title)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar(removing: .title)
            .toolbarVisibility(usesVerticalBar ? .automatic : .hidden, for: .navigationBar)
            .toolbarBackgroundVisibility(.hidden, for: .navigationBar)
            .toolbar {
                if usesVerticalBar {
                    ToolbarItem(placement: .topBarTrailing) { profileButton(target: nil) }
                }
            }
            .scrollEdgeEffectHidden(for: .top)
            .overlay(alignment: .top) {
                HStack {
                    Button { model.showingInbox = true } label: {
                        Wordmark(size: 27).fixedSize()
                            .overlay(alignment: .topTrailing) {
                                if model.inbox.unread > 0 {
                                    Text(model.inbox.unread > 99 ? "99+" : String(model.inbox.unread))
                                        .font(.system(size: 10, weight: .semibold))
                                        .foregroundStyle(.white)
                                        .padding(.horizontal, 4).frame(minHeight: 16)
                                        .background(.red, in: Capsule())
                                        .offset(x: 10, y: -5)
                                        .accessibilityHidden(true)
                                }
                            }
                    }
                        .accessibilityLabel(model.config.t("inbox.headerLabel", ["title": model.config.t("inbox.title")]))
                        .accessibilityValue(model.config.t("inbox.unreadCount", ["count": String(model.inbox.unread)]))
                    Spacer()
                    if !usesVerticalBar { profileButton(target: 44) }
                }
                .buttonStyle(.plain)
                .padding(.horizontal, Theme.margin)
                .frame(height: 52)
                .offset(y: hidden ? -60 : 0)
                .opacity(hidden ? 0 : 1)
                .allowsHitTesting(!hidden)
                .accessibilityHidden(hidden)
                .animation(reduceMotion ? nil : .easeOut(duration: 0.2), value: hidden)
            }
            // Observe alongside the map/feed gesture; never consume their pan.
            // Accumulation prevents small finger corrections from flickering the bar.
            .simultaneousGesture(DragGesture(minimumDistance: 12).onChanged { value in
                let delta = value.translation.height - previousDrag
                previousDrag = value.translation.height
                if (delta > 0) != (travel > 0) { travel = 0 }
                travel += delta
                if travel < -24 { hidden = true }
                if travel > 24 { hidden = false }
            }.onEnded { _ in
                previousDrag = 0
                travel = 0
            })
            .onChange(of: model.tab) { hidden = false }
    }

    /// A plain button only answers taps on its label, so the target size is
    /// set inside the label. The system toolbar sizes its own items.
    private var pendingRequests: Int { model.account == nil ? 0 : model.circle.requests.count }

    private func profileButton(target: CGFloat?) -> some View {
        Button { model.openProfile() } label: {
            Group {
                if let mine = model.circle.mine {
                    Avatar(profile: mine, size: 30)
                } else {
                    Image(systemName: "person.crop.circle").font(.title2)
                }
            }
            .overlay(alignment: .topTrailing) {
                // People waiting for an answer. Requests have no push
                // notification, so the badge is how they're noticed.
                if pendingRequests > 0 {
                    Text(pendingRequests > 99 ? "99+" : String(pendingRequests))
                        .font(.system(size: 10, weight: .semibold))
                        .foregroundStyle(.white)
                        .padding(.horizontal, 4).frame(minHeight: 16)
                        .background(.red, in: Capsule())
                        .offset(x: 8, y: -5)
                        .accessibilityHidden(true)
                }
            }
            .frame(width: target, height: target)
            .contentShape(Rectangle())
        }
        .accessibilityLabel(model.config.t(model.account == nil ? "common.signIn" : "profile.open"))
        .accessibilityValue(pendingRequests > 0 ? model.config.t("profile.requestCount", count: pendingRequests) : "")
    }
}

@available(iOS 27.1, *)
private struct AdaptiveTillyHeader: ViewModifier {
    let title: String
    @Environment(\.toolbarVerticalEdge) private var verticalEdge

    func body(content: Content) -> some View {
        content.modifier(TillyHeader(title: title, usesVerticalBar: verticalEdge != nil))
    }
}

extension View {
    @ViewBuilder
    func tillyHeader(_ title: String) -> some View {
        if #available(iOS 27.1, *) {
            modifier(AdaptiveTillyHeader(title: title))
        } else {
            modifier(TillyHeader(title: title))
        }
    }
}
