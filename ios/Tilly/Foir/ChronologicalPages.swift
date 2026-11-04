import Foundation

/// Merge independent date-ordered cursors without consuming another lane when
/// a request fails. Empty filtered pages still advance to the next real row.
@MainActor
final class ChronologicalPages<Row: Identifiable> {
    typealias Read = (String?) async throws -> (rows: [Row], next: String?)
    private struct Lane {
        let read: Read
        var rows: [Row] = []
        var after: String?
        var done = false
        var cursors = Set<String>()
    }
    private var lanes: [Lane]
    private var seen = Set<Row.ID>()
    private let date: (Row) -> Date
    var finished: Bool { lanes.allSatisfy { $0.done && $0.rows.isEmpty } }

    init(_ reads: [Read], date: @escaping (Row) -> Date) {
        lanes = reads.map { Lane(read: $0) }
        self.date = date
    }

    func next(_ count: Int = 20) async throws -> (rows: [Row], next: String?) {
        var draft = lanes, visited = seen, result: [Row] = []
        var requests = 0
        while result.count < count {
            for index in draft.indices {
                while draft[index].rows.isEmpty && !draft[index].done {
                    requests += 1
                    guard requests <= 200 else { throw PaginationFailure.tooManyEmptyPages }
                    let page = try await draft[index].read(draft[index].after)
                    if let cursor = page.next, !draft[index].cursors.insert(cursor).inserted { throw PaginationFailure.repeatedCursor }
                    draft[index].rows = page.rows
                    draft[index].after = page.next
                    draft[index].done = page.next == nil
                }
            }
            let heads = draft.indices.filter { !draft[$0].rows.isEmpty }
            guard let newest = heads.max(by: { date(draft[$0].rows[0]) < date(draft[$1].rows[0]) }) else { break }
            let row = draft[newest].rows.removeFirst()
            if visited.insert(row.id).inserted { result.append(row) }
        }
        lanes = draft
        seen = visited
        return (result, draft.contains { !$0.done || !$0.rows.isEmpty } ? "more" : nil)
    }
}
