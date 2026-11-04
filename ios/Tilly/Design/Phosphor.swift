import SwiftUI

/// Phosphor icons (phosphoricons.com, MIT licence: licenses/phosphor-icons.txt).
/// Only the icons Tilly names in code are bundled, in regular and fill weights,
/// from the app's asset catalogue (`Assets.xcassets/Phosphor`). The full Phosphor
/// package compiled 9,108 icon sets on every clean build. Badges for streak tiers
/// and challenges are pictures uploaded in the console, not icons.
///
/// To add an icon: copy its `<name>.imageset` and `<name>-fill.imageset` from
/// Phosphor (github.com/phosphor-icons/core) into `Assets.xcassets/Phosphor` and
/// add a case here.
enum Ph: String, CaseIterable, Identifiable {
    case airplaneTakeoff = "airplane-takeoff"
    case bellSimple = "bell-simple"
    case cameraRotate = "camera-rotate"
    case caretDown = "caret-down"
    case caretRight = "caret-right"
    case cat = "cat"
    case checkCircle = "check-circle"
    case city = "city"
    case export = "export"
    case flame = "flame"
    case globe = "globe"
    case heart = "heart"
    case lightning = "lightning"
    case lightningA = "lightning-a"
    case lightningSlash = "lightning-slash"
    case mapPin = "map-pin"
    case paintBrush = "paint-brush"
    case plus = "plus"
    case `repeat` = "repeat"
    case sparkle = "sparkle"
    case trophy = "trophy"

    var id: Self { self }

    var regular: Image { Self.icon(rawValue) }
    var fill: Image { Self.icon("\(rawValue)-fill") }

    private static func icon(_ name: String) -> Image {
        Image(name).interpolation(.medium).resizable()
    }
}
