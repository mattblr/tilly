import Foundation

extension Foir {
    /// Badge titles and pictures, from published challenges.
    func postHighlightCatalog(ifIdentity identity: TokenStore.Identity? = nil) async throws -> [PostHighlight] {
        let expected = if let identity { identity } else { await tokens.identity }
        var rows: [[String: Any]] = [], cursor: String?, cursors = Set<String>()
        repeat {
            let page = try await fetch(ChallengeAPI.ChallengeCatalogQuery(after: .maybe(cursor)), ifIdentity: expected).photoChallenges
            for edge in page.edges {
                let row = edge.node
                var entry: [String: Any] = [:]
                entry["highlightKey"] = row.highlightKey
                entry["title"] = row.title
                entry["badge"] = row.badge?.url
                rows.append(entry)
            }
            guard rows.count <= 32 else { throw PostHighlightFailure.invalidCatalog }
            if !page.pageInfo.hasNextPage { break }
            guard let next = page.pageInfo.endCursor else { throw PaginationFailure.missingCursor }
            guard cursors.count < 32, cursors.insert(next).inserted else { throw PaginationFailure.repeatedCursor }
            cursor = next
        } while cursor != nil
        return try PostHighlight.fromChallenges(rows)
    }

    /// The challenge badges each photo verifiably earned.
    func captureHighlightKeys(_ ids: [String]) async throws -> [String: Set<String>] {
        var result: [String: Set<String>] = [:]
        for keys in Paging.pieces(Array(Set(ids))) {
            var after: String?, seen = Set<String>()
            repeat {
                let page = try await fetch(SelfieAPI.CaptureHighlightsQuery(ids: .some(keys), after: .maybe(after))).capturePhotos
                for edge in page.edges {
                    let row = edge.node
                    var earned = Set<String>()
                    if let verified = row.challengeHighlights, verified != .null {
                        guard let entries = verified.array, entries.count <= 32 else { throw PostHighlightFailure.invalidSelection }
                        for entry in entries {
                            guard let key = entry["highlightKey"]?.string, PostHighlight.validKey(key),
                                  let challenge = entry["challengeKey"]?.string, PostHighlight.validKey(challenge),
                                  let digest = entry["criteriaDigest"]?.string,
                                  digest.range(of: "^[a-f0-9]{64}$", options: .regularExpression) != nil
                            else { throw PostHighlightFailure.invalidSelection }
                            earned.insert(key)
                        }
                    }
                    result[row._id] = earned
                }
                guard page.pageInfo.hasNextPage else { break }
                guard let next = page.pageInfo.endCursor, seen.insert(next).inserted else { throw PaginationFailure.repeatedCursor }
                after = next
            } while after != nil
        }
        return result
    }
}
