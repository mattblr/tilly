import Foundation

@main struct ThemeChecks {
    static func main() throws {
        let data = try Data(contentsOf: URL(fileURLWithPath: CommandLine.arguments[1]))
        let defaults = try ThemeValues(document: data)
        precondition(defaults.colors.count == ThemeValues.colorNames.count)
        precondition(defaults.colors["lightSignal"] == 0x1558DF && defaults.margin == 20 && defaults.photoCorner == 10)
        let changed = defaults.resolving(
            colors: [.init(name: "lightSignal", value: "#123456"), .init(name: "darkSignal", value: "#AbCdEf"),
                     .init(name: "lightBg", value: "red;}body{display:none}"), .init(name: "unknown", value: "#123456")],
            spacings: [.init(name: "pageGutter", value: "1.5rem")], radii: [.init(name: "photo", value: "16px")])
        precondition(changed.colors["lightSignal"] == 0x123456 && changed.colors["darkSignal"] == 0xABCDEF)
        precondition(changed.colors["lightBg"] == defaults.colors["lightBg"] && changed.colors["unknown"] == nil)
        precondition(changed.margin == 24 && changed.photoCorner == 16)
        let restored = try JSONDecoder().decode(ThemeValues.self, from: JSONEncoder().encode(changed))
        precondition(restored == changed)
        for value in ["-1px", "100000px", "NaNpx", "Infinitypx", "calc(20px)", "20%", "20em", "", "1e2px"] {
            let rejected = defaults.resolving(colors: [], spacings: [.init(name: "pageGutter", value: value)], radii: [.init(name: "photo", value: value)])
            precondition(rejected == defaults, value)
        }
        let square = defaults.resolving(colors: [], spacings: [.init(name: "pageGutter", value: "0px")], radii: [.init(name: "photo", value: ".5rem")])
        precondition(square.margin == 0 && square.photoCorner == 8)
        // Published removal is resolved from defaults, not the previous override.
        precondition(defaults.resolving(colors: [], spacings: [], radii: []) == defaults)
        var corrupt = try JSONSerialization.jsonObject(with: JSONEncoder().encode(changed)) as! [String: Any]
        corrupt["colors"] = ["lightSignal": 0x1FFFFFF, "unknown": 1]
        corrupt["margin"] = 100000; corrupt["photoCorner"] = -1
        let repaired = try JSONDecoder().decode(ThemeValues.self, from: JSONSerialization.data(withJSONObject: corrupt)).validated(against: defaults)
        precondition(repaired == defaults)
        for invalid in [Data("{}".utf8), Data("[]".utf8), Data("null".utf8)] {
            do { _ = try ThemeValues(document: invalid); preconditionFailure("Invalid defaults accepted") }
            catch {}
        }
        print("Native theme: shared defaults, light/dark overrides, units, invalid values, cache round trip/repair and removal passed.")
    }
}
