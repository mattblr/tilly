import Foundation

@main struct PostHighlightChecks {
    static func main() throws {
        let pumpkin: [String: Any] = ["highlightKey": "pumpkin", "title": "Happy Halloween!", "icon": "sparkles"]
        let selfie: [String: Any] = ["highlightKey": "selfie", "title": "Cat selfie", "icon": "selfie"]
        let catalog = try PostHighlight.fromChallenges([selfie, pumpkin])
        precondition(catalog.map(\.id) == ["pumpkin", "selfie"])
        precondition(catalog.last?.icon == .selfie && catalog.last?.title == "Cat selfie")
        let longTitle = String(repeating: "🐈", count: 100)
        let bounded = try PostHighlight.fromChallenges([pumpkin.merging(["title": longTitle, "icon": "https://invalid/icon"]) { _, new in new }])
        precondition(bounded.first?.title.utf16.count == 60 && bounded.first?.icon == .sparkles)
        for rows: [[String: Any]] in [[pumpkin, pumpkin], [pumpkin.merging(["highlightKey": "../file"]) { _, new in new }],
                                      [pumpkin.merging(["title": "  "]) { _, new in new }], Array(repeating: pumpkin, count: 33)] {
            do { _ = try PostHighlight.fromChallenges(rows); preconditionFailure("Malformed challenge metadata accepted") }
            catch PostHighlightFailure.invalidCatalog {}
        }
        for key in ["SELFIE", "selfie\n", "", String(repeating: "a", count: 41)] { precondition(!PostHighlight.validKey(key)) }
        print("Native challenge badge checks passed.")
    }
}
