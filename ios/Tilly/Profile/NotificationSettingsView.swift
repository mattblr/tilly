import SwiftUI
import UserNotifications

struct NotificationSettingsView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.openURL) private var openURL
    @State private var values = NotificationOptions()
    @State private var loaded = false
    @State private var working = false
    @State private var failure: String?
    @State private var saved = false
    @State private var permission: UNAuthorizationStatus = .notDetermined

    private func t(_ key: String) -> String { model.config.t("notifications.\(key)") }
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text(t("title")).font(.sectionTitle)
            Text(t("hint")).font(.meta).foregroundStyle(Theme.muted)
            if loaded {
                Toggle(t("artReady"), isOn: $values.artReady)
                Toggle(t("streakReminders"), isOn: $values.streakReminders)
                Toggle(t("communityUpdates"), isOn: $values.communityUpdates)
                Picker(t("time"), selection: $values.reminderHour) {
                    ForEach(0..<24) { hour in Text(String(format: "%02d:00", hour)).tag(hour) }
                }.pickerStyle(.menu)
                Text(values.timeZone).font(.meta).foregroundStyle(Theme.muted)
                Button(t("useZone")) { values.timeZone = TimeZone.current.identifier }.buttonStyle(.plainAction)
                Button(t(working ? "saving" : "save")) { save() }.buttonStyle(.primary)
                if permission == .authorized || permission == .provisional {
                    Text(t("pushEnabled")).font(.meta).foregroundStyle(Theme.muted)
                } else if permission == .denied {
                    Text(t("pushDenied")).font(.meta).foregroundStyle(Theme.muted)
                    Button(t("openSettings")) { if let url = URL(string: UIApplication.openSettingsURLString) { openURL(url) } }.buttonStyle(.secondary)
                } else {
                    Button(t("enablePush")) {
                        Task { await Push.askAndRegister(); permission = await UNUserNotificationCenter.current().notificationSettings().authorizationStatus }
                    }.buttonStyle(.secondary)
                }
            } else if failure == nil {
                ProgressView(t("loading"))
            }
            if let failure {
                Text(model.config.failureText(failure)).font(.meta).foregroundStyle(.red)
                if !loaded { Button(t("retry")) { Task { await load() } }.buttonStyle(.secondary) }
            }
            if saved { Text(t("saved")).font(.meta).foregroundStyle(Theme.signal) }
        }
        .tint(Theme.signal)
        .disabled(working)
        .padding(.vertical, 24)
        .task(id: model.account?.userId) { await load() }
    }

    private func load() async {
        loaded = false; saved = false; failure = nil
        do {
            let options = try await model.foir.notificationOptions()
            guard !Task.isCancelled else { return }
            values = options; loaded = true
            permission = await UNUserNotificationCenter.current().notificationSettings().authorizationStatus
        } catch { if !Task.isCancelled { failure = t("loadFailed") } }
    }
    private func save() {
        working = true; saved = false; failure = nil
        Task {
            do { try await model.foir.saveNotificationOptions(values); saved = true }
            catch { failure = t("failed") }
            working = false
        }
    }
}
