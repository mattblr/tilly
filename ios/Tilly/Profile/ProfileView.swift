import CoreLocation
import PhotosUI
import SwiftUI

/// Editing the user's profile and their settings, from the gear on their
/// profile page.
struct ProfileSettingsSheet: View {
    @Environment(AppModel.self) private var model

    var body: some View {
        NavigationStack {
            ScrollView {
                MyProfile()
                    .padding(.horizontal, Theme.margin)
                    .padding(.bottom, 24)
            }
            // The bio takes several lines, so Return can't close the
            // keyboard: a drag does, and so does Done above the keys.
            .scrollDismissesKeyboard(.interactively)
            .background(Theme.background)
            .navigationTitle(model.config.t("profile.myProfile"))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button(model.config.t("common.done")) { model.showingProfile = false }
                }
            }
        }
        .tint(Theme.signal)
    }
}

/// The user's streak and its tiers' badges, as the console sets them.
/// Tilly Premium, from the profile: what it is, or that the user has it.
/// The profile presents the paywall: this row sits in a lazy stack, which can
/// rebuild it and drop a presentation of its own (seen on an open iPhone Duo).
struct PremiumRow: View {
    let open: () -> Void
    @Environment(AppModel.self) private var model

    var body: some View {
        let t = model.config
        Button(action: open) {
            HStack(spacing: 12) {
                Ph.paintBrush.fill.frame(width: 22, height: 22).foregroundStyle(Theme.signal)
                VStack(alignment: .leading, spacing: 2) {
                    Text(t.t("premium.title")).font(.body15.weight(.semibold)).foregroundStyle(Theme.ink)
                    Text(t.t(model.art.premium ? "premium.row.have" : "premium.row.get")).font(.meta).foregroundStyle(Theme.muted)
                }
                Spacer()
                Ph.caretRight.regular.frame(width: 14, height: 14).foregroundStyle(Theme.muted)
            }
            .padding(16)
            .background(Theme.raised, in: RoundedRectangle(cornerRadius: 16))
        }
        .buttonStyle(.plain)
        .padding(.bottom, 20)
        // A grant can end while the app stays open: read it again on showing.
        .task { await model.art.reloadPremium(signedIn: model.account != nil) }
    }
}

/// The cats the user has met, newest first, and the cats they follow. A cat
/// reported near the user in the last day says so.
struct YourCats: View {
    let open: (String) -> Void
    /// Opens Tilly Premium's paywall, which the profile presents.
    var openPremium: () -> Void = {}
    /// The cats met and catches saved, for the profile's counts.
    var counted: (_ cats: Int, _ catches: Int) -> Void = { _, _ in }

    struct MetCat: Identifiable {
        let catId: String
        let name: String
        let timesMet: Int
        var photo: URL?
        var thumbnail: URL?
        var seenAt: Date?
        var nearYou = false
        var id: String { catId }
    }

    @Environment(AppModel.self) private var model
    @State private var cats: [MetCat]?
    @State private var followed: [MetCat] = []
    @State private var catches = 0
    @State private var failure: String?

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            PremiumRow(open: openPremium)
            if let cats, let lead = cats.first {
                row(lead)
                Button { open(lead.catId) } label: {
                    Color.clear
                        .frame(height: 300)
                        .overlay { CatPhoto(url: lead.photo) }
                        .clipShape(RoundedRectangle(cornerRadius: Theme.photoCorner))
                }
                .buttonStyle(.plain)
                HStack {
                    Text(lead.name).font(.sectionTitle)
                    Spacer()
                    Text(model.config.t(lead.timesMet == 1 ? "profile.cats.metOnce" : "profile.cats.metMany", ["met": "\(lead.timesMet)"])).font(.meta).foregroundStyle(Theme.muted)
                }
                .padding(.top, 10)
                if cats.count > 1 {
                    Text(model.config.t("profile.familiar")).font(.sectionTitle).padding(.top, 20)
                    ForEach(cats.dropFirst()) { row($0) }
                }
            } else if cats != nil {
                Text(model.config.t("profile.cats.emptyTitle")).font(.sectionTitle)
                Text(model.config.t("profile.cats.emptyBody")).font(.meta).foregroundStyle(Theme.muted).padding(.top, 4)
                Button(model.config.t("catch.title")) { model.catchCat() }
                    .buttonStyle(.primary)
                    .padding(.top, 14)
            } else if let failure {
                Text(model.config.failureText(failure)).font(.meta).foregroundStyle(Theme.muted)
            } else {
                Loading(label: model.config.t("profile.loadingCats"))
            }

            if !followed.isEmpty {
                Text(model.config.t("profile.following")).font(.sectionTitle).padding(.top, 24)
                Text(model.config.t("profile.followedCatsHint")).font(.meta).foregroundStyle(Theme.muted).padding(.top, 2)
                ForEach(followed) { row($0) }
            }
        }
        .loadWhenChanged(id: "\(model.account?.userId ?? "")|\(model.catchesSaved)|\(model.circle.followedCats.sorted().joined(separator: ","))") { await load() }
    }

    private func row(_ cat: MetCat) -> some View {
        Button { open(cat.catId) } label: {
            HStack(spacing: 12) {
                CatPhoto(url: cat.thumbnail)
                    .frame(width: 64, height: 64)
                    .clipShape(RoundedRectangle(cornerRadius: Theme.photoCorner))
                VStack(alignment: .leading, spacing: 2) {
                    Text(cat.name).font(.body15.weight(.semibold))
                    if let seenAt = cat.seenAt {
                        Text(model.config.t(cat.nearYou ? "profile.cats.nearYou" : "profile.cats.lastSpotted", ["when": Recency.long(since: seenAt, copy: model.config)]))
                            .font(.meta)
                            .foregroundStyle(cat.nearYou ? Theme.signal : Theme.muted)
                    }
                }
                Spacer()
                Icon(icon: .caretRight).foregroundStyle(Theme.muted)
            }
            .padding(.vertical, 15)
            .overlay(alignment: .bottom) { Rectangle().fill(Theme.rule).frame(height: 1) }
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }

    private func load() async {
        let viewer = model.account?.userId, revision = model.catchesSaved
        guard viewer != nil else { cats = nil; followed = []; catches = 0; failure = nil; return }
        failure = nil
        do {
            let foir = model.foir
            async let streaks: Void = model.streaks.reload(signedIn: model.account != nil)
            // Every tag of the user's catches, a page at a time: a catch past the
            // first hundred still counts towards how often they've met its cat.
            let tags = try await Paging.all { after in
                let page = try await foir.fetch(FoirAPI.MyTaggedCatsQuery(after: .maybe(after))).myCaptureCatTags
                return (page.edges.map(\.node), page.pageInfo.fragments.more)
            }
            var order: [String] = []
            var met: [String: (name: String, count: Int)] = [:]
            var captured = Set<String>()
            for tag in tags {
                guard let cat = tag.cat, let capture = tag.capture, capture.state == "ready", capture.tagRevision == tag.revision, capture._ownerId == tag._ownerId else { continue }
                captured.insert(capture._id)
                if met[cat._id] == nil { order.append(cat._id) }
                met[cat._id, default: (cat.name ?? model.config.t("cat.unnamed"), 0)].count += 1
            }
            let nextCatches = captured.count
            let followedIds = model.circle.followedCats.subtracting(order)
            let latest = try await Sightings.latest(of: order + followedIds, foir: foir, copy: model.config)
            // Near-you is worked out on the phone, from where it is now, by the
            // distance and window the console sets.
            let here = try? await Location.current(timeout: .seconds(3))
            let settings = model.config.settings

            func filled(_ catId: String, name: String, timesMet: Int) -> MetCat {
                var cat = MetCat(catId: catId, name: latest[catId]?.name ?? name, timesMet: timesMet)
                guard let seen = latest[catId] else { return cat }
                cat.photo = seen.photo
                cat.thumbnail = seen.thumbnail
                cat.seenAt = seen.seenAt
                if let here, Date.now.timeIntervalSince(seen.seenAt) < TimeInterval(settings.nearYouHours) * 3600 {
                    let distance = CLLocation(latitude: seen.coordinate.latitude, longitude: seen.coordinate.longitude)
                        .distance(from: CLLocation(latitude: here.latitude, longitude: here.longitude))
                    cat.nearYou = distance <= CLLocationDistance(settings.nearYouMeters)
                }
                return cat
            }
            let nextCats = order.map { filled($0, name: met[$0]!.name, timesMet: met[$0]!.count) }
            let nextFollowed = followedIds.sorted().map { filled($0, name: model.config.t("cat.unnamed"), timesMet: 0) }
            _ = await streaks
            // Counts and photos belong to the same viewer and capture revision.
            guard !Task.isCancelled, viewer == model.account?.userId, revision == model.catchesSaved else { return }
            cats = nextCats
            followed = nextFollowed
            catches = nextCatches
            counted(nextCats.count, nextCatches)
        } catch {
            guard !Task.isCancelled, viewer == model.account?.userId, revision == model.catchesSaved else { return }
            failure = UserFailure.key(error)
        }
    }
}

/// A user's followers, or the people they follow. The signed-in user's own
/// followers come with the requests waiting for an answer, and their following
/// with a search to find more and codes for someone standing next to you.
/// Another user's lists show what the viewer may see of them.
struct PeopleList: View {
    enum Kind: Hashable {
        case followers(String), following(String)
        var isFollowers: Bool { if case .followers = self { true } else { false } }
        var userId: String { switch self { case .followers(let id), .following(let id): id } }
    }
    let kind: Kind
    let open: (String) -> Void

    @Environment(AppModel.self) private var model
    @State private var search = ""
    @State private var found: Paged<Profile>?
    @State private var showingCode = false
    @State private var scanning = false
    @State private var theirs: [String]?
    @State private var answering: String?
    @State private var failure: String?

    private var isMine: Bool { kind.userId == model.account?.userId }
    private var mineFollowing: Bool { isMine && !kind.isFollowers }
    private var people: [String] {
        let circle = model.circle
        let ids = isMine ? (kind.isFollowers ? circle.followers : circle.following) : Set(theirs ?? [])
        return ids.sorted { circle.name(of: $0) < circle.name(of: $1) }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            if isMine, kind.isFollowers, !model.circle.requests.isEmpty { requests }
            if mineFollowing { finding }
            if mineFollowing, let found, !search.isEmpty {
                if found.started, found.rows.isEmpty {
                    Text(model.config.t("profile.peopleEmpty")).font(.meta).foregroundStyle(Theme.muted).padding(.top, 14)
                }
                ForEach(found.rows.filter { $0.userId != model.account?.userId }) { profile in
                    row(profile.userId).task { await found.reached(profile) }
                }
                if found.loading { LoadingMore() }
                if let failure = found.failure {
                    Text(model.config.failureText(failure)).font(.meta).foregroundStyle(Theme.muted)
                    Button(model.config.t("common.retry")) { Task { await found.loadMore() } }.buttonStyle(.plainAction)
                }
            } else if !isMine, theirs == nil {
                Loading(minHeight: 120)
            } else if people.isEmpty {
                Text(model.config.t(kind.isFollowers ? "profile.followersEmpty" : "profile.followingEmpty")).font(.sectionTitle).padding(.top, 20)
                if mineFollowing {
                    Text(model.config.t("profile.friendsEmptyHint")).font(.meta).foregroundStyle(Theme.muted).padding(.top, 4)
                }
            } else {
                ForEach(people, id: \.self) { row($0, removable: isMine && kind.isFollowers) }
            }
        }
        .task(id: kind) { await loadTheirs() }
        .sheet(isPresented: $showingCode) { MyCodeSheet() }
        .sheet(isPresented: $scanning) {
            ScanCodeSheet { userId in
                scanning = false
                open(userId)
            }
        }
        .task(id: search) {
            let prefix = search.trimmingCharacters(in: .whitespaces).replacingOccurrences(of: "@", with: "").lowercased()
            guard mineFollowing, prefix.count >= 2 else {
                found = nil
                return
            }
            try? await Task.sleep(for: .milliseconds(250))
            guard !Task.isCancelled else { return }
            let foir = model.foir, circle = model.circle, me = model.account?.userId
            let list = Paged<Profile> { after in
                let page = try await foir.fetch(FoirAPI.FindProfilesQuery(prefix: .some(prefix), after: .maybe(after))).profiles
                let profiles = page.edges.compactMap { Profile($0.node.fragments.profileFields) }.filter { $0.userId != me }
                await circle.load(profilesOf: profiles.map(\.userId))
                return (profiles, page.pageInfo.fragments.more.next)
            }
            found = list
            await list.reload()
        }
    }

    /// Codes and a username search, to find people to follow.
    private var finding: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text(model.config.t("profile.people.intro"))
                .font(.meta)
                .foregroundStyle(Theme.muted)
            HStack(spacing: 9) {
                Button { showingCode = true } label: { Label(model.config.t("profile.code.title"), systemImage: "qrcode") }
                    .buttonStyle(.secondary)
                Button { scanning = true } label: { Label(model.config.t("profile.code.scan"), systemImage: "qrcode.viewfinder") }
                    .buttonStyle(.secondary)
            }
            .padding(.top, 14)
            TextField(model.config.t("profile.findPeople"), text: $search)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
                .padding(12)
                .frame(minHeight: 46)
                .background(Theme.raised, in: RoundedRectangle(cornerRadius: 10))
                .padding(.top, 12)
        }
    }

    /// Another user's list, as far as the viewer may read it.
    private func loadTheirs() async {
        guard !isMine else { return }
        let foir = model.foir, id = kind.userId, followers = kind.isFollowers
        let ids = try? await Paging.all { after in
            if followers {
                let page = try await foir.fetch(FoirAPI.FollowersOfQuery(user: .some(id), after: .maybe(after))).followApprovals
                return (page.edges.compactMap(\.node.followerId), page.pageInfo.fragments.more)
            }
            let page = try await foir.fetch(FoirAPI.FollowingOfQuery(userText: .some(id), after: .maybe(after))).followApprovals
            return (page.edges.compactMap(\.node._ownerId), page.pageInfo.fragments.more)
        }
        let shown = (ids ?? []).filter { !model.circle.blocked.contains($0) }
        await model.circle.load(profilesOf: shown)
        theirs = shown
    }

    /// People asking to follow the user, to accept or decline.
    private var requests: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text(model.config.t("profile.requests")).font(.sectionTitle).padding(.top, 8)
            ForEach(model.circle.requests, id: \.self) { userId in
                let name = model.circle.name(of: userId)
                HStack(spacing: 10) {
                    Button { open(userId) } label: {
                        HStack(spacing: 12) {
                            Avatar(profile: model.circle.profiles[userId], size: 35)
                            Text(name).font(.body15.weight(.semibold)).lineLimit(1)
                            Spacer(minLength: 0)
                        }
                        .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                    Button(model.config.t("profile.accept")) { reply(userId, .accept) }
                        .buttonStyle(.primary).frame(width: 96)
                        .accessibilityLabel(model.config.t("profile.acceptLabel", ["name": name]))
                    Button(model.config.t("profile.decline")) { reply(userId, .decline) }
                        .buttonStyle(.secondary).frame(width: 96)
                        .accessibilityLabel(model.config.t("profile.declineLabel", ["name": name]))
                }
                .disabled(answering != nil)
                .padding(.vertical, 10)
                .overlay(alignment: .bottom) { Rectangle().fill(Theme.rule).frame(height: 1) }
            }
            if let failure { Text(model.config.failureText(failure)).font(.meta).foregroundStyle(.red).padding(.top, 6) }
        }
        .padding(.bottom, 20)
    }

    private func reply(_ userId: String, _ answer: Foir.FollowerReply) {
        answering = userId
        failure = nil
        Task {
            do { try await model.circle.answer(userId, answer) } catch { failure = UserFailure.key(error) }
            answering = nil
        }
    }

    private func row(_ userId: String, removable: Bool = false) -> some View {
        let circle = model.circle
        let username = circle.profiles[userId]?.username ?? ""
        return HStack(spacing: 12) {
            Button { open(userId) } label: {
                HStack(spacing: 12) {
                    Avatar(profile: circle.profiles[userId], size: 35)
                    VStack(alignment: .leading, spacing: 1) {
                        Text(circle.name(of: userId)).font(.body15.weight(.semibold))
                        if !username.isEmpty { Text("@\(username)").font(.meta).foregroundStyle(Theme.muted) }
                    }
                    Spacer()
                }
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            if userId != model.account?.userId { FollowUserButton(userId: userId).frame(width: 120) }
            if removable {
                Menu {
                    Button(model.config.t("profile.removeFollower"), role: .destructive) { reply(userId, .remove) }
                } label: {
                    Image(systemName: "ellipsis").frame(width: 44, height: 44).contentShape(Rectangle())
                }
                .accessibilityLabel(model.config.t("profile.removeFollowerLabel", ["name": circle.name(of: userId)]))
            }
        }
        .padding(.vertical, 10)
        .overlay(alignment: .bottom) { Rectangle().fill(Theme.rule).frame(height: 1) }
    }
}

/// Uses the same profile editor and persisted Fóir profile as the web welcome page.
struct ProfileOnboardingView: View {
    @Environment(AppModel.self) private var model

    private var waiting: Bool {
        model.circle.me != model.account?.userId || model.circle.profileSetup == .loading
    }

    var body: some View {
        Group {
            if waiting {
                ProgressView()
                    .controlSize(.regular)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                ScrollView {
                    VStack(alignment: .leading, spacing: 0) {
                        Wordmark().padding(.top, 20)
                        ScreenTitle(title: model.config.t("profile.welcome"), subtitle: model.config.t("profile.onboardingHint"))
                            .padding(.bottom, 20)
                        switch model.circle.profileSetup {
                        case .loading, .ready:
                            EmptyView()
                        case .failed(let failure):
                            Text(model.config.failureText(failure)).foregroundStyle(.red)
                            Button(model.config.t("common.retry")) { Task { await model.circle.refreshMine() } }
                                .buttonStyle(.primary).padding(.top, 16)
                        case .needsProfile:
                            MyProfile(onboarding: true)
                        }
                        Button(model.config.t("profile.signOut"), role: .destructive) {
                            Task { await model.foir.signOut() }
                        }
                        .buttonStyle(.plainAction).padding(.top, 24)
                    }
                    .frame(maxWidth: 560)
                    .padding(.horizontal, Theme.margin)
                    .padding(.bottom, 24)
                    .frame(maxWidth: .infinity)
                }
                .scrollDismissesKeyboard(.interactively)
            }
        }
        .background(Theme.background)
        .tint(Theme.signal)
    }
}

/// The photo, name, username and bio other users see, saved on an explicit
/// Save.
private struct MyProfile: View {
    var onboarding = false
    @Environment(AppModel.self) private var model
    @State private var displayName = ""
    @State private var username = ""
    @State private var bio = ""
    @State private var choosingPhoto = false
    @State private var picking: PhotosPickerItem?
    @State private var picked: UIImage?
    @State private var removingPhoto = false
    @State private var privacy: Foir.Privacy = .public
    @State private var working = false
    @State private var message: (text: String, ok: Bool)?

    /// The side of a profile photo as it's uploaded.
    static let photoSide: CGFloat = 600

    private var hasPhoto: Bool { picked != nil || (model.circle.mine?.photo != nil && !removingPhoto) }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(spacing: 15) {
                Button { choosingPhoto = true } label: {
                    Avatar(
                        initial: displayName.first.map { String($0).uppercased() } ?? "?",
                        seed: model.circle.mine?.userId ?? model.account?.userId ?? "unknown",
                        photo: removingPhoto ? nil : model.circle.mine?.photo,
                        picked: picked,
                        size: 76
                    )
                    .overlay(alignment: .bottomTrailing) {
                        Image(systemName: "camera.fill")
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundStyle(Theme.onSignal)
                            .frame(width: 26, height: 26)
                            .background(Theme.signal, in: Circle())
                            .overlay(Circle().stroke(Theme.background, lineWidth: 2))
                    }
                }
                .buttonStyle(.plain)
                .photosPicker(isPresented: $choosingPhoto, selection: $picking, matching: .images)
                .accessibilityLabel(hasPhoto ? model.config.t("profile.photo.change") : model.config.t("profile.photo.add"))
                VStack(alignment: .leading, spacing: 4) {
                    Text(displayName.isEmpty ? model.config.t("profile.namePlaceholder") : displayName).font(.sectionTitle)
                    Text(username.isEmpty ? model.config.t("profile.usernamePreview") : "@\(username)").font(.meta).foregroundStyle(Theme.muted)
                    if hasPhoto {
                        Button(model.config.t("profile.photo.remove")) {
                            picked = nil
                            picking = nil
                            removingPhoto = true
                        }
                        .font(.meta)
                        .foregroundStyle(Theme.muted)
                    }
                }
            }
            .padding(.top, 6)
            .padding(.bottom, 20)

            field(model.config.t("profile.displayName"), text: $displayName, prompt: model.config.t("profile.namePlaceholder")).textContentType(.nickname)
            field(model.config.t("profile.username"), text: $username, prompt: model.config.t("profile.usernamePlaceholder"))
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
            Text(model.config.t("profile.bio")).font(.meta).padding(.top, 15).padding(.bottom, 7)
            TextField(model.config.t("profile.bioPlaceholder"), text: $bio, axis: .vertical)
                .lineLimit(3...5)
                .toolbar {
                    ToolbarItemGroup(placement: .keyboard) {
                        Spacer()
                        Button(model.config.t("common.done")) {
                            UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
                        }
                    }
                }
                .padding(12)
                .background(Theme.raised, in: RoundedRectangle(cornerRadius: 10))
                .overlay(RoundedRectangle(cornerRadius: 10).stroke(Theme.rule, lineWidth: 1))
            Text(model.config.t("profile.publicDetailsHint")).font(.meta).foregroundStyle(Theme.muted).padding(.top, 8)

            // Public, or private: catches only for the followers you accept,
            // and following you becomes a request.
            Toggle(isOn: Binding(get: { privacy == .private }, set: { privacy = $0 ? .private : .public })) {
                Text(model.config.t("profile.privacy.title")).font(.body15.weight(.semibold))
            }
            .tint(Theme.signal)
            .frame(minHeight: 44)
            .padding(.top, 18)
            Text(model.config.t("profile.privacy.\(privacy.rawValue)") + " " + model.config.t("profile.privacy.applies"))
                .font(.meta)
                .foregroundStyle(Theme.muted)
                .padding(.top, 4)

            VStack(alignment: .leading, spacing: 8) {
                Picker(model.config.t("profile.language"), selection: Binding(get: {
                    model.config.locale ?? model.config.locales.first(where: { $0.isDefault })?.code ?? ""
                }, set: { code in Task { await model.config.selectLocale(code) } })) {
                    if model.config.locales.isEmpty { Text(model.config.t("profile.languageDefault")).tag("") }
                    ForEach(model.config.locales) { locale in Text(locale.label).tag(locale.code) }
                }
                if let failure = model.config.localeFailure {
                    Text(model.config.failureText(failure)).font(.meta).foregroundStyle(Theme.muted)
                    Button(model.config.t("common.retry")) { Task { await model.config.reload() } }
                }
            }
            .padding(.vertical, 20)

            Button(model.config.t(onboarding ? "profile.startExploring" : "profile.save")) { save() }
                .buttonStyle(.primary)
                .disabled(working)
                .padding(.top, 21)
            if working {
                RoaringCat(size: 44).frame(maxWidth: .infinity).padding(.top, 10)
            } else if let message {
                Text(message.text).font(.meta).foregroundStyle(message.ok ? Theme.signal : .red).padding(.top, 10)
            }

            if !onboarding {
                Rectangle().fill(Theme.rule).frame(height: 1).padding(.vertical, 24)
                NotificationSettingsView()
                AppearanceSettingsView()
                BlockedAccountsSettings()
                HStack(spacing: 20) {
                    Link(model.config.t("premium.terms"), destination: FoirConfig.terms)
                    Link(model.config.t("premium.privacy"), destination: FoirConfig.privacy)
                }
                .font(.meta)
                .padding(.vertical, 20)
                Text(model.config.t("profile.signedInAs")).font(.meta).foregroundStyle(Theme.muted)
                Text(model.account?.email ?? "").font(.body15).padding(.top, 2)
                Button(model.config.t("profile.signOut"), role: .destructive) {
                    model.showingProfile = false
                    Task { await model.foir.signOut() }
                }
                .buttonStyle(.secondary)
                .padding(.top, 14)
                DeleteAccountView()
            }
        }
        .sensoryFeedback(.success, trigger: message?.ok == true) { _, now in now }
        .onAppear {
            guard let mine = model.circle.mine, displayName.isEmpty else { return }
            displayName = mine.displayName
            username = mine.username
            bio = mine.bio
            privacy = mine.privacy
        }
        .onChange(of: picking) {
            guard let picking else { return }
            Task {
                if let data = try? await picking.loadTransferable(type: Data.self), let image = UIImage(data: data) {
                    picked = Self.squared(image)
                    removingPhoto = false
                }
            }
        }
    }

    private func field(_ label: String, text: Binding<String>, prompt: String) -> some View {
        VStack(alignment: .leading, spacing: 7) {
            Text(label).font(.meta)
            TextField(prompt, text: text)
                .padding(12)
                .frame(minHeight: 46)
                .background(Theme.raised, in: RoundedRectangle(cornerRadius: 10))
                .overlay(RoundedRectangle(cornerRadius: 10).stroke(Theme.rule, lineWidth: 1))
        }
        .padding(.top, 15)
    }

    /// The middle square of a photo, at the size a profile photo needs.
    static func squared(_ image: UIImage) -> UIImage {
        let side = min(image.size.width, image.size.height)
        let target = CGSize(width: min(side, photoSide), height: min(side, photoSide))
        let format = UIGraphicsImageRendererFormat()
        format.scale = 1
        return UIGraphicsImageRenderer(size: target, format: format).image { _ in
            let scale = target.width / side
            let drawn = CGSize(width: image.size.width * scale, height: image.size.height * scale)
            image.draw(in: CGRect(x: (target.width - drawn.width) / 2, y: (target.height - drawn.height) / 2, width: drawn.width, height: drawn.height))
        }
    }

    private func save() {
        let name = displayName.trimmingCharacters(in: .whitespaces)
        let handle = username.trimmingCharacters(in: .whitespaces).replacingOccurrences(of: "@", with: "").lowercased()
        let about = bio.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !name.isEmpty else { return message = (model.config.t("profile.nameRequired"), false) }
        guard handle.range(of: "^[a-z0-9_]{2,30}$", options: .regularExpression) != nil else {
            return message = (model.config.t("profile.usernameRules"), false)
        }
        guard about.count <= 160 else { return message = (model.config.t("profile.bioLimit"), false) }
        working = true
        message = nil
        let userID = model.account?.userId
        Task {
            do {
                let identity = await model.foir.tokens.identity
                guard let userID, identity.userId == userID else { throw FoirError(message: "The signed-in account changed.", code: nil) }
                var fileId: String?
                if let picked, let jpeg = picked.jpegData(compressionQuality: 0.85) {
                    fileId = try await model.foir.upload(jpeg: jpeg, filename: "profile.jpg", ifIdentity: identity)
                }
                try await model.foir.saveProfile(
                    displayName: name,
                    username: handle,
                    bio: about,
                    photoFileId: fileId,
                    removePhoto: removingPhoto && fileId == nil,
                    privacy: privacy,
                    ifIdentity: identity
                )
                guard model.account?.userId == userID else { return }
                // First-time setup ends by asking about breed suggestions, once.
                if onboarding { model.appearanceChoiceFor = userID }
                await model.circle.refreshMine()
                guard model.account?.userId == userID else { return }
                username = handle
                picked = nil
                picking = nil
                removingPhoto = false
                message = (model.config.t("profile.saved"), true)
            } catch {
                message = (model.config.failureText(UserFailure.key(error)), false)
            }
            working = false
        }
    }
}
