import Foundation

@main struct AppearanceChecks {
    static func main() throws {
        func cat(_ index: Int) -> [String: Any] {
            ["index": index, "status": "unknown", "possibilities": [String](), "coatLength": "unknown", "pattern": "mixed"]
        }
        let tags = [["key": "a", "catId": "cat00000000001"], ["key": "b", "catId": "cat00000000002"]]
        func read(_ cats: [[String: Any]], _ tags: [[String: String]], catId: String? = nil) throws -> [AppearanceChoice]? {
            AppearanceChoice.read(try JSONSerialization.data(withJSONObject: ["answer": ["cats": cats], "tags": tags]), catId: catId)
        }
        let positive = try read([cat(1), cat(0)], tags, catId: "cat00000000002")
        precondition(positive?.map(\.id) == [1] && positive?.first?.pattern == "mixed")
        let foreign = try read([cat(0), cat(1)], tags, catId: "cat00000000003")
        precondition(foreign == [])
        func absent(_ value: [AppearanceChoice]?) { precondition(value == nil) }
        absent(try read([cat(0), cat(0)], tags))
        var certainty = cat(0); certainty["confidence"] = 0.99
        absent(try read([certainty], [tags[0]]))
        for label in ["https://example.test", "<label>", "hidden\u{200B}"] {
            var linked = cat(0); linked["status"] = "possible"; linked["possibilities"] = [label]
            absent(try read([linked], [tags[0]]))
        }
        var noCat = cat(0); noCat["status"] = "no_cat"
        absent(try read([noCat], [tags[0]]))
        absent(try read((0..<9).map(cat), (0..<9).map { ["key": "\($0)", "catId": "cat00000000001"] }))
        print("Native appearance controls pass: mixed patterns, tag mapping, malformed/certainty/link refusals and bounds.")
    }
}
