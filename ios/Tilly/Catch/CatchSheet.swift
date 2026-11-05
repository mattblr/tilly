import SwiftUI

/// A catch, over the camera: each step to the reveal, where the user can
/// add what they noticed, share it or open the cat's page. Finishing a saved
/// catch saves any note and opens the feed, where the new post is; "Catch
/// another" and an unsaved catch go back to the viewfinder, which never left.
struct CatchSheet: View {
    let flow: CatchFlow

    @Environment(AppModel.self) private var model
    @State private var path: [Route] = []
    @State private var finishing = false
    @State private var finishFailure: String?

    enum Route: Hashable {
        case cat(String)
        case share(String)
    }

    var body: some View {
        NavigationStack(path: $path) {
            CatchStepView(flow: flow, route: { path.append($0) }, done: { finish(toFeed: $0) })
                .background(Theme.background)
                .navigationTitle(model.config.t("catch.sheetTitle"))
                .navigationBarTitleDisplayMode(.inline)
                .toolbar(removing: .title)
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) {
                        Button(role: .close) { finish(toFeed: flow.isRevealed) }
                            .disabled(flow.isWorking || finishing)
                    }
                }
                .navigationDestination(for: Route.self) { route in
                    switch route {
                    case .cat(let catId):
                        CatBiographyView(catId: catId)
                    case .share(let catId):
                        if case .revealed(let reveal) = flow.step, reveal.catId == catId {
                            ShareCardView(story: .init(catName: reveal.name, photo: .local(flow.photo), quote: Self.quote(for: reveal, config: model.config), area: nil))
                        }
                    }
                }
        }
        .disabled(finishing)
        .overlay { if finishing { ProgressView(model.config.t("observe.finishing")).padding().background(Theme.background, in: RoundedRectangle(cornerRadius: 12)) } }
        .interactiveDismissDisabled(flow.isWorking || flow.isRevealed || finishing)
        .safeAreaInset(edge: .bottom) {
            if let finishFailure {
                VStack(spacing: 8) {
                    Text(model.config.failureText(finishFailure)).font(.meta).foregroundStyle(.red)
                    Button(model.config.t("errors.retry")) { finish(toFeed: flow.isRevealed) }.buttonStyle(.secondary)
                }.padding().background(Theme.background)
            }
        }
        .onChange(of: flow.isRevealed) {
            guard flow.isRevealed else { return }
            model.caught()
            Task { await model.streaks.reload(signedIn: true) }
            // A first catch of a cat follows it. A later catch leaves the
            // user's choice alone, so a cat they unfollowed stays unfollowed.
            if case .revealed(let reveal) = flow.step, let catcher = flow.identity?.userId, catcher == model.account?.userId {
                let cats = [reveal.catId] + reveal.otherCats.map(\.catId)
                Task {
                    for cat in cats where model.account?.userId == catcher && !model.circle.followedCats.contains(cat) {
                        // The new catch is already one of the user's own; an unreadable count follows nothing.
                        let catches = (try? await TaggedCaptures.count(catId: cat, mine: true, foir: model.foir)) ?? 2
                        guard catches <= 1, model.account?.userId == catcher else { continue }
                        try? await model.circle.setFollowingCat(cat, true)
                    }
                }
            }
        }
    }

    /// Saves what the user noticed, if anything, and closes the capture's
    /// note boundary. A note typed and then left with Close or "Catch
    /// another" is kept, not dropped. `toFeed` opens the feed afterwards.
    private func finish(toFeed: Bool) {
        guard !finishing else { return }
        finishing = true; finishFailure = nil
        Task {
            do {
                try await flow.saveNote()
                try await flow.finalize()
                model.catching = nil
                if toFeed { model.tab = .feed }
            } catch { finishFailure = UserFailure.key(error) }
            finishing = false
        }
    }

    /// The card quotes the user's own moment with the cat.
    static func quote(for reveal: CatchFlow.Reveal, config: AppConfig) -> String {
        config.t("reveal.quote.\(reveal.kind.key)", ["catches": "\(reveal.catches)", "met": "\(reveal.timesMet)"])
    }
}

extension CatchFlow {
    var isRevealed: Bool {
        if case .revealed = step { true } else { false }
    }
}

extension CatchFlow.Reveal.Kind {
    /// The kind's name in the app's copy keys.
    var key: String {
        switch self {
        case .discovery: "discovery"
        case .firstMeeting: "firstMeeting"
        case .again: "again"
        }
    }
}

/// Each step of a catch, from looking at the photo to the reveal.
private struct CatchStepView: View {
    let flow: CatchFlow
    let route: (CatchSheet.Route) -> Void
    /// Ends the catch; `true` opens the feed afterwards.
    let done: (Bool) -> Void
    @Environment(AppModel.self) private var model

    private func t(_ key: String, _ values: [String: String] = [:]) -> String { model.config.t(key, values) }

    var body: some View {
        ScrollView(.vertical, showsIndicators: true) {
            VStack(alignment: .leading, spacing: 0) {
                switch flow.step {
                case .looking:
                    working(t("catch.looking"))
                case .noCat:
                    noCat
                case .matching:
                    working(t("catch.matching"))
                case .tagging:
                    tagging
                case .saving:
                    working(t("catch.saving"))
                case .revealed(let reveal):
                    RevealView(flow: flow, reveal: reveal, route: route, done: done)
                case .failed(let reason):
                    failed(reason)
                }
            }
            .padding(.horizontal, Theme.margin)
            .padding(.bottom, 24)
            // Tapping anywhere off a text field puts the keyboard away.
            .contentShape(Rectangle())
            .onTapGesture { UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil) }
        }
        .scrollDismissesKeyboard(.interactively)
        .sensoryFeedback(.success, trigger: flow.isRevealed) { _, now in now }
    }

    private var yourPhoto: some View {
        Image(uiImage: flow.photo)
            .resizable()
            .scaledToFill()
            .frame(maxWidth: .infinity)
            .frame(height: 300)
            .clipShape(RoundedRectangle(cornerRadius: Theme.photoCorner))
    }

    private func working(_ label: String) -> some View {
        VStack(alignment: .leading, spacing: 16) {
            ScreenTitle(title: label)
            yourPhoto
            RoaringCat(size: 72).frame(maxWidth: .infinity)
        }
    }

    private var tagging: some View {
        VStack(alignment: .leading, spacing: 18) {
            ScreenTitle(title: t("capture-tags.title"))
            // Fit the full photo into a bounded viewport. Marker geometry
            // follows the fitted image, excluding surrounding letterboxing.
            GeometryReader { viewport in
                let aspect = max(flow.photo.size.width, 1) / max(flow.photo.size.height, 1)
                let width = min(viewport.size.width, 300 * aspect)
                Image(uiImage: flow.photo)
                .resizable()
                .frame(width: width, height: width / aspect)
                .overlay {
                    GeometryReader { image in
                        ForEach(Array(flow.tags.enumerated()), id: \.element.id) { index, tag in
                            if let box = tag.bounds {
                                Text("\(index + 1)").font(.caption.bold())
                                    .frame(width: 28, height: 28).background(Theme.signal, in: Circle())
                                    .position(x: box.midX * image.size.width, y: box.midY * image.size.height)
                                    .accessibilityHidden(true)
                            }
                        }
                    }
                }
                .clipShape(RoundedRectangle(cornerRadius: Theme.photoCorner))
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
            .frame(height: 300)
            ForEach(Array(flow.tags.enumerated()), id: \.element.id) { index, tag in
                VStack(alignment: .leading, spacing: 12) {
                    HStack {
                        Text(t("capture-tags.row", ["number": String(index + 1)])).font(.sectionTitle)
                        Spacer()
                        Button(t("capture-tags.remove", ["number": String(index + 1)]), systemImage: "xmark") { flow.removeTag(tag.id) }
                            .labelStyle(.iconOnly).frame(minWidth: 44, minHeight: 44)
                            .disabled(flow.tags.count == 1)
                            .accessibilityLabel(t("capture-tags.remove", ["number": String(index + 1)]))
                    }
                    Picker(t("capture-tags.choose", ["number": String(index + 1)]), selection: Binding(get: { tag.catId ?? "new" }, set: { flow.setTag(tag.id, catId: $0 == "new" ? nil : $0) })) {
                        Text(t("capture-tags.new")).tag("new")
                        ForEach(tag.candidates) { candidate in
                            Text(candidate.name).tag(candidate.catId)
                                .disabled(flow.tags.contains { $0.id != tag.id && $0.catId == candidate.catId })
                        }
                    }.pickerStyle(.menu)
                    if tag.catId == nil {
                        TextField(t("capture-tags.name"), text: Binding(get: { tag.name }, set: { flow.setTag(tag.id, name: String($0.prefix(60))) }))
                            .textFieldStyle(.roundedBorder)
                            .accessibilityLabel(t("capture-tags.nameLabel", ["number": String(index + 1)]))
                    }
                }
                .padding(16).background(Theme.raised, in: RoundedRectangle(cornerRadius: 12))
            }
            Button(t("capture-tags.add"), systemImage: "plus") { flow.addTag() }
                .buttonStyle(.secondary).disabled(flow.tags.count >= 8)
            Button(t("capture-tags.savePhoto")) { flow.confirmTags() }.buttonStyle(.primary)
                .disabled(flow.tags.contains { $0.catId == nil && $0.name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty })
        }
    }

    private var noCat: some View {
        VStack(alignment: .leading, spacing: 14) {
            ScreenTitle(title: t("catch.noCat.title"), subtitle: t("catch.noCat.subtitle"))
            yourPhoto
            Button(t("catch.retake")) { done(false) }.buttonStyle(.primary)
            if flow.canTagMissedCats {
                Text(t("catch.tagMissedCatsHint")).font(.meta).foregroundStyle(Theme.muted)
                Button(t("catch.tagMissedCats"), action: flow.tagMissedCats).buttonStyle(.secondary)
            }
        }
    }

    private func failed(_ reason: String) -> some View {
        VStack(alignment: .leading, spacing: 14) {
            ScreenTitle(title: t("catch.failed.title"), subtitle: model.config.failureText(reason))
            yourPhoto
            Button(t("errors.retry"), action: flow.retry).buttonStyle(.primary)
            Button(t("catch.startOver")) { done(false) }.buttonStyle(.plainAction)
        }
    }
}

/// The moment a catch is saved: a new cat, a first meeting, or an old friend,
/// the streak it keeps going, and what the user noticed.
private struct RevealView: View {
    let flow: CatchFlow
    let reveal: CatchFlow.Reveal
    let route: (CatchSheet.Route) -> Void
    let done: (Bool) -> Void

    @Environment(AppModel.self) private var model

    var body: some View {
        VStack(spacing: 0) {
            Text(kicker).font(.meta).foregroundStyle(Theme.muted).padding(.top, 12)
            Text(headline)
                .font(.system(size: 31, weight: .semibold))
                .kerning(-0.7)
                .multilineTextAlignment(.center)
                .padding(.top, 12)
            Text(subline).font(.meta).foregroundStyle(Theme.muted).multilineTextAlignment(.center).padding(.top, 8)
            Image(uiImage: flow.photo)
                .resizable()
                .scaledToFill()
                .frame(maxWidth: .infinity)
                .frame(height: 315)
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .padding(.vertical, 20)
            Text(tally).font(.meta).foregroundStyle(Theme.muted)
            StreakLine().padding(.top, 12)
            if reveal.photoKey != nil {
                CatchNoteSection(flow: flow).padding(.top, 24)
                Button(t("observe.save")) { done(true) }
                    .buttonStyle(.primary)
                    .disabled(!flow.hasNote)
                    .padding(.top, 14)
            }
            HStack(spacing: 9) {
                Button(t("reveal.view")) { route(.cat(reveal.catId)) }.buttonStyle(.secondary)
                ForEach(reveal.otherCats) { cat in
                    Button(model.config.t("reveal.viewNamed", ["name": cat.name])) { route(.cat(cat.catId)) }.buttonStyle(.secondary)
                }
                Button { route(.share(reveal.catId)) } label: {
                    Label { Text(t("common.share")) } icon: { Icon(icon: .export) }
                }
                .buttonStyle(.secondary)
            }
            .padding(.top, 17)
            Button(t("reveal.another")) { done(false) }.buttonStyle(.plainAction).padding(.top, 8)
        }
        .frame(maxWidth: .infinity)
    }

    private func t(_ key: String) -> String {
        model.config.t(key, ["name": reveal.name, "catches": "\(reveal.catches)", "met": "\(reveal.timesMet)"])
    }

    private var kicker: String { t("reveal.kicker.\(reveal.kind.key)") }
    private var headline: String { t("reveal.headline.\(reveal.kind.key)") }
    // The user made a new cat's identity; matching can't promise it is the
    // first time anyone has met it, so the copy says "name", not "meet".
    private var subline: String { t("reveal.subline.\(reveal.kind.key)") }
    private var tally: String { t("reveal.tally.\(reveal.kind.key)") }
}

/// "4 days in a row", and a tier the catch just reached.
struct StreakLine: View {
    @Environment(AppModel.self) private var model

    var body: some View {
        let streaks = model.streaks
        let t = model.config
        if streaks.loaded, streaks.current > 0 {
            VStack(spacing: 8) {
                HStack(spacing: 6) {
                    Ph.flame.fill.frame(width: 18, height: 18).foregroundStyle(.orange)
                    Text(t.t("streak.days", count: streaks.current)).font(.body15.weight(.semibold))
                }
                if let tier = streaks.newlyEarned {
                    BadgeView(tier: tier, earned: true, size: 56)
                        .transition(.scale.combined(with: .opacity))
                    Text(t.t("streak.newBadge", ["badge": tier.name])).font(.meta).foregroundStyle(Theme.signal)
                } else if let next = streaks.nextTier {
                    Text(t.t("streak.toNext", count: next.days - streaks.best, ["badge": next.name]))
                        .font(.meta)
                        .foregroundStyle(Theme.muted)
                }
            }
            .sensoryFeedback(.success, trigger: streaks.newlyEarned)
        }
    }
}

/// A streak tier's badge: bright when earned, faint until then.
struct BadgeView: View {
    @Environment(AppModel.self) private var model
    let tier: AppConfig.Tier
    let earned: Bool
    var size: CGFloat = 52

    var body: some View {
        ZStack {
            Circle().fill(earned ? Theme.signal : Theme.raised)
            TierBadge(tier: tier, size: size * 0.45)
                .foregroundStyle(earned ? Theme.onSignal : Theme.muted)
            Text("\(tier.days)")
                .font(.system(size: size * 0.2, weight: .bold))
                .foregroundStyle(earned ? Theme.onSignal : Theme.muted)
                .offset(y: size * 0.33)
        }
        .frame(width: size, height: size)
        .opacity(earned ? 1 : 0.55)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(model.config.t(earned ? "streak.earnedBadgeLabel" : "streak.badgeLabel", ["badge": tier.name, "days": String(tier.days)]))
    }
}
