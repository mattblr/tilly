// @generated
// This file was automatically generated and should not be edited.

@_spi(Internal) import ApolloAPI

extension NotificationAPI {
  /// A notification category declared by this project. The recipient's per-category preferences gate delivery on it.
  nonisolated enum NotificationCategory: String, EnumType {
    /// Artwork ready
    case artReady = "art_ready"
    /// Community updates
    case communityUpdates = "community_updates"
    /// Streak reminders
    case streakReminder = "streak_reminder"
  }

}