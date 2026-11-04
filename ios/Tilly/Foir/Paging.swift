import Apollo
import Foundation
import SwiftUI

/// Read bounded pages and always follow `pageInfo`, including for filter batches.
/// The platform's pagination contract is being tightened to reject oversized
/// requests explicitly. Keeping each request at 100 works with either contract.
enum Paging {
    static let pageSize = 100

    /// Every row of a list, reading each page after the last.
    static func all<Row>(_ read: (_ after: String?) async throws -> (rows: [Row], page: FoirAPI.More)) async throws -> [Row] {
        var rows: [Row] = []
        var after: String?
        var seen = Set<String>()
        repeat {
            let (more, page) = try await read(after)
            rows += more
            if page.hasNextPage && page.endCursor == nil { throw PaginationFailure.missingCursor }
            after = page.next
            if let cursor = after, !seen.insert(cursor).inserted { throw PaginationFailure.repeatedCursor }
        } while after != nil
        return rows
    }

    /// Every row a filter on these values matches, read in pieces of up to 100 values.
    static func all<Value, Row>(
        in values: some Collection<Value>,
        _ read: (_ piece: [Value], _ after: String?) async throws -> (rows: [Row], page: FoirAPI.More)
    ) async throws -> [Row] {
        var rows: [Row] = []
        for piece in pieces(values) {
            rows += try await all { try await read(piece, $0) }
        }
        return rows
    }

    /// Values cut into pieces one filter can carry.
    static func pieces<Value>(_ values: some Collection<Value>, of size: Int = pageSize) -> [[Value]] {
        let list = Array(values)
        return stride(from: 0, to: list.count, by: size).map { Array(list[$0..<min($0 + size, list.count)]) }
    }
}

extension FoirAPI.More {
    /// Where the next page starts, or nil on the last one.
    var next: String? { hasNextPage ? endCursor : nil }
}

extension GraphQLNullable {
    /// A value that may be missing: a missing one is left out of the request.
    static func maybe(_ value: Wrapped?) -> Self { value.map { .some($0) } ?? .none }
}

/// A list read a page at a time as the user scrolls. Each read answers its
/// rows and where the next page starts.
@MainActor @Observable
final class Paged<Row: Identifiable> {
    private(set) var rows: [Row] = []
    private(set) var loading = false
    private(set) var finished = false
    private(set) var failure: String?
    /// True once the first page has come back, even empty.
    private(set) var started = false

    private let read: (_ after: String?) async throws -> (rows: [Row], next: String?)
    private var after: String?
    private var generation = 0
    private let cursorBased: Bool

    init(cursorBased: Bool = true, _ read: @escaping (_ after: String?) async throws -> (rows: [Row], next: String?)) {
        self.read = read
        self.cursorBased = cursorBased
    }

    /// Starts again from the first page.
    func reload() async {
        generation += 1
        after = nil
        finished = false
        loading = false
        await loadMore(replacing: true)
    }

    /// The next page, unless one is already coming or there are no more.
    func loadMore() async {
        await loadMore(replacing: false)
    }

    /// Asks for the next page when this row is near the end of what's shown.
    func reached(_ row: Row) async {
        guard let index = rows.firstIndex(where: { $0.id == row.id }), index >= rows.count - 5 else { return }
        await loadMore()
    }

    private func loadMore(replacing: Bool) async {
        guard !loading, !finished else { return }
        let mine = generation
        loading = true
        // The read runs as a task of its own. The view that asked for it may
        // be gone before it answers, a row scrolled away or a list pulled to
        // refresh; its going mustn't cancel the page the list is waiting on.
        let page = Task { @MainActor [self] in
            defer { if mine == generation { loading = false } }
            do {
                var cursor = after
                var visited = Set<String>()
                var known: Set<Row.ID> = replacing ? [] : Set(rows.map(\.id))
                var incoming: [Row] = []
                var pages = 0
                repeat {
                    let (more, next) = try await read(cursor)
                    guard mine == generation else { return }
                    if cursorBased, let next, next == cursor || !visited.insert(next).inserted {
                        throw PaginationFailure.repeatedCursor
                    }
                    incoming += more.filter { known.insert($0.id).inserted }
                    cursor = next
                    pages += 1
                    if pages >= 200 && incoming.isEmpty && cursor != nil { throw PaginationFailure.tooManyEmptyPages }
                } while incoming.isEmpty && cursor != nil
                rows = (replacing ? [] : rows) + incoming
                after = cursor
                finished = cursor == nil
                failure = nil
            } catch {
                guard mine == generation, !Self.wasCancelled(error) else { return }
                failure = UserFailure.key(error)
            }
            started = true
        }
        await page.value
    }

    /// A read given up on is not a failure to tell anyone about.
    static func wasCancelled(_ error: any Error) -> Bool {
        error is CancellationError || (error as? URLError)?.code == .cancelled
    }
}

/// Loads a screen when `id` changes. `.task(id:)` alone also runs every time a
/// view reappears, so coming back from a detail page would read the list again
/// and lose the user's place. A load that was cut short runs again next time;
/// a nil `id` means not now, and forgets nothing.
private struct LoadWhenChanged<ID: Hashable>: ViewModifier {
    let id: ID?
    let load: @MainActor () async -> Void

    @State private var loaded: ID?

    func body(content: Content) -> some View {
        content.task(id: id) {
            guard let id, loaded != id else { return }
            await load()
            if !Task.isCancelled { loaded = id }
        }
    }
}

extension View {
    func loadWhenChanged<ID: Hashable>(id: ID?, _ load: @escaping @MainActor () async -> Void) -> some View {
        modifier(LoadWhenChanged(id: id, load: load))
    }
}

/// Malformed continuation must be visible rather than masquerading as a complete list.
enum PaginationFailure: LocalizedError {
    case missingCursor, repeatedCursor, tooManyEmptyPages
    var errorDescription: String? {
        switch self {
        case .missingCursor: "More results were reported without a continuation cursor. Try again."
        case .repeatedCursor: "The list did not advance. Try again."
        case .tooManyEmptyPages: "The list could not reach the next visible result. Try again."
        }
    }
}
