import PhosphorSwift
import Observation
import SwiftUI

@MainActor @Observable
private final class ThemeState {
    static let shared = ThemeState()
    var values = ThemeValues.bundled
}

/// Tilly's look: porcelain and charcoal surfaces that keep a cat's own colours
/// true, and one signal blue for the action that matters on each screen.
@MainActor enum Theme {
    static var snapshot: ThemeValues { ThemeState.shared.values }
    static func apply(_ values: ThemeValues) { ThemeState.shared.values = values.validated(against: .bundled) }
    private static func color(_ suffix: String) -> Color {
        let values = snapshot
        return Color(light: values.colors["light\(suffix)"]!, dark: values.colors["dark\(suffix)"]!)
    }
    static var background: Color { color("Bg") }
    static var raised: Color { color("Surface") }
    static var ink: Color { color("Ink") }
    static var muted: Color { color("Muted") }
    static var rule: Color { color("Rule") }
    static var signal: Color { color("Signal") }
    /// Tilly's blue, the same in both modes, for full-colour screens.
    static var brand: Color { Color(light: snapshot.colors["brand"]!, dark: snapshot.colors["brand"]!) }
    static var onSignal: Color { color("OnSignal") }

    /// The screen margin.
    static var margin: CGFloat { CGFloat(snapshot.margin) }
    static var photoCorner: CGFloat { CGFloat(snapshot.photoCorner) }
}

extension Color {
    init(light: UInt32, dark: UInt32) {
        self.init(uiColor: UIColor { traits in
            UIColor(rgb: traits.userInterfaceStyle == .dark ? dark : light)
        })
    }
}

private extension UIColor {
    convenience init(rgb: UInt32) {
        self.init(
            red: CGFloat((rgb >> 16) & 0xFF) / 255,
            green: CGFloat((rgb >> 8) & 0xFF) / 255,
            blue: CGFloat(rgb & 0xFF) / 255,
            alpha: 1
        )
    }
}

extension Font {
    static let screenTitle = Font.system(size: 27, weight: .semibold)
    static let sectionTitle = Font.system(size: 20, weight: .semibold)
    static let body15 = Font.system(size: 15)
    static let meta = Font.system(size: 13)
}

/// The italic wordmark, Tilly's one piece of brand type.
struct Wordmark: View {
    @Environment(AppModel.self) private var model
    var color = Theme.ink
    var size: CGFloat = 31

    var body: some View {
        Text(model.config.t("website.brand").lowercased())
            .font(.custom("Georgia-Italic", size: size))
            .kerning(-size / 15)
            .foregroundStyle(color)
            .accessibilityLabel(model.config.t("website.brand"))
    }
}

/// A Phosphor icon, regular weight, at the design's 19 pt.
struct Icon: View {
    let icon: Ph
    var size: CGFloat = 19

    var body: some View {
        icon.regular
            .frame(width: size, height: size)
            .accessibilityHidden(true)
    }
}

/// The screen's one dominant action: signal blue, full width.
struct PrimaryButtonStyle: ButtonStyle {
    @Environment(\.isEnabled) private var isEnabled

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.body15.weight(.semibold))
            .frame(maxWidth: .infinity, minHeight: 46)
            .padding(.horizontal, 16)
            .foregroundStyle(Theme.onSignal)
            .background(Theme.signal.opacity(isEnabled ? 1 : 0.4), in: Capsule())
            .opacity(configuration.isPressed ? 0.85 : 1)
    }
}

/// A quieter action on a raised surface.
struct SecondaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.body15)
            .frame(maxWidth: .infinity, minHeight: 46)
            .padding(.horizontal, 16)
            .foregroundStyle(Theme.ink)
            .background(Theme.raised, in: Capsule())
            .opacity(configuration.isPressed ? 0.7 : 1)
    }
}

/// A text action with no surface, for "Skip for now" and back links.
struct PlainActionStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.body15)
            .foregroundStyle(Theme.ink)
            .frame(minHeight: 44)
            .contentShape(Rectangle())
            .opacity(configuration.isPressed ? 0.6 : 1)
    }
}

extension ButtonStyle where Self == PrimaryButtonStyle {
    static var primary: PrimaryButtonStyle { PrimaryButtonStyle() }
}

extension ButtonStyle where Self == SecondaryButtonStyle {
    static var secondary: SecondaryButtonStyle { SecondaryButtonStyle() }
}

/// An action that can't be undone, such as deleting the account: full width, in red.
struct DestructiveButtonStyle: ButtonStyle {
    @Environment(\.isEnabled) private var isEnabled

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.body15.weight(.semibold))
            .frame(maxWidth: .infinity, minHeight: 46)
            .padding(.horizontal, 16)
            .foregroundStyle(.white)
            .background(.red, in: Capsule())
            .opacity(!isEnabled ? 0.4 : configuration.isPressed ? 0.7 : 1)
    }
}

extension ButtonStyle where Self == DestructiveButtonStyle {
    static var destructive: DestructiveButtonStyle { DestructiveButtonStyle() }
}

extension ButtonStyle where Self == PlainActionStyle {
    static var plainAction: PlainActionStyle { PlainActionStyle() }
}

/// A screen's title and its quiet line beneath.
struct ScreenTitle: View {
    let title: String
    var subtitle: String?

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title)
                .font(.screenTitle)
                .kerning(-0.7)
                .foregroundStyle(Theme.ink)
            if let subtitle {
                Text(subtitle)
                    .font(.meta)
                    .foregroundStyle(Theme.muted)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.top, 12)
    }
}
