import Foundation

struct CatAppearanceEvidence: Decodable {
    struct Count: Decodable { let label: String; let count: Int }
    struct Share: Identifiable { var id: String { label }; let label: String; let count: Int; let percent: Int }
    let samples: Int
    let breeds: [Count]
    let patterns: [Count]
    var breedShares: [Share] { shares(breeds) }
    var patternShares: [Share] { shares(patterns) }
    static func fromGroups(_ groups: [(String?, Int)], truncated: Bool) -> Self? {
        guard !truncated, groups.count <= 257 else { return nil }
        var samples = 0, breeds: [[String: Any]] = [], patterns: [[String: Any]] = []
        for (key, count) in groups {
            guard let key, count > 0 else { return nil }
            if key == "sample:photo" { samples = count; continue }
            let parts = key.split(separator: ":", maxSplits: 1).map(String.init)
            guard parts.count == 2, ["breed", "pattern"].contains(parts[0]) else { return nil }
            let row: [String: Any] = ["label": parts[0] == "breed" ? parts[1].capitalized : parts[1], "count": count]
            if parts[0] == "breed" { breeds.append(row) } else { patterns.append(row) }
        }
        guard let bytes = try? JSONSerialization.data(withJSONObject: ["samples": samples, "breeds": breeds, "patterns": patterns]) else { return nil }
        return read(bytes)
    }
    private func shares(_ rows: [Count]) -> [Share] {
        let sum = rows.reduce(0.0) { $0 + Double($1.count) }
        return rows.sorted { $0.count == $1.count ? $0.label < $1.label : $0.count > $1.count }
            .map { Share(label: $0.label, count: $0.count, percent: Int((Double($0.count) / sum * 100).rounded())) }
    }
    static func read(_ bytes: Data) -> Self? {
        guard bytes.count <= 32_768, let value = try? JSONDecoder().decode(Self.self, from: bytes),
              value.samples > 0, value.samples <= 1_000_000_000,
              !value.breeds.isEmpty || !value.patterns.isEmpty else { return nil }
        for rows in [value.breeds, value.patterns] {
            guard rows.count <= 128, Set(rows.map { $0.label.precomposedStringWithCompatibilityMapping.lowercased() }).count == rows.count,
                  rows.allSatisfy({ row in
                      row.count > 0 && row.count <= value.samples && !row.label.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && row.label.count <= 60 &&
                      row.label.range(of: "[\\p{Cc}\\p{Cf}<>]|https?:|www\\.", options: .regularExpression) == nil
                  }) else { return nil }
        }
        return value
    }
}
