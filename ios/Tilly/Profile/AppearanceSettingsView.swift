import SwiftUI

struct AppearanceSettingsView: View {
    @Environment(AppModel.self) private var model
    @State private var options: AppearanceOptions?
    @State private var working = false
    @State private var failure: String?
    @State private var saved = false
    @State private var consent = false
    @State private var identity: TokenStore.Identity?
    @State private var request = UUID()

    private func t(_ key: String) -> String { model.config.t("appearance.\(key)", ["provider": "OpenAI"]) }
    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text(t("action")).font(.sectionTitle)
            if let options {
                Text(t("consent.body")).font(.body15)
                Text(t("consent.note")).font(.meta).foregroundStyle(Theme.muted)
                if options.enabled {
                    Button(t("settings.off")) { save(false) }.buttonStyle(.secondary)
                } else if options.available && options.eligible {
                    Button(t("consent.send")) { consent = true }.buttonStyle(.primary)
                } else {
                    Text(t(options.premiumOnly ? "premium" : "settings.unavailable")).font(.meta).foregroundStyle(Theme.muted)
                }
            } else if failure == nil {
                ProgressView(t("settings.loading"))
            }
            if let failure {
                Text(model.config.failureText(failure)).font(.meta).foregroundStyle(.red)
                if options == nil { Button(model.config.t("errors.retry")) { Task { await load() } }.buttonStyle(.secondary) }
            }
            if saved { Text(t("settings.saved")).font(.meta).foregroundStyle(Theme.signal) }
        }
        .disabled(working)
        .padding(.vertical, 24)
        .task(id: model.account?.userId) { working = false; consent = false; identity = nil; await load() }
        .onDisappear { request = UUID(); identity = nil }
        .confirmationDialog(t("consent.title"), isPresented: $consent, titleVisibility: .visible) {
            Button(t("consent.send")) { save(true) }
            Button(t("consent.cancel"), role: .cancel) {}
        } message: { Text(t("consent.body") + "\n\n" + t("consent.note")) }
    }

    private func load() async {
        let started = UUID()
        request = started
        let expected = await model.foir.tokens.identity
        guard !Task.isCancelled, request == started, expected.userId != nil,
              expected.userId == model.account?.userId else { return }
        identity = expected
        options = nil; failure = nil; saved = false
        do {
            let value = try await model.foir.appearanceOptions(ifIdentity: expected)
            guard !Task.isCancelled, request == started,
                  await model.foir.tokens.identity == expected else { return }
            options = value
        } catch {
            if !Task.isCancelled, request == started,
               await model.foir.tokens.identity == expected { failure = UserFailure.key(error) }
        }
    }
    private func save(_ enabled: Bool) {
        guard !working, let expected = identity, expected.userId == model.account?.userId else { return }
        let started = request
        working = true; failure = nil; saved = false
        Task {
            do {
                try await model.foir.saveAppearanceOptions(enabled: enabled, ifIdentity: expected)
                let value = try await model.foir.appearanceOptions(ifIdentity: expected)
                guard request == started, await model.foir.tokens.identity == expected else { return }
                options = value; saved = true
            } catch {
                if request == started, await model.foir.tokens.identity == expected { failure = UserFailure.key(error) }
            }
            if request == started, await model.foir.tokens.identity == expected { working = false }
        }
    }
}

struct AppearanceSuggestionView: View {
    let catId: String
    @Environment(AppModel.self) private var model
    @State private var evidence: CatAppearanceEvidence?
    private func t(_ key: String, _ values: [String: String] = [:]) -> String { model.config.t("appearance.\(key)", values) }
    var body: some View {
        if let evidence {
            VStack(alignment: .leading, spacing: 10) {
                if let breed = evidence.breedShares.first {
                    Text(t("looksLike", ["breed": breed.label]))
                        .font(.meta.weight(.semibold))
                        .padding(.horizontal, 12).padding(.vertical, 7)
                        .background(Theme.signal.opacity(0.12), in: Capsule())
                }
                bars(evidence.breedShares, pattern: false)
                bars(evidence.patternShares, pattern: true)
                Text(t(evidence.samples == 1 ? "evidence.one" : "evidence.other", ["count": String(evidence.samples)]))
                    .font(.system(size: 11)).foregroundStyle(Theme.muted)
            }
            .task(id: catId) { await load() }
        } else {
            Color.clear.frame(height: 0).task(id: catId) { await load() }
        }
    }
    private func load() async {
        let value = try? await model.foir.catAppearance(catId: catId)
        if !Task.isCancelled { evidence = value }
    }
    private func bars(_ rows: [CatAppearanceEvidence.Share], pattern: Bool) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            if pattern && !rows.isEmpty { Text(t("pattern")).font(.meta).foregroundStyle(Theme.muted) }
            ForEach(rows) { row in
                VStack(alignment: .leading, spacing: 4) {
                    HStack {
                        Text("\(pattern ? t("pattern.\(row.label)") : row.label) ×\(row.count)")
                        Spacer()
                        Text("\(row.percent)%").monospacedDigit()
                    }.font(.system(size: 12))
                    ProgressView(value: Double(row.percent), total: 100)
                        .tint(Theme.signal)
                        .accessibilityLabel(pattern ? t("pattern.\(row.label)") : row.label)
                        .accessibilityValue(t("suggestionPercent", ["percent": String(row.percent)]))
                }
            }
        }
    }
}

/// Asked once after first-time setup: breed suggestions send a photo to a
/// provider, so they stay off until the user says yes. Settings can change it.
struct AppearanceChoiceSheet: View {
    @Environment(AppModel.self) private var model
    let done: () -> Void
    @State private var identity: TokenStore.Identity?
    @State private var working = false
    @State private var failure: String?

    private func t(_ key: String) -> String { model.config.t("appearance.\(key)", ["provider": "OpenAI"]) }
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text(t("consent.title")).font(.sectionTitle)
            Text(t("consent.body")).font(.body15)
            Text(t("consent.note")).font(.meta).foregroundStyle(Theme.muted)
            if let failure { Text(model.config.failureText(failure)).font(.meta).foregroundStyle(.red) }
            Button(t("consent.send")) { enable() }.buttonStyle(.primary).disabled(working || identity == nil)
            Button(t("consent.cancel"), action: done).buttonStyle(.secondary).disabled(working)
        }
        .padding(24)
        .presentationDetents([.medium, .large])
        .interactiveDismissDisabled(working)
        .task(id: model.account?.userId) { await load() }
    }

    /// Only offered where suggestions are on for this user and not chosen yet.
    private func load() async {
        let expected = await model.foir.tokens.identity
        guard expected.userId != nil, expected.userId == model.account?.userId else { return done() }
        guard let options = try? await model.foir.appearanceOptions(ifIdentity: expected),
              options.available, options.eligible, !options.enabled,
              await model.foir.tokens.identity == expected else { return done() }
        identity = expected
    }

    private func enable() {
        guard !working, let expected = identity else { return }
        working = true; failure = nil
        Task {
            do {
                try await model.foir.saveAppearanceOptions(enabled: true, ifIdentity: expected)
                if await model.foir.tokens.identity == expected { done() }
            } catch {
                if await model.foir.tokens.identity == expected { failure = UserFailure.key(error) }
            }
            working = false
        }
    }
}
