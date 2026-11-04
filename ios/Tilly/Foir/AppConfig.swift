import Foundation
import Observation
import SwiftUI

/// What the console tells the app: its numbers, its streak tiers and its
/// words. The app ships with its own of each, keeps the last ones Fóir sent,
/// and starts with those, so a change made in the console needs no release.
@MainActor @Observable
final class AppConfig {
    struct Settings: Codable, Equatable {
        /// How many cats an area holds before the map counts them.
        var clusterAt = 10
        var nearYouMeters = 500
        var nearYouHours = 24
        var nearMeMeters = 5000
        var trendingPerCat = 2
    }

    struct Tier: Codable, Identifiable, Hashable {
        let days: Int
        let name: String
        /// The badge picture uploaded in the console, when there is one.
        let badge: URL?
        let stylePrompt: String
        let animated: Bool
        var id: Int { days }
    }

    struct ProjectLocale: Codable, Identifiable {
        let code: String
        let canonicalCode: String
        let displayName: String
        let nativeName: String?
        let isDefault: Bool
        let isRtl: Bool
        var id: String { code }
        var label: String { nativeName ?? displayName }
    }

    private struct Saved: Codable {
        var settings: Settings
        var tiers: [Tier]
        var copy: [String: String]
        var locales: [ProjectLocale]?
        var theme: ThemeValues?
    }

    private(set) var locale: String?
    private(set) var locales: [ProjectLocale] = []
    private(set) var localeFailure: String?
    private var generation = 0
    var rightToLeft: Bool { locales.first { $0.code == locale }?.isRtl ?? locales.first { $0.isDefault }?.isRtl ?? false }

    private(set) var settings = Settings()
    private(set) var tiers: [Tier] = AppConfig.defaultTiers
    /// The console's words, by `namespace.key`, over the app's own.
    private(set) var copy: [String: String] = [:]

    /// What the app starts with before Fóir has been asked.
    static let defaultTiers = [
        Tier(days: 1, name: "First paw", badge: nil, stylePrompt: "", animated: false),
        Tier(days: 7, name: "A week of hellos", badge: nil, stylePrompt: "", animated: false),
        Tier(days: 14, name: "A fortnight of faces", badge: nil, stylePrompt: "", animated: false),
    ]

    /// The app's own words, from Copy.json, by `namespace.key`.
    private static let defaults: [String: String] = {
        guard let url = Bundle.main.url(forResource: "Copy", withExtension: "json"),
              let data = try? Data(contentsOf: url),
              let namespaces = try? JSONDecoder().decode([String: [String: String]].self, from: data)
        else { return [:] }
        var flat: [String: String] = [:]
        for (namespace, entries) in namespaces {
            for (key, text) in entries { flat["\(namespace).\(key)"] = text }
        }
        return flat
    }()

    private let foir: Foir
    private var file: URL {
        // Locale codes are selected from Fóir and validated before persistence.
        let target = foir.config.sessionAccount == "tokens" ? "" : "\(foir.config.sessionAccount)-"
        return URL.applicationSupportDirectory.appending(path: "app-config-\(target)\(locale ?? "source").json")
    }

    init(foir: Foir) {
        self.foir = foir
        Theme.apply(.bundled)
        let saved = UserDefaults.standard.string(forKey: "tilly.contentLocale")
        locale = saved.flatMap { $0.range(of: "^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$", options: .regularExpression) != nil ? $0 : nil }
        restore()
    }

    private func restore() {
        if let data = try? Data(contentsOf: file), let saved = try? JSONDecoder().decode(Saved.self, from: data) {
            settings = saved.settings
            tiers = saved.tiers.isEmpty ? Self.defaultTiers : saved.tiers
            copy = saved.copy
            if locales.isEmpty { locales = saved.locales ?? [] }
            if let theme = saved.theme { Theme.apply(theme) }
        }
    }

    func selectLocale(_ code: String) async {
        guard locales.contains(where: { $0.code == code }), code != locale else { return }
        generation += 1
        locale = code
        UserDefaults.standard.set(code, forKey: "tilly.contentLocale")
        copy = [:]
        tiers = Self.defaultTiers
        restore()
        await reload()
    }

    /// The app's words for a key, with `{name}` placeholders filled in.
    func t(_ key: String, _ values: [String: String] = [:]) -> String {
        var text = copy[key] ?? Self.defaults[key] ?? key
        assert(Self.defaults[key] != nil, "\(key) has no default in Copy.json")
        for (name, value) in values { text = text.replacingOccurrences(of: "{\(name)}", with: value) }
        return text
    }

    /// Async state stores a safe copy key so locale changes also update visible failures.
    func failureText(_ value: String) -> String {
        value.hasPrefix("errors.") ? t(value) : value
    }

    /// One or other of a key's `.one` and `.other` forms, by count.
    func t(_ key: String, count: Int, _ values: [String: String] = [:]) -> String {
        t(count == 1 ? "\(key).one" : "\(key).other", values.merging(["count": "\(count)"]) { a, _ in a })
    }

    /// Asks Fóir for the console's latest, keeping what it had for anything
    /// it can't get.
    func reload() async {
        generation += 1
        let request = generation
        localeFailure = nil
        if let found = try? await foir.fetch(FoirAPI.ProjectLocalesQuery()).locales {
            guard request == generation else { return }
            locales = found.map { ProjectLocale(code: $0.code, canonicalCode: $0.canonicalCode, displayName: $0.displayName, nativeName: $0.nativeName, isDefault: $0.isDefault, isRtl: $0.isRtl) }
            if let locale, !locales.contains(where: { $0.code == locale }) {
                self.locale = nil
                UserDefaults.standard.removeObject(forKey: "tilly.contentLocale")
                copy = [:]
                tiers = Self.defaultTiers
                restore()
            }
        } else {
            guard request == generation else { return }
            localeFailure = "errors.languages"
        }
        let selected = locale
        var nextSettings = settings
        var nextTiers = tiers
        var nextCopy = copy
        var nextFailure = localeFailure
        var nextTheme = Theme.snapshot
        if let found = try? await foir.fetch(FoirAPI.PublishedDesignTokensQuery()).designTokens {
            nextTheme = ThemeValues.bundled.resolving(
                colors: found.colors.map { .init(name: $0.name, value: $0.value) },
                spacings: found.spacings.map { .init(name: $0.name, value: $0.value) },
                radii: found.radii.map { .init(name: $0.name, value: $0.value) })
        }
        if let found = try? await foir.fetch(FoirAPI.AppSettingsQuery()).appSettings {
            var next = Settings()
            next.clusterAt = found.clusterAt ?? next.clusterAt
            next.nearYouMeters = found.nearYouMeters ?? next.nearYouMeters
            next.nearYouHours = found.nearYouHours ?? next.nearYouHours
            next.nearMeMeters = found.nearMeMeters ?? next.nearMeMeters
            next.trendingPerCat = found.trendingPerCat ?? next.trendingPerCat
            nextSettings = next
        }
        if let found = try? await Paging.all({ [foir] after in
            let page = try await foir.fetch(FoirAPI.StreakTiersQuery(after: .maybe(after), locale: .maybe(selected))).streakTiers
            return (page.edges.map(\.node), page.pageInfo.fragments.more)
        }) {
            let read = found.compactMap { tier -> Tier? in
                guard let days = tier.days, days > 0 else { return nil }
                return Tier(days: Int(days), name: tier.name ?? "\(days) days", badge: BadgeImage.url(tier.badge?.url), stylePrompt: tier.stylePrompt ?? "", animated: tier.animated ?? false)
            }
            nextTiers = read.isEmpty ? Self.defaultTiers : read.sorted { $0.days < $1.days }
        }
        if let found = try? await Paging.all({ [foir] after in
            let page = try await foir.fetch(FoirAPI.UiCopyQuery(after: .maybe(after), locale: .maybe(selected))).uiCopies
            return (page.edges.map(\.node), page.pageInfo.fragments.more)
        }) {
            var next: [String: String] = [:]
            for record in found {
                guard let namespace = record._naturalKey else { continue }
                for entry in record.entries ?? [] {
                    if let key = entry?.key, let value = entry?.value, !value.isEmpty { next["\(namespace).\(key)"] = value }
                }
            }
            nextCopy = next
        } else {
            nextFailure = "errors.words"
        }
        guard request == generation, selected == locale else { return }
        settings = nextSettings
        tiers = nextTiers
        copy = nextCopy
        localeFailure = nextFailure
        Theme.apply(nextTheme)
        save()
    }

    private func save() {
        let saved = Saved(settings: settings, tiers: tiers, copy: copy, locales: locales, theme: Theme.snapshot)
        try? FileManager.default.createDirectory(at: file.deletingLastPathComponent(), withIntermediateDirectories: true)
        if let data = try? JSONEncoder().encode(saved) { try? data.write(to: file, options: .atomic) }
    }
}

/// A tier's badge: the picture uploaded in the console, or a flame.
struct TierBadge: View {
    let tier: AppConfig.Tier
    var size: CGFloat = 22

    var body: some View {
        BadgeImage(url: tier.badge, size: size, fallback: .flame)
    }
}
