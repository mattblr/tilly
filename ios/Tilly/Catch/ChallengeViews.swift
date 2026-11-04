import SwiftUI

/// Photo challenges won, beside the user's name. The trophy pulses while a
/// challenge is running. Opens the running challenge and past ones. Mounted
/// only on the signed-in user's own profile.
struct ChallengeTrophy: View {
    @Environment(AppModel.self) private var model
    @State private var collection: ChallengeCollection?
    @State private var showing = false
    @State private var request = UUID()

    var body: some View {
        TimelineView(.explicit(PhotoChallenge.timelineDates(collection?.challenges ?? [], from: .now))) { context in
            let won = collection?.badges.filter(\.earned).count ?? 0
            let live = !(collection?.activeChallenges(at: context.date).isEmpty ?? true)
            Button { showing = true } label: {
                HStack(spacing: Theme.margin / 3) {
                    Ph.trophy.fill.frame(width: 20, height: 20)
                        .foregroundStyle(won > 0 || live ? Theme.signal : Theme.muted)
                        .modifier(Pulse(active: live))
                    Text(won.formatted()).monospacedDigit().fontWeight(.semibold)
                }
                .font(.meta)
                .foregroundStyle(Theme.ink)
                .padding(.horizontal, Theme.margin / 2)
                .padding(.vertical, Theme.margin / 3)
                .background(Theme.raised, in: Capsule())
                .frame(minHeight: 44)
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityLabel(model.config.t("challenges.wonCount", count: won))
            .accessibilityHint(live ? model.config.t("challenges.liveHint") : "")
        }
        .opacity(collection == nil ? 0 : 1)
        .sheet(isPresented: $showing) { ChallengesSheet(collection: collection ?? ChallengeCollection()) }
        .task(id: "\(model.account?.userId ?? ""):\(model.catchesSaved)") { await load() }
        .onDisappear { request = UUID() }
    }

    private func load() async {
        let started = UUID(); request = started
        let identity = await model.foir.tokens.identity
        guard identity.userId != nil, identity.userId == model.account?.userId, !Task.isCancelled else { return }
        let value = try? await model.foir.challengeCollection(ifIdentity: identity)
        guard request == started, !Task.isCancelled, await model.foir.tokens.identity == identity else { return }
        collection = value
    }
}

/// A gentle, continuous pulse while a challenge is running; none when the
/// user asks for less motion.
private struct Pulse: ViewModifier {
    let active: Bool
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    func body(content: Content) -> some View {
        if active && !reduceMotion {
            content.phaseAnimator([false, true]) { view, up in
                view.scaleEffect(up ? 1.18 : 1)
            } animation: { _ in .easeInOut(duration: 0.8) }
        } else {
            content
        }
    }
}

/// The running challenge and how the user is doing, then past challenges,
/// newest first, a page at a time.
struct ChallengesSheet: View {
    let collection: ChallengeCollection

    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    @State private var past: Paged<PhotoChallenge>?

    var body: some View {
        NavigationStack {
            ScrollView {
                LazyVStack(alignment: .leading, spacing: 0) {
                    let running = collection.activeChallenges(at: .now)
                    if !running.isEmpty {
                        Text(model.config.t("challenges.running")).font(.sectionTitle).padding(.top, 8)
                        ForEach(running) { challenge in
                            row(challenge, when: model.config.t("challenges.ends", ["date": day(challenge.endsAt)]))
                        }
                    }
                    Text(model.config.t("challenges.past")).font(.sectionTitle).padding(.top, running.isEmpty ? 8 : 28)
                    if let past, past.started {
                        if past.rows.isEmpty, past.finished {
                            Text(model.config.t("challenges.pastEmpty")).font(.meta).foregroundStyle(Theme.muted).padding(.top, 6)
                        }
                        ForEach(past.rows) { challenge in
                            row(challenge, when: model.config.t("challenges.ended", ["date": day(challenge.endsAt)]))
                                .task { await past.reached(challenge) }
                        }
                        if past.loading { LoadingMore() }
                        if let failure = past.failure {
                            Text(model.config.failureText(failure)).font(.meta).foregroundStyle(Theme.muted)
                            Button(model.config.t("common.retry")) { Task { await past.loadMore() } }.buttonStyle(.plainAction)
                        }
                    } else {
                        Loading(minHeight: 120)
                    }
                }
                .padding(.horizontal, Theme.margin)
                .padding(.bottom, 24)
            }
            .background(Theme.background)
            .navigationTitle(model.config.t("challenges.title"))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) { Button(model.config.t("common.done")) { dismiss() } }
            }
        }
        .tint(Theme.signal)
        .task { await loadPast() }
    }

    private func row(_ challenge: PhotoChallenge, when: String) -> some View {
        let badge = collection.badges.first { $0.challengeKey == challenge.id && $0.version == challenge.version }
        return VStack(alignment: .leading, spacing: 5) {
            Label { Text(challenge.title) } icon: { BadgeImage(url: challenge.badge, size: 18) }.font(.body15.weight(.semibold))
            Text(challenge.description).font(.meta).foregroundStyle(Theme.muted)
            if badge?.earned == true {
                Label(model.config.t("challenges.won"), systemImage: "trophy.fill").font(.meta.weight(.semibold)).foregroundStyle(Theme.signal)
            } else {
                Text(model.config.t("challenges.progress", ["count": String(badge?.progress ?? 0), "target": String(challenge.targetCount)]))
                    .font(.meta).monospacedDigit()
            }
            Text(when).font(.meta).foregroundStyle(Theme.muted)
        }
        .padding(.vertical, 14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .overlay(alignment: .bottom) { Rectangle().fill(Theme.rule).frame(height: 1) }
    }

    private func day(_ date: Date) -> String { date.formatted(date: .abbreviated, time: .omitted) }

    private func loadPast() async {
        let foir = model.foir
        let now = ISO8601DateFormatter().string(from: .now)
        let list = Paged<PhotoChallenge> { after in
            let page = try await foir.fetch(ChallengeAPI.PastChallengesQuery(now: .some(now), after: .maybe(after))).photoChallenges
            let rows = page.edges.compactMap { edge -> PhotoChallenge? in
                let row = edge.node
                guard let key = row._naturalKey, let title = row.title, let description = row.description,
                      let start = PhotoChallenge.date(row.startsAt), let end = PhotoChallenge.date(row.endsAt), start < end,
                      let version = row.criteriaVersion, let target = row.targetCount, target > 0, let enabled = row.enabled else { return nil }
                return PhotoChallenge(id: key, title: title, description: description, badge: BadgeImage.url(row.badge?.url), startsAt: start, endsAt: end,
                    version: version, targetCount: target, enabled: enabled)
            }
            return (rows, page.pageInfo.hasNextPage ? page.pageInfo.endCursor : nil)
        }
        past = list
        await list.reload()
    }
}
