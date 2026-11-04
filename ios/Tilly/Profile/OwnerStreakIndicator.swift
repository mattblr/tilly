import SwiftUI

/// Streak progress is personal. Reposts and post highlights do not award it.
struct OwnerStreakIndicator: View {
    @Environment(AppModel.self) private var model

    var body: some View {
        let streaks = model.streaks
        if let ownerId = model.account?.userId, streaks.ownerId == ownerId, streaks.loaded {
            HStack(spacing: Theme.margin / 3) {
                Ph.flame.fill.frame(width: 20, height: 20)
                    .foregroundStyle(streaks.current > 0 ? Theme.signal : Theme.muted)
                Text(streaks.current.formatted()).monospacedDigit().fontWeight(.semibold)
            }
            .font(.meta)
            .padding(.horizontal, Theme.margin / 2)
            .padding(.vertical, Theme.margin / 3)
            .background(Theme.raised, in: Capsule())
            .accessibilityElement(children: .ignore)
            .accessibilityLabel(model.config.t("streak.days", count: streaks.current))
            .accessibilityValue(model.config.t("streak.best", ["count": String(streaks.best)]))
        }
    }
}
