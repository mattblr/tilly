import PhosphorSwift
import SwiftUI

/// A capture's photo with its premium art behind it. A capture with art
/// glows; pressing and holding it turns photo into art, or art back into
/// photo, with a quick blur and dissolve. The user's own art still being
/// made says so.
struct ArtFlip<Photo: View>: View {
    let photoKey: String
    /// Whose capture this is, where offering Premium on it makes sense.
    var catcherId: String?
    @ViewBuilder let photo: Photo

    @Environment(AppModel.self) private var model
    @State private var showingArt = false
    @State private var showingPaywall = false

    /// Quick enough to feel like the photo changing, not a performance.
    static var morph: Animation { .easeInOut(duration: 0.28) }

    var body: some View {
        let piece = model.art.piece(for: photoKey)
        let ready = piece?.status == .ready && piece?.image != nil
        // The photo stays underneath, only blurring, so a press always lands on
        // something: a view that's fully transparent takes no touches.
        photo
            .blur(radius: showingArt ? 16 : 0)
            .overlay {
                if ready {
                    // Square art filling the photo's own frame, clipped to it.
                    Color.clear
                        .overlay { CatPhoto(url: piece?.image) }
                        .clipShape(RoundedRectangle(cornerRadius: Theme.photoCorner))
                        .blur(radius: showingArt ? 0 : 16)
                        .opacity(showingArt ? 1 : 0)
                        .allowsHitTesting(false)
                }
            }
            .overlay {
                if ready { IntelligenceGlow(cornerRadius: Theme.photoCorner) }
            }
            .overlay(alignment: .bottomTrailing) {
                if piece?.status == .making, piece?.ownerId == model.account?.userId {
                    Text(model.config.t("art.making", ["style": model.streaks.currentTier?.name ?? ""]))
                        .font(.system(size: 12, weight: .medium))
                        .foregroundStyle(.white)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 6)
                        .background(.black.opacity(0.45), in: Capsule())
                        .padding(10)
                }
            }
            .overlay(alignment: .bottomTrailing) {
                // The user's own catch, without art: what Premium would add.
                if piece == nil, !model.art.premium, let me = model.account?.userId, catcherId == me {
                    Button { showingPaywall = true } label: {
                        Label { Text(model.config.t("premium.chip")) } icon: { Ph.paintBrush.fill.frame(width: 13, height: 13) }
                            .font(.system(size: 12, weight: .medium))
                            .foregroundStyle(.white)
                            .padding(.horizontal, 10)
                            .padding(.vertical, 6)
                            .background(.black.opacity(0.45), in: Capsule())
                    }
                    .buttonStyle(.plain)
                    .padding(10)
                }
            }
            .fullScreenCover(isPresented: $showingPaywall) { PaywallView() }
            .contentShape(RoundedRectangle(cornerRadius: Theme.photoCorner))
            .onLongPressGesture(minimumDuration: 0.3) {
                guard ready else { return }
                withAnimation(Self.morph) { showingArt.toggle() }
            }
            .sensoryFeedback(.impact(weight: .medium), trigger: showingArt)
            .accessibilityHint(ready ? model.config.t(showingArt ? "art.flipBack" : "art.flip") : "")
            .accessibilityAction(named: model.config.t(showingArt ? "art.flipBack" : "art.flip")) {
                guard ready else { return }
                withAnimation(Self.morph) { showingArt.toggle() }
            }
    }
}

/// The soft moving glow round a photo that has art: Apple Intelligence's
/// colours, drawn as a turning gradient along the edge in a few blurred
/// layers. It holds still when the user asks for less motion.
struct IntelligenceGlow: View {
    var cornerRadius: CGFloat

    static let colours: [Color] = [
        Color(red: 0.74, green: 0.51, blue: 0.95),
        Color(red: 0.96, green: 0.73, blue: 0.92),
        Color(red: 0.55, green: 0.62, blue: 1.00),
        Color(red: 1.00, green: 0.40, blue: 0.47),
        Color(red: 1.00, green: 0.73, blue: 0.44),
        Color(red: 0.78, green: 0.53, blue: 1.00),
        Color(red: 0.74, green: 0.51, blue: 0.95),
    ]
    /// Seconds for the colours to go once round.
    static let turn = 6.0
    /// Slow colours don't need the screen's full rate, and each redraw is a blur.
    static let framesPerSecond = 15.0

    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        TimelineView(.animation(minimumInterval: 1 / Self.framesPerSecond, paused: reduceMotion)) { timeline in
            let angle = reduceMotion ? 0 : timeline.date.timeIntervalSinceReferenceDate.truncatingRemainder(dividingBy: Self.turn) / Self.turn * 360
            ZStack {
                edge(angle: angle, width: 2, blur: 0)
                edge(angle: angle, width: 7, blur: 6).opacity(0.8)
            }
            .drawingGroup()
        }
        .allowsHitTesting(false)
        .accessibilityHidden(true)
    }

    private func edge(angle: Double, width: CGFloat, blur: CGFloat) -> some View {
        RoundedRectangle(cornerRadius: cornerRadius)
            .strokeBorder(AngularGradient(colors: Self.colours, center: .center, angle: .degrees(angle)), lineWidth: width)
            .blur(radius: blur)
    }
}
