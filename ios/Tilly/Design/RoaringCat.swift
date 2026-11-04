import SwiftUI

/// Tilly's loading animation: the marketing site's pixel cat, roaring on a
/// loop. The site scrubs the same 61 frames with the page's scroll.
struct RoaringCat: View {
    @Environment(AppModel.self) private var model
    var size: CGFloat = 88
    /// What is loading, for VoiceOver and under the cat.
    var label: String?

    static let frameCount = 61
    static let framesPerSecond = 20.0

    private static let frames: [UIImage] = (1...frameCount).compactMap {
        UIImage(named: String(format: "RoaringCat/frame_%03d", $0))
    }

    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        VStack(spacing: 10) {
            TimelineView(.animation(minimumInterval: 1 / Self.framesPerSecond, paused: reduceMotion)) { timeline in
                if let frame = frame(at: timeline.date) {
                    Image(uiImage: frame)
                        .resizable()
                        .interpolation(.none)
                        .scaledToFit()
                }
            }
            .frame(width: size, height: size)
            if let label {
                Text(label).font(.meta).foregroundStyle(Theme.muted)
            }
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(label ?? model.config.t("common.loading"))
    }

    private func frame(at date: Date) -> UIImage? {
        guard !Self.frames.isEmpty else { return nil }
        // Holding still, the cat sits mid-roar rather than mid-blink.
        if reduceMotion { return Self.frames[Self.frames.count / 2] }
        let index = Int(date.timeIntervalSinceReferenceDate * Self.framesPerSecond) % Self.frames.count
        return Self.frames[index]
    }
}

/// The loader in the middle of the space a screen's content will fill.
struct Loading: View {
    var label: String?
    var minHeight: CGFloat = 220

    var body: some View {
        RoaringCat(label: label)
            .frame(maxWidth: .infinity, minHeight: minHeight)
    }
}

/// The small loader at the foot of a list while its next page comes.
struct LoadingMore: View {
    var body: some View {
        RoaringCat(size: 44).frame(maxWidth: .infinity).padding(.vertical, 14)
    }
}
