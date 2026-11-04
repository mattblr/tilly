import Foundation
struct Row: Identifiable { let id: Int }
enum FoirAPI { struct More { var hasNextPage: Bool; var endCursor: String? } }
enum GraphQLNullable<Wrapped> { case some(Wrapped), none }
@main struct Checks {
 @MainActor static func main() async throws {
  let bulk = try await Paging.all { after in
   let start = Int(after ?? "0")!
   let end = min(start + 100, 205)
   return (Array(start..<end), FoirAPI.More(hasNextPage: end < 205, endCursor: end < 205 ? String(end) : nil))
  }
  precondition(bulk == Array(0..<205))
  do { _ = try await Paging.all { _ in ([1],FoirAPI.More(hasNextPage:true,endCursor:"same")) }; fatalError("Repeated cursor silently accepted") } catch PaginationFailure.repeatedCursor {}
  do { _ = try await Paging.all { _ in ([1],FoirAPI.More(hasNextPage:true,endCursor:nil)) }; fatalError("Missing cursor silently accepted") } catch PaginationFailure.missingCursor {}
  var reads = 0
  let empty = Paged<Row> { after in
   reads += 1
   return after == nil ? ([],"next") : ([Row(id:1),Row(id:1)],nil)
  }
  await empty.reload()
  precondition(reads == 2 && empty.rows.count == 1 && empty.finished)
  var attempt = 0
  let retry = Paged<Row> { after in
   if after == nil { return ([Row(id:1)],"next") }
   attempt += 1
   if attempt == 1 { throw URLError(.notConnectedToInternet) }
   return ([Row(id:1),Row(id:2)],nil)
  }
  await retry.reload(); await retry.loadMore()
  precondition(retry.rows.map(\.id) == [1] && retry.failure != nil && !retry.finished)
  await retry.loadMore()
  precondition(retry.rows.map(\.id) == [1,2] && retry.finished && retry.failure == nil)
  let repeatPage = Paged<Row> { after in ([Row(id:1)],"same") }
  await repeatPage.reload(); await repeatPage.loadMore()
  precondition(repeatPage.failure != nil && !repeatPage.finished && repeatPage.rows.count == 1)
  var sourceIndex = 0
  let source = Paged<Row>(cursorBased:false) { _ in sourceIndex += 1; return ([Row(id:sourceIndex)],sourceIndex < 3 ? "more" : nil) }
  await source.reload(); await source.loadMore(); await source.loadMore()
  precondition(source.rows.map(\.id) == [1,2,3] && source.finished)
  var firstReads = 0, failLane = true
  let merged = ChronologicalPages<Row>([
   { _ in firstReads += 1; return ([Row(id:3),Row(id:1)],nil) },
   { after in
    if after == nil { return ([],"empty") }
    if failLane { failLane = false; throw URLError(.notConnectedToInternet) }
    return ([Row(id:2),Row(id:1)],nil)
   }
  ], date: { Date(timeIntervalSince1970: Double($0.id)) })
  do { _ = try await merged.next(1); fatalError("Failed lane did not throw") } catch is URLError {}
  let newest = try await merged.next(1)
  precondition(newest.rows.map(\.id) == [3] && firstReads == 2)
  let rest = try await merged.next(20)
  precondition(rest.rows.map(\.id) == [2,1] && rest.next == nil && merged.finished)
  let badMerge = ChronologicalPages<Row>([{ _ in ([],"same") }], date: { _ in .distantPast })
  do { _ = try await badMerge.next(); fatalError("Repeated empty lane cursor silently accepted") } catch PaginationFailure.repeatedCursor {}
  print("Swift pagination: bulk >100, repeated/missing cursors, empty pages, duplicates, retry preservation synthetic feed continuation, date-ordered merge, failed-lane rollback and deduplication passed.")
 }
}
