import Foundation

/// Validated semantic tokens, independent of UIKit and the network. Camera
/// contrast, illustration pigments and system control sizes are not theme slots.
struct ThemeValues: Codable, Equatable, Sendable {
    struct Token: Sendable { let name: String; let value: String }
    private(set) var colors: [String: UInt32]
    private(set) var margin: Double
    private(set) var photoCorner: Double

    static let colorNames = ["lightBg", "darkBg", "lightSurface", "darkSurface",
        "lightInk", "darkInk", "lightMuted", "darkMuted", "lightRule", "darkRule",
        "lightSignal", "darkSignal", "brand", "lightOnSignal", "darkOnSignal"]

    static let bundled: Self = {
        guard let url = Bundle.main.url(forResource: "DesignTokens", withExtension: "json"),
              let data = try? Data(contentsOf: url), let values = try? Self(document: data)
        else { preconditionFailure("The bundled design-token defaults are missing or invalid.") }
        return values
    }()

    init(document: Data) throws {
        guard let groups = try JSONSerialization.jsonObject(with: document) as? [String: Any],
              let palette = groups["color"] as? [String: Any],
              let spacing = groups["spacing"] as? [String: Any],
              let radius = groups["radius"] as? [String: Any]
        else { throw InvalidDocument() }
        var colors: [String: UInt32] = [:]
        for name in Self.colorNames {
            guard let entry = palette[name] as? [String: Any], let value = entry["$value"] as? String,
                  let color = Self.color(value) else { throw InvalidDocument() }
            colors[name] = color
        }
        guard let gutter = spacing["pageGutter"] as? [String: Any], let gutterValue = gutter["$value"] as? String,
              let margin = Self.dimension(gutterValue, maximum: 96),
              let photo = radius["photo"] as? [String: Any], let photoValue = photo["$value"] as? String,
              let corner = Self.dimension(photoValue, maximum: 80) else { throw InvalidDocument() }
        self.colors = colors; self.margin = margin; self.photoCorner = corner
    }

    /// Each successful published snapshot starts from bundled defaults: removing
    /// an override restores its default. A failed fetch never calls this method.
    func resolving(colors: [Token], spacings: [Token], radii: [Token]) -> Self {
        var next = self
        for token in colors where self.colors[token.name] != nil {
            if let color = Self.color(token.value) { next.colors[token.name] = color }
        }
        if let value = spacings.last(where: { $0.name == "pageGutter" }),
           let margin = Self.dimension(value.value, maximum: 96) { next.margin = margin }
        if let value = radii.last(where: { $0.name == "photo" }),
           let corner = Self.dimension(value.value, maximum: 80) { next.photoCorner = corner }
        return next
    }

    /// Disk cache is revalidated too; decoding an old/corrupt cache cannot
    /// inject missing palette entries or unusable layout dimensions.
    func validated(against defaults: Self) -> Self {
        var next = defaults
        for (name, value) in colors where defaults.colors[name] != nil && value <= 0xFFFFFF { next.colors[name] = value }
        if margin.isFinite && (0...96).contains(margin) { next.margin = margin }
        if photoCorner.isFinite && (0...80).contains(photoCorner) { next.photoCorner = photoCorner }
        return next
    }

    private static func color(_ value: String) -> UInt32? {
        guard value.range(of: "^#[0-9a-fA-F]{6}$", options: .regularExpression) != nil else { return nil }
        return UInt32(value.dropFirst(), radix: 16)
    }

    private static func dimension(_ value: String, maximum: Double) -> Double? {
        guard value.range(of: "^(?:[0-9]*\\.)?[0-9]+(?:px|rem)$", options: .regularExpression) != nil else { return nil }
        let rem = value.hasSuffix("rem")
        guard let number = Double(value.dropLast(rem ? 3 : 2)) else { return nil }
        let points = number * (rem ? 16 : 1)
        return points.isFinite && (0...maximum).contains(points) ? points : nil
    }

    private struct InvalidDocument: Error {}
}
