import Foundation

struct AppearanceChoice: Identifiable, Equatable {
    let id: Int
    let status: String
    let possibilities: [String]
    let coat: String
    let pattern: String

    private struct Stored: Decodable {
        struct Answer: Decodable {
            struct Cat: Decodable {
                let index: Int
                let status: String
                let possibilities: [String]
                let coatLength: String
                let pattern: String
            }
            let cats: [Cat]
        }
        struct Tag: Decodable { let key: String; let catId: String }
        let answer: Answer
        let tags: [Tag]
    }

    /// Read only the strict private answer and its tag mapping. Malformed
    /// data never becomes a suggestion attached to a different tagged cat.
    static func read(_ data: Data, catId: String?) -> [Self]? {
        guard data.count <= 16_000,
              let root = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any], Set(root.keys) == ["answer", "tags"],
              let answer = root["answer"] as? [String: Any], Set(answer.keys) == ["cats"],
              let rows = answer["cats"] as? [[String: Any]],
              rows.allSatisfy({ Set($0.keys) == ["index", "status", "possibilities", "coatLength", "pattern"] }),
              let tags = root["tags"] as? [[String: Any]], tags.allSatisfy({ Set($0.keys) == ["key", "catId"] }),
              let stored = try? JSONDecoder().decode(Stored.self, from: data),
              (1...8).contains(stored.tags.count), stored.answer.cats.count == stored.tags.count,
              stored.tags.allSatisfy({ !$0.key.isEmpty && $0.key.count <= 80 && $0.catId.range(of: "^[a-z0-9]{10,40}$", options: .regularExpression) != nil }),
              Set(stored.tags.map(\.key)).count == stored.tags.count else { return nil }
        var found: [Self] = [], indices = Set<Int>()
        for cat in stored.answer.cats {
            guard stored.tags.indices.contains(cat.index), indices.insert(cat.index).inserted,
                  ["possible", "mixed", "unknown", "no_cat"].contains(cat.status), cat.possibilities.count <= 3,
                  Set(cat.possibilities).count == cat.possibilities.count,
                  Set(cat.possibilities.map { $0.lowercased() }).count == cat.possibilities.count,
                  cat.possibilities.allSatisfy({ !$0.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && $0.count <= 60 &&
                      !$0.contains("<") && !$0.contains(">") && $0.range(of: "https?:|www\\.", options: [.regularExpression, .caseInsensitive]) == nil &&
                      !$0.unicodeScalars.contains(where: { [.control, .format].contains($0.properties.generalCategory) }) }),
                  (!["unknown", "no_cat"].contains(cat.status) || cat.possibilities.isEmpty),
                  (cat.status != "possible" || !cat.possibilities.isEmpty),
                  (cat.status != "no_cat" || (cat.coatLength == "unknown" && cat.pattern == "unknown")),
                  ["short", "medium", "long", "unknown"].contains(cat.coatLength),
                  ["solid", "tabby", "bicolour", "tricolour", "colourpoint", "tortoiseshell", "mixed", "unknown"].contains(cat.pattern)
            else { return nil }
            if catId == nil || stored.tags[cat.index].catId == catId {
                found.append(Self(id: cat.index, status: cat.status, possibilities: cat.possibilities, coat: cat.coatLength, pattern: cat.pattern))
            }
        }
        return found.sorted { $0.id < $1.id }
    }
}
