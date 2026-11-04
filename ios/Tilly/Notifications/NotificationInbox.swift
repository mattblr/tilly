import Foundation
import Observation

struct InboxNotification: Identifiable {
    let id: String
    let title: String
    let body: String?
    let actionUrl: String?
    let createdAt: String
    var isRead: Bool
    var imageUrl: String? = nil
    var date: Date? {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter.date(from: createdAt) ?? ISO8601DateFormatter().date(from: createdAt)
    }
}

@MainActor @Observable
final class NotificationInbox {
    private let foir: Foir
    private var generation = 0
    private(set) var owner: String?
    private(set) var items: [InboxNotification] = []
    private(set) var opened: InboxNotification?
    private(set) var unread = 0
    private(set) var busy = false
    private(set) var reading: String?
    private(set) var bulkReading = false
    private(set) var failed = false
    private(set) var loaded = false
    private var after: String?
    private var retryMore = false
    var hasMore: Bool { after != nil }
    var working: Bool { busy || reading != nil || bulkReading }

    init(foir: Foir) { self.foir = foir }
    func reset(for owner: String?) {
        generation += 1
        self.owner = owner
        opened = nil
        items = []; unread = 0; busy = false; reading = nil; bulkReading = false; failed = false; loaded = false; after = nil; retryMore = false
    }
    /// Reading is local and immediate; persisting read state must not gate access
    /// to text already fetched for this account (for example while offline).
    @discardableResult
    func open(_ item: InboxNotification, for expectedOwner: String?) -> Task<Bool, Never>? {
        guard let owner, owner == expectedOwner,
              let stored = items.first(where: { $0.id == item.id }) else { return nil }
        opened = stored
        guard !stored.isRead else { return nil }
        let started = generation
        return Task {
            guard generation == started, self.owner == owner else { return false }
            return await markRead(stored)
        }
    }
    func closeOpened() { opened = nil }

    func retry() async {
        guard failed else { return }
        await load(more: retryMore)
    }
    func load(more: Bool = false) async {
        guard let owner, !working else { return }
        let started = generation
        busy = true; failed = false; retryMore = more
        defer { if generation == started { busy = false } }
        do {
            let identity = await foir.tokens.identity
            guard identity.userId == owner else { throw TokenStore.SessionError.changed }
            let cursor = more ? after : nil
            let result = try await foir.fetch(NotificationAPI.NotificationInboxQuery(after: cursor.map { .some($0) } ?? .null), ifIdentity: identity)
            guard generation == started, !Task.isCancelled else { return }
            let page = result.myNotifications
            if page.pageInfo.hasNextPage && (page.pageInfo.endCursor == nil || page.pageInfo.endCursor == cursor) {
                throw FoirError(message: "Notification pagination did not advance.", code: nil)
            }
            let rows = page.edges.map { edge in
                let n = edge.node
                return InboxNotification(id: n.id, title: n.title, body: n.body, actionUrl: n.actionUrl, createdAt: n.createdAt, isRead: n.isRead, imageUrl: n.imageUrl)
            }
            if more {
                var ids = Set(items.map(\.id))
                items += rows.filter { ids.insert($0.id).inserted }
            } else { items = rows }
            after = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : nil
            unread = result.myUnreadCount; loaded = true
        } catch { if generation == started && !Task.isCancelled { failed = true } }
    }
    func loadAll() async -> Bool {
        guard owner != nil, !working else { return false }
        let started = generation
        if !loaded { await load() }
        var cursors = Set<String>()
        while generation == started && !failed && hasMore {
            guard let after, cursors.insert(after).inserted else { failed = true; return false }
            await load(more: true)
        }
        return generation == started && !failed && loaded && !hasMore
    }
    @discardableResult
    func markRead(_ item: InboxNotification) async -> Bool {
        guard let owner, !working else { return false }
        let started = generation
        // A lost read response is reconciled from the first page on retry.
        reading = item.id; failed = false; retryMore = false
        defer { if generation == started { reading = nil } }
        do {
            try await persistRead(item.id, owner: owner, started: started)
            return true
        } catch { if generation == started && !Task.isCancelled { failed = true }; return false }
    }
    @discardableResult
    func markRead(ids: Set<String>, all: Bool) async -> Bool {
        guard let owner, !working else { return false }
        let started = generation
        bulkReading = true; failed = false; retryMore = false
        defer { if generation == started { bulkReading = false } }
        do {
            if all {
                let identity = await foir.tokens.identity
                guard generation == started, identity.userId == owner, !Task.isCancelled else { throw TokenStore.SessionError.changed }
                let result = try await foir.perform(NotificationAPI.ReadAllInboxNotificationsMutation(), ifIdentity: identity)
                guard generation == started, !Task.isCancelled else { return false }
                guard result.markAllNotificationsRead else { throw FoirError(message: "Notifications were not marked read.", code: nil) }
                for index in items.indices { items[index].isRead = true }
                unread = 0
            } else {
                let targets = items.filter { ids.contains($0.id) && !$0.isRead }.map(\.id)
                for id in targets { try await persistRead(id, owner: owner, started: started) }
            }
            return true
        } catch { if generation == started && !Task.isCancelled { failed = true }; return false }
    }
    private func persistRead(_ id: String, owner: String, started: Int) async throws {
        let identity = await foir.tokens.identity
        guard generation == started, identity.userId == owner, !Task.isCancelled else { throw TokenStore.SessionError.changed }
        let result = try await foir.perform(NotificationAPI.ReadInboxNotificationMutation(id: id), ifIdentity: identity)
        guard generation == started, !Task.isCancelled else { throw TokenStore.SessionError.changed }
        guard result.markNotificationRead else { throw FoirError(message: "Notification was not marked read.", code: nil) }
        if let index = items.firstIndex(where: { $0.id == id }), !items[index].isRead {
            items[index].isRead = true; unread = max(0, unread - 1)
        }
    }
}
