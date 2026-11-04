import Foundation

// SDK/transport doubles only: NotificationInbox.swift is compiled unchanged.
enum NotificationAPI {
    enum Cursor { case some(String), null
        var value: String? { if case .some(let value) = self { value } else { nil } }
    }
    struct NotificationInboxQuery { let after: Cursor }
    struct ReadInboxNotificationMutation { let id: String }
    struct ReadAllInboxNotificationsMutation {}
}
actor TokenStore {
    struct Identity: Equatable, Sendable { let userId: String? }
    enum SessionError: Error { case changed }
    var identity = Identity(userId: "alice")
}
struct FoirError: Error { let message: String; let code: String? }
struct InboxAnswer {
    struct Row {
        let id: String
        var title = "Notification"
        var body: String? = nil
        var actionUrl: String? = nil
        var imageUrl: String? = nil
        var createdAt = "2026-11-02T10:00:00.000Z"
        var isRead = false
    }
    struct Edge { let node: Row }
    struct PageInfo { let hasNextPage: Bool; let endCursor: String? }
    struct Page { let edges: [Edge]; let pageInfo: PageInfo }
    let myNotifications: Page
    let myUnreadCount: Int
    init(_ ids: [String], after: String? = nil, unread: Int = 2, read: Bool = false) {
        myNotifications = Page(edges: ids.map { Edge(node: Row(id: $0, isRead: read)) },
            pageInfo: PageInfo(hasNextPage: after != nil, endCursor: after))
        myUnreadCount = unread
    }
}
@MainActor final class Foir {
    struct ReadAnswer { let markNotificationRead: Bool }
    struct ReadAllAnswer { let markAllNotificationsRead: Bool }
    let tokens = TokenStore()
    var answers: [Result<InboxAnswer, Error>] = []
    var cursors: [String?] = []
    var readFailure = false
    var readIds: [String] = []
    var allReadCalls = 0
    var allReadAccepted = true
    func fetch(_ query: NotificationAPI.NotificationInboxQuery, ifIdentity: TokenStore.Identity) async throws -> InboxAnswer {
        cursors.append(query.after.value)
        precondition(!answers.isEmpty, "Unexpected inbox request")
        return try answers.removeFirst().get()
    }
    func perform(_ mutation: NotificationAPI.ReadInboxNotificationMutation, ifIdentity: TokenStore.Identity) async throws -> ReadAnswer {
        readIds.append(mutation.id)
        if readFailure { throw URLError(.networkConnectionLost) }
        return ReadAnswer(markNotificationRead: true)
    }
    func perform(_ mutation: NotificationAPI.ReadAllInboxNotificationsMutation, ifIdentity: TokenStore.Identity) async throws -> ReadAllAnswer {
        allReadCalls += 1
        return ReadAllAnswer(markAllNotificationsRead: allReadAccepted)
    }
}

@main @MainActor struct NotificationInboxChecks {
    static func main() async {
        let failure: Result<InboxAnswer, Error> = .failure(URLError(.notConnectedToInternet))

        // A refresh failure must repeat the head request even with an older cursor.
        let refresh = Foir(), inbox = NotificationInbox(foir: refresh)
        inbox.reset(for: "alice")
        refresh.answers = [.success(InboxAnswer(["one"], after: "older")), failure,
            .success(InboxAnswer(["new"], after: "next", unread: 3))]
        await inbox.load(); await inbox.load()
        precondition(inbox.failed && inbox.items.map(\.id) == ["one"] && inbox.hasMore)
        await inbox.retry()
        precondition(refresh.cursors.count == 3 && refresh.cursors.allSatisfy { $0 == nil })
        precondition(!inbox.failed && inbox.items.map(\.id) == ["new"] && inbox.unread == 3)
        await inbox.retry()
        precondition(refresh.cursors.count == 3, "Retry without a failure must not send")

        // A failed older-page request must repeat that cursor and merge once.
        let paging = Foir(), paged = NotificationInbox(foir: paging)
        paged.reset(for: "alice")
        paging.answers = [.success(InboxAnswer(["one"], after: "older")), failure,
            .success(InboxAnswer(["one", "two"]))]
        await paged.load(); await paged.load(more: true)
        precondition(paged.failed && paged.items.count == 1)
        await paged.retry()
        precondition(paging.cursors == [nil, "older", "older"])
        precondition(paged.items.map(\.id) == ["one", "two"] && !paged.hasMore && !paged.failed)

        // A failed read never decrements locally. Retry reconciles from the head.
        let reading = Foir(), readInbox = NotificationInbox(foir: reading)
        readInbox.reset(for: "alice")
        reading.answers = [.success(InboxAnswer(["one"], after: "older")),
            .success(InboxAnswer(["one"], unread: 1, read: true))]
        await readInbox.load(); reading.readFailure = true
        let accepted = await readInbox.markRead(readInbox.items[0])
        precondition(!accepted && readInbox.failed && readInbox.unread == 2 && !readInbox.items[0].isRead)
        await readInbox.retry()
        precondition(reading.cursors == [nil, nil] && readInbox.unread == 1 && readInbox.items[0].isRead)

        // A notification with no URL still opens its complete owned content,
        // immediately, even when read-state persistence subsequently fails.
        let offlineReader = Foir(), offlineInbox = NotificationInbox(foir: offlineReader)
        offlineInbox.reset(for: "alice")
        offlineReader.answers = [.success(InboxAnswer(["message"]))]
        await offlineInbox.load()
        offlineReader.readFailure = true
        let savingRead = offlineInbox.open(offlineInbox.items[0], for: "alice")
        precondition(offlineInbox.opened?.id == "message" && offlineInbox.opened?.actionUrl == nil)
        let readSaved = await savingRead?.value
        precondition(readSaved == false && offlineInbox.opened?.id == "message")
        precondition(!offlineInbox.items[0].isRead && offlineInbox.unread == 2)
        offlineInbox.closeOpened()
        precondition(offlineInbox.opened == nil)
        let stale = offlineInbox.items[0]
        // Opening schedules a read for the same generation, never a replacement
        // account; reset clears the reading screen before any network response.
        let pendingRead = offlineInbox.open(stale, for: "alice")
        offlineInbox.reset(for: "bob")
        let staleSaved = await pendingRead?.value
        precondition(staleSaved == false && offlineInbox.opened == nil)
        precondition(offlineReader.readIds == ["message"])
        precondition(offlineInbox.open(stale, for: "alice") == nil)
        precondition(offlineInbox.open(stale, for: "bob") == nil)
        precondition(offlineInbox.opened == nil)

        // A failed first request has no cursor; retry also recovers that state.
        let initial = Foir(), empty = NotificationInbox(foir: initial)
        empty.reset(for: "alice")
        initial.answers = [failure, .success(InboxAnswer([], unread: 0))]
        await empty.load(); precondition(empty.failed && !empty.loaded && empty.items.isEmpty)
        await empty.retry()
        precondition(initial.cursors == [nil, nil] && empty.loaded && !empty.failed && empty.items.isEmpty)
        // Select all drains the owned cursor, rather than silently selecting one page.
        let bulk = Foir(), bulkInbox = NotificationInbox(foir: bulk)
        bulkInbox.reset(for: "alice")
        bulk.answers = [.success(InboxAnswer(["one", "two"], after: "older", unread: 3)),
            .success(InboxAnswer(["three"], unread: 3))]
        await bulkInbox.load()
        let complete = await bulkInbox.loadAll()
        precondition(complete && bulk.cursors == [nil, "older"] && bulkInbox.items.count == 3)
        let selectedAccepted = await bulkInbox.markRead(ids: ["one", "three"], all: false)
        precondition(selectedAccepted && bulk.readIds == ["one", "three"] && bulkInbox.unread == 1)
        bulk.allReadAccepted = false
        let refusedAll = await bulkInbox.markRead(ids: ["one", "two", "three"], all: true)
        precondition(!refusedAll && bulkInbox.failed && bulkInbox.unread == 1 && !bulkInbox.items[1].isRead)
        bulk.allReadAccepted = true
        let acceptedAll = await bulkInbox.markRead(ids: ["one", "two", "three"], all: true)
        precondition(acceptedAll && bulk.allReadCalls == 2 && bulkInbox.unread == 0 && bulkInbox.items.allSatisfy(\.isRead))
        bulkInbox.reset(for: "bob")
        let wrongOwner = await bulkInbox.markRead(ids: [], all: true)
        precondition(!wrongOwner && bulk.allReadCalls == 2 && bulkInbox.items.isEmpty)
        let cycling = Foir(), cycleInbox = NotificationInbox(foir: cycling)
        cycleInbox.reset(for: "alice")
        cycling.answers = [.success(InboxAnswer(["one"], after: "a")),
            .success(InboxAnswer(["two"], after: "b")), .success(InboxAnswer(["three"], after: "a"))]
        let cycleCompleted = await cycleInbox.loadAll()
        precondition(!cycleCompleted && cycleInbox.failed && cycling.cursors == [nil, "a", "b"])
        print("Native inbox controls passed: refresh/page/read retry, all-page selection, selected/bulk reads, offline reading, refusal and wrong-account controls.")
    }
}
