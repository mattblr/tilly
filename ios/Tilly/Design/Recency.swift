import Foundation

/// How long ago a cat was reported, in the two lengths the design uses: the
/// map marker's "1h" and the sheet's "1 hour ago". Always the report's age,
/// never the time the screen fetched it.
enum Recency {
    /// A report older than this is drawn quieter on the map.
    static let fresh: TimeInterval = 24 * 3600

    @MainActor static func short(since date: Date, copy: AppConfig, now: Date = .now) -> String {
        let seconds = max(0, now.timeIntervalSince(date))
        switch seconds {
        case ..<3600: return copy.t("common.minutesShort", ["count": String(max(1, Int(seconds / 60)))])
        case ..<86400: return copy.t("common.hoursShort", ["count": String(Int(seconds / 3600))])
        case ..<(7 * 86400): return copy.t("common.daysShort", ["count": String(Int(seconds / 86400))])
        default: return copy.t("common.weeksShort", ["count": String(Int(seconds / (7 * 86400)))])
        }
    }

    @MainActor static func long(since date: Date, copy: AppConfig, now: Date = .now) -> String {
        if now.timeIntervalSince(date) < 60 { return copy.t("common.justNow") }
        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .full
        return formatter.localizedString(for: date, relativeTo: now)
    }

    /// Fóir's timestamps, with or without fractional seconds.
    static func date(_ value: String?) -> Date? {
        guard let value else { return nil }
        let fractional = ISO8601DateFormatter()
        fractional.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return fractional.date(from: value) ?? ISO8601DateFormatter().date(from: value)
    }
}
