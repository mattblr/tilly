import Foundation

/// A photo's badge for a challenge it verifiably met. The title and badge picture
/// come from the published challenge; remote strings never select assets or execute markup.
struct PostHighlight: Identifiable, Equatable, Sendable {
    let id: String
    let title: String
    let badge: URL?
}

enum PostHighlightFailure: Error { case invalidCatalog, invalidSelection }

extension PostHighlight {
    /// Display metadata only, including for challenges that have ended. This
    /// never awards a badge: a photo shows one only for its verified results.
    static func fromChallenges(_ rows: [[String: Any]]) throws -> [PostHighlight] {
        guard rows.count <= 32 else { throw PostHighlightFailure.invalidCatalog }
        var found: [String: PostHighlight] = [:]
        for row in rows {
            guard let key = row["highlightKey"] as? String, validKey(key), found[key] == nil,
                  let title = row["title"] as? String
            else { throw PostHighlightFailure.invalidCatalog }
            let displayTitle = bounded(title, utf16: 60)
            guard !displayTitle.isEmpty else { throw PostHighlightFailure.invalidCatalog }
            found[key] = PostHighlight(id: key, title: displayTitle, badge: BadgeImage.url(row["badge"] as? String))
        }
        return found.values.sorted { $0.id < $1.id }
    }

    static func validKey(_ value: String) -> Bool {
        value.range(of: "^[a-z][a-z0-9-]{0,39}(?![\\s\\S])", options: .regularExpression) != nil
    }

    private static func bounded(_ value: String, utf16 limit: Int) -> String {
        var result = ""
        for character in value.trimmingCharacters(in: .whitespacesAndNewlines) {
            guard result.utf16.count + String(character).utf16.count <= limit else { break }
            result.append(character)
        }
        return result
    }
}
