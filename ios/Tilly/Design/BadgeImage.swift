import SwiftUI

/// A badge picture uploaded in the console (streak tiers and challenges), or a
/// fallback icon while it loads, when it fails, or when there is none.
struct BadgeImage: View {
    let url: URL?
    var size: CGFloat = 20
    var fallback: Ph = .sparkle

    var body: some View {
        Group {
            if let url {
                AsyncImage(url: url) { phase in
                    if let image = phase.image {
                        image.resizable().scaledToFit()
                    } else {
                        fallback.fill
                    }
                }
            } else {
                fallback.fill
            }
        }
        .frame(width: size, height: size)
        .accessibilityHidden(true)
    }

    /// An uploaded badge's https address, or nothing. Remote strings never pick a local asset.
    static func url(_ value: String?) -> URL? {
        guard let value, let url = URL(string: value), url.scheme == "https", url.host() != nil else { return nil }
        return url
    }
}
