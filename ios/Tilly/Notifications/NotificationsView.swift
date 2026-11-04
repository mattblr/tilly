import SwiftUI

struct NotificationsView: View {
    var requestSignIn: () -> Void
    var openDestination: (URL) -> Void
    @Environment(AppModel.self) private var model
    @Environment(\.scenePhase) private var scenePhase
    @Environment(\.dismiss) private var dismiss
    @State private var editMode: EditMode = .inactive
    @State private var selected = Set<String>()
    @State private var selectingAll = false
    @State private var selectionGeneration = UUID()
    private func t(_ key: String) -> String { model.config.t("inbox.\(key)") }
    private var working: Bool { model.inbox.working || selectingAll }
    private var selecting: Bool { editMode.isEditing }
    private var allSelected: Bool {
        !model.inbox.items.isEmpty && !model.inbox.hasMore && selected.count == model.inbox.items.count
    }
    private var selectedUnread: Bool {
        model.inbox.items.contains { selected.contains($0.id) && !$0.isRead }
    }

    var body: some View {
        NavigationStack {
            List(selection: selecting ? $selected : nil) {
                if model.account == nil {
                    Button(t("signIn")) { requestSignIn() }.buttonStyle(.primary)
                } else {
                    if model.inbox.busy || selectingAll { ProgressView(t("loading")) }
                    if model.inbox.bulkReading { ProgressView(t("saving")) }
                    if model.inbox.failed {
                        Text(t("failed")).accessibilityAddTraits(.updatesFrequently)
                        Button(t("retry")) {
                            endSelection()
                            Task { await model.inbox.retry() }
                        }.buttonStyle(.secondary).disabled(working)
                    }
                    if model.inbox.loaded && !working && !model.inbox.failed && model.inbox.items.isEmpty {
                        Text(t("empty")).foregroundStyle(Theme.muted)
                    }
                    ForEach(model.inbox.items) { item in
                        Group {
                            if selecting {
                                row(item).accessibilityElement(children: .combine)
                            } else {
                                Button { model.inbox.open(item, for: model.account?.userId) } label: { row(item) }
                                    .buttonStyle(.plain)
                                    .accessibilityValue(t(item.isRead ? "read" : "unread"))
                                    .swipeActions(edge: .trailing, allowsFullSwipe: true) {
                                        if !item.isRead {
                                            Button { Task { await model.inbox.markRead(item) } } label: {
                                                Label(t("markRead"), systemImage: "envelope.open")
                                            }.tint(Theme.signal).disabled(working)
                                        }
                                    }
                            }
                        }
                        .tag(item.id)
                        .disabled(working)
                        .accessibilityActions {
                            if !selecting && !item.isRead {
                                Button(t("markRead")) { Task { await model.inbox.markRead(item) } }
                            }
                        }
                    }
                    if model.inbox.hasMore {
                        Button(t("more")) { Task { await model.inbox.load(more: true) } }.buttonStyle(.secondary).disabled(working)
                    }
                }
            }
            .listStyle(.plain)
            .environment(\.editMode, $editMode)
            .listRowSpacing(0)
            .scrollContentBackground(.hidden)
            .background(Theme.background)
            .navigationTitle(t("title"))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button(role: .close) { dismiss() } }
                ToolbarItem(placement: .primaryAction) {
                    if model.account != nil && !model.inbox.items.isEmpty {
                        Button(t(selecting ? "done" : "select")) {
                            if selecting { endSelection() } else { withAnimation { editMode = .active } }
                        }.disabled(working)
                    }
                }
            }
            .safeAreaInset(edge: .bottom, spacing: 0) {
                if selecting {
                    VStack(spacing: 12) {
                        Text(model.config.t("inbox.selectedCount", ["count": String(selected.count)])).font(.meta)
                        HStack {
                            Button(t("selectAll")) { selectAll() }.disabled(working || allSelected)
                            Spacer()
                            Button(t(allSelected ? "markAllRead" : "markSelectedRead")) {
                                let ids = selected, all = allSelected, generation = selectionGeneration
                                Task {
                                    let accepted = await model.inbox.markRead(ids: ids, all: all)
                                    if accepted && generation == selectionGeneration { endSelection() }
                                }
                            }.disabled(working || !selectedUnread)
                        }.font(.body15.weight(.medium))
                    }
                    .padding(Theme.margin)
                    .frame(maxWidth: .infinity)
                    .background(Theme.background)
                }
            }
            .refreshable { if !selecting { await model.inbox.load() } }
            .navigationDestination(isPresented: Binding(
                get: { model.inbox.opened != nil && model.inbox.owner == model.account?.userId },
                set: { if !$0 { model.inbox.closeOpened() } }
            )) {
                if let item = model.inbox.opened, model.inbox.owner == model.account?.userId {
                    NotificationDetail(item: item) { url in
                        guard model.inbox.opened?.id == item.id,
                              model.inbox.owner == model.account?.userId else { return }
                        model.inbox.closeOpened()
                        openDestination(url)
                    }
                }
            }
            .task(id: model.account?.userId) { model.inbox.closeOpened(); endSelection(); await model.inbox.load() }
            .onChange(of: scenePhase) { _, phase in
                if phase == .active && !selecting { Task { await model.inbox.load() } }
            }
        }
        .presentationDetents([.large])
        .onDisappear { model.inbox.closeOpened() }
    }

    private func row(_ item: InboxNotification) -> some View {
        HStack(alignment: .center, spacing: 12) {
            Circle().fill(Theme.signal).frame(width: 8, height: 8)
                .opacity(item.isRead ? 0 : 1).accessibilityHidden(true)
            VStack(alignment: .leading, spacing: 3) {
                HStack(alignment: .firstTextBaseline, spacing: 6) {
                    Text(item.title).font(.headline).foregroundStyle(Theme.ink).lineLimit(2)
                    Spacer(minLength: 8)
                    if let date = item.date { timestamp(date).font(.subheadline).foregroundStyle(Theme.muted) }
                    if !selecting {
                        Image(systemName: "chevron.right").font(.caption).foregroundStyle(Theme.muted).accessibilityHidden(true)
                    }
                }
                if let body = item.body {
                    Text(body).font(.subheadline).foregroundStyle(Theme.muted).lineLimit(2)
                }
            }
            if let url = NotificationLink.imageURL(item.imageUrl) {
                NotificationThumbnail(url: url).id(url)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.vertical, 10)
        .contentShape(Rectangle())
    }

    @ViewBuilder private func timestamp(_ date: Date) -> some View {
        if Calendar.current.isDateInToday(date) {
            Text(date, format: .dateTime.hour().minute())
        } else if Calendar.current.component(.year, from: date) == Calendar.current.component(.year, from: .now) {
            Text(date, format: .dateTime.day().month(.abbreviated))
        } else {
            Text(date, format: .dateTime.day().month(.abbreviated).year())
        }
    }

    private func selectAll() {
        let generation = selectionGeneration
        selectingAll = true
        Task {
            let loaded = await model.inbox.loadAll()
            guard generation == selectionGeneration else { return }
            selectingAll = false
            if loaded { selected = Set(model.inbox.items.map(\.id)) }
        }
    }
    private func endSelection() {
        selectionGeneration = UUID()
        editMode = .inactive; selectingAll = false; selected = []
    }
}

/// Attachments are optional context. Missing/expired media leaves the text intact.
private struct NotificationThumbnail: View {
    let url: URL
    @State private var image: UIImage?
    @State private var failed = false
    var body: some View {
        Group {
            if let image {
                Image(uiImage: image).resizable().scaledToFill()
                    .frame(width: 52, height: 52)
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                    .accessibilityHidden(true)
            } else if !failed {
                Color.clear.frame(width: 52, height: 52).accessibilityHidden(true)
            }
        }.task(id: url) {
            image = await PhotoLoader.image(at: url)
            failed = image == nil
        }
    }
}


private struct NotificationDetail: View {
    let item: InboxNotification
    let openDestination: (URL) -> Void
    @Environment(AppModel.self) private var model

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                Text(item.title).font(.title2.weight(.semibold)).accessibilityAddTraits(.isHeader)
                if let date = item.date {
                    Text(date, format: .dateTime.day().month(.wide).year().hour().minute())
                        .font(.subheadline).foregroundStyle(Theme.muted)
                }
                if let body = item.body { Text(body).font(.body).textSelection(.enabled) }
                if let url = NotificationLink.imageURL(item.imageUrl) {
                    NotificationAttachment(url: url).id(url)
                }
                if let url = NotificationLink.url(item.actionUrl, site: FoirConfig.site) {
                    Button(model.config.t("inbox.viewRelated")) { openDestination(url) }.buttonStyle(.secondary)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(Theme.margin)
        }
        .foregroundStyle(Theme.ink)
        .background(Theme.background)
        .navigationTitle(model.config.t("inbox.title"))
        .navigationBarTitleDisplayMode(.inline)
    }
}

private struct NotificationAttachment: View {
    let url: URL
    @State private var image: UIImage?
    var body: some View {
        Group {
            if let image {
                Image(uiImage: image).resizable().scaledToFit()
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                    .accessibilityHidden(true)
            }
        }
        .task(id: url) {
            let loaded = await PhotoLoader.image(at: url)
            guard !Task.isCancelled else { return }
            image = loaded
        }
    }
}
