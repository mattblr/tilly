import Foundation
import UIKit
import UserNotifications

struct NotificationOptions: Sendable {
    var artReady = false
    var streakReminders = false
    var communityUpdates = false
    var timeZone = TimeZone.current.identifier
    var reminderHour = 18
}

extension Foir {
    func unregisterNotificationDevice(ifIdentity expected: TokenStore.Identity? = nil) async {
        if let expected, await tokens.identity != expected { return }
        if let token = await Push.deviceToken {
            let hex = token.map { String(format: "%02x", $0) }.joined()
            _ = try? await perform(NotificationAPI.UnregisterNotificationDeviceMutation(token: hex), ifIdentity: expected)
        }
        if let expected, await tokens.identity != expected { return }
        await forgetNotificationDevice(ifIdentity: expected)
    }

    /// Local cleanup also works after account deletion revoked the bearer.
    @MainActor func forgetNotificationDevice(ifIdentity expected: TokenStore.Identity? = nil) async {
        if let expected, await tokens.identity != expected { return }
        UIApplication.shared.unregisterForRemoteNotifications()
        UNUserNotificationCenter.current().removeAllDeliveredNotifications()
        Push.deviceToken = nil
    }
    func notificationOptions() async throws -> NotificationOptions {
        let data = try await fetch(NotificationAPI.NotificationPreferencesQuery())
        let stored = data.myNotificationSettings
        func enabled(_ key: String, intent: Bool?) -> Bool {
            guard intent == true else { return false }
            guard let pref = data.notificationPreferences.compactMap({ $0 }).first(where: { $0.category == key }) else { return true }
            return pref.enabled && (pref.channels?.contains("push") ?? false)
        }
        return NotificationOptions(
            artReady: enabled("art_ready", intent: stored?.artReady),
            streakReminders: enabled("streak_reminder", intent: stored?.streakReminders),
            communityUpdates: enabled("community_updates", intent: stored?.communityUpdates),
            timeZone: stored?.timeZone ?? TimeZone.current.identifier,
            reminderHour: stored?.reminderHour ?? 18
        )
    }

    func saveNotificationOptions(_ values: NotificationOptions) async throws {
        let categories: [(NotificationAPI.NotificationCategory, Bool)] = [(.artReady, values.artReady), (.streakReminder, values.streakReminders), (.communityUpdates, values.communityUpdates)]
        // Delivery is revoked before reducing the recipient-selection record.
        // A failed multi-step save is reported, never treated as a saved form.
        for (category, enabled) in categories.sorted(by: { !$0.1 && $1.1 }) {
            for channel in ["push", "in_app"] {
                let input = NotificationAPI.UpdateNotificationPreferenceInput(category: .case(category), channel: channel, enabled: enabled)
                guard try await perform(NotificationAPI.UpdateNotificationPreferenceMutation(input: input)).updateNotificationPreference else {
                    throw FoirError(message: "Notification preferences did not save.", code: nil)
                }
            }
        }
        let input = NotificationAPI.SaveNotificationSettingsInput(artReady: values.artReady, communityUpdates: values.communityUpdates,
            reminderHour: Int32(values.reminderHour), streakReminders: values.streakReminders, timeZone: values.timeZone)
        let result = try await perform(NotificationAPI.SaveNotificationSettingsMutation(input: input)).executeSaveNotificationSettings
        guard result?.result?.ok == true else {
            throw FoirError(message: result?.execution.error ?? "Notification settings did not save.", code: nil)
        }
    }
}
