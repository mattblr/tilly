import SwiftUI

struct ContentSafetyMenu: View {
    let targetType: String
    let targetId: String
    let ownerId: String?
    @Environment(AppModel.self) private var model
    @State private var reporting = false
    @State private var working = false
    @State private var failed = false
    private func t(_ key: String) -> String { model.config.t("safety.\(key)") }
    var body: some View {
        if ownerId != model.account?.userId {
            Menu {
                Button(t("report")) {
                    if model.account == nil { model.signInReason = t("signIn") } else { reporting = true }
                }
                if let ownerId, model.account != nil {
                    Button(t(model.circle.blocked.contains(ownerId) ? "unblock" : "block")) { block(ownerId) }
                }
            } label: { Image(systemName: "ellipsis").frame(minWidth: 44, minHeight: 44) }
            .accessibilityLabel(t("menu"))
            .disabled(working)
            .sheet(isPresented: $reporting) { ReportContentSheet(targetType: targetType, targetId: targetId) }
            .alert(t("failed"), isPresented: $failed) { Button(model.config.t("account-deletion.done"), role: .cancel) {} }
        }
    }
    private func block(_ id: String) {
        guard let actor = model.account?.userId else { return }
        working = true
        Task {
            do { try await model.circle.setBlocked(id, !model.circle.blocked.contains(id), expectedUserID: actor); model.caught() }
            catch { failed = true }
            working = false
        }
    }
}

private struct ReportContentSheet: View {
    let targetType: String
    let targetId: String
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    @State private var reason = "unsafe"
    @State private var details = ""
    @State private var key = UUID().uuidString
    @State private var working = false
    @State private var sent = false
    @State private var failed = false
    private func t(_ key: String) -> String { model.config.t("safety.\(key)") }
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    if sent { Text(t("sent")) }
                    else {
                        Picker(t("reason"), selection: $reason) {
                            ForEach(["unsafe", "harassment", "spam", "privacy", "other"], id: \.self) { Text(t($0)).tag($0) }
                        }.pickerStyle(.menu)
                        Text(t("details")).font(.meta)
                        TextEditor(text: $details).frame(minHeight: 120).padding(8).background(Theme.raised, in: RoundedRectangle(cornerRadius: 12))
                        Button(t(working ? "sending" : "send")) { send() }.buttonStyle(.primary).disabled(working || details.count > 1000)
                    }
                    if failed { Text(t("failed")).font(.meta).foregroundStyle(.red) }
                    Button(t(sent ? "done" : "cancel")) { dismiss() }.buttonStyle(.secondary).disabled(working)
                }.padding(Theme.margin)
            }
            .background(Theme.background)
            .navigationTitle(t("reportTitle"))
            .navigationBarTitleDisplayMode(.inline)
        }
        .tint(Theme.signal)
        .interactiveDismissDisabled(working)
        .onChange(of: reason) { key = UUID().uuidString }
        .onChange(of: details) { key = UUID().uuidString }
        .onChange(of: model.account?.userId) { dismiss() }
    }
    private func send() {
        guard !working, let actor = model.account?.userId else { return }
        working = true; failed = false
        Task {
            do { try await model.foir.reportContent(type: targetType, id: targetId, reason: reason, details: details, key: key, expectedUserID: actor); sent = true }
            catch { failed = true }
            working = false
        }
    }
}

struct BlockedAccountsSettings: View {
    @Environment(AppModel.self) private var model
    @State private var working = false
    @State private var failed = false
    private func t(_ key: String) -> String { model.config.t("safety.\(key)") }
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text(t("blockedAccounts")).font(.sectionTitle)
            if model.circle.blocked.isEmpty { Text(t("noBlocks")).font(.meta).foregroundStyle(Theme.muted) }
            ForEach(model.circle.blocked.sorted(), id: \.self) { id in
                HStack { Text(model.circle.profiles[id]?.displayName ?? t("blockedTitle")); Spacer()
                    Button(t("unblock")) {
                        guard let actor = model.account?.userId else { return }
                        working = true; failed = false
                        Task {
                            do { try await model.circle.setBlocked(id, false, expectedUserID: actor); model.caught() }
                            catch { failed = true }
                            working = false
                        }
                    }.buttonStyle(.plainAction)
                }
            }
            if model.circle.safetyFailed { Text(t("failed")); Button(t("retry")) { Task { await model.circle.reload(for: model.account?.userId); model.caught() } } }
            if failed { Text(t("failed")).font(.meta).foregroundStyle(.red) }
        }.disabled(working).padding(.vertical, 24)
        .task(id: model.circle.blocked) { await model.circle.load(profilesOf: model.circle.blocked) }
    }
}
