import SwiftUI

struct DeleteAccountView: View {
    @Environment(AppModel.self) private var model
    @State private var showing = false
    @State private var reauthenticating = false
    @State private var confirmed = false
    @State private var working = false
    @State private var failure = false
    @State private var expectedUserID: String?
    @State private var slide = 0.0

    private func t(_ key: String) -> String { model.config.t("account-deletion.\(key)") }
    var body: some View {
        // One red button; what deletion means, and its confirmation, live behind it.
        Button(t("title"), role: .destructive) {
            expectedUserID = model.account?.userId
            confirmed = false; failure = false; showing = true
        }
        .buttonStyle(.destructive)
        .padding(.vertical, 24)
        .sheet(isPresented: $showing) {
            NavigationStack {
                ScrollView {
                    VStack(alignment: .leading, spacing: 20) {
                        Text(t("body"))
                        Text(t("billing")).font(.meta).foregroundStyle(Theme.muted)
                        Link(t("appleSubscriptions"), destination: Subscription.manage)
                        Text(t("recent")).font(.meta).foregroundStyle(Theme.muted)
                        Button(t("reauthenticate")) { reauthenticating = true }.buttonStyle(.secondary)
                        Toggle(t("confirmLabel"), isOn: $confirmed)
                        if failure { Text(t("failed")).font(.meta).foregroundStyle(.red) }
                        VStack(alignment: .leading, spacing: 8) {
                            Text(t(working ? "working" : "slide")).foregroundStyle(.red)
                            GeometryReader { geometry in
                                let travel = max(1, geometry.size.width - 56)
                                ZStack(alignment: .leading) {
                                    Capsule().fill(.red.opacity(0.12))
                                    Image(systemName: "chevron.right")
                                        .font(.headline).foregroundStyle(.white)
                                        .frame(width: 56, height: 56)
                                        .background(.red, in: Circle())
                                        .contentShape(Circle())
                                        .offset(x: slide * travel)
                                        // Only the handle owns the gesture. A tap on
                                        // the far end of the track cannot confirm.
                                        .gesture(DragGesture(minimumDistance: 8, coordinateSpace: .named("deletion-track"))
                                            .onChanged { value in
                                                guard confirmed, !working else { return }
                                                slide = min(1, max(0, value.translation.width / travel))
                                            }
                                            .onEnded { _ in
                                                if slide >= 0.98 { remove() }
                                                slide = 0
                                            })
                                }
                                .coordinateSpace(name: "deletion-track")
                            }
                            .frame(height: 56)
                            .opacity(confirmed && !working ? 1 : 0.4)
                            .disabled(!confirmed || working)
                            .accessibilityElement(children: .ignore)
                            .accessibilityLabel(t("slide"))
                            .accessibilityValue("\(Int(slide * 100)) percent")
                            .accessibilityHint(t("slideHint"))
                            .accessibilityAdjustableAction { direction in
                                guard confirmed, !working else { return }
                                switch direction {
                                case .increment: slide = min(1, slide + 0.1)
                                case .decrement: slide = max(0, slide - 0.1)
                                @unknown default: break
                                }
                            }
                            .accessibilityAction(named: Text(t("confirm"))) {
                                if slide >= 0.98 { remove() }
                                slide = 0
                            }
                            .disabled(!confirmed || working)
                        }
                        Button(t("cancel")) { showing = false }.buttonStyle(.secondary)
                    }
                    .padding(Theme.margin)
                    .disabled(working)
                }
                .background(Theme.background)
                .navigationTitle(t("confirmTitle"))
                .navigationBarTitleDisplayMode(.inline)
            }
            .tint(Theme.signal)
            .interactiveDismissDisabled(working)
            .sheet(isPresented: $reauthenticating) {
                SignInSheet(reason: t("reauthenticate"), detail: t("recent"), onSignedIn: { reauthenticating = false; confirmed = false; failure = false })
            }
        }
        .onChange(of: model.account?.userId) { _, value in
            if value != expectedUserID { showing = false; reauthenticating = false; confirmed = false; slide = 0 }
        }
        .onChange(of: confirmed) { _, _ in slide = 0 }
        .onChange(of: showing) { _, _ in slide = 0 }
    }
    private func remove() {
        guard confirmed, !working, let expectedUserID, expectedUserID == model.account?.userId else { return }
        working = true; failure = false
        Task {
            do {
                if try await model.foir.deleteAccount(expectedUserID: expectedUserID) {
                    showing = false; model.accountDeleted = true; model.showingProfile = false
                }
            } catch { failure = true }
            working = false
        }
    }
}
