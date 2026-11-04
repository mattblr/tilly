import PhosphorSwift
import SwiftUI

/// A cat photo from Fóir's CDN, with a quiet placeholder while it loads and a
/// cat where a record has no photo.
///
/// A photo already seen is drawn at once, from memory, so a view that appears
/// with an animation carries its photo with it instead of filling in later.
struct CatPhoto: View {
    let url: URL?

    @State private var image: UIImage?
    @State private var failed = false

    init(url: URL?) {
        self.url = url
        _image = State(initialValue: url.flatMap(PhotoLoader.cached))
    }

    var body: some View {
        Group {
            if let image {
                Image(uiImage: image).resizable().scaledToFill()
            } else {
                Theme.raised.overlay {
                    if url == nil || failed { Icon(icon: .cat, size: 28).foregroundStyle(Theme.muted) }
                }
            }
        }
        .task(id: url) {
            guard let url else { return image = nil }
            if let known = PhotoLoader.cached(url) { return image = known }
            let loaded = await PhotoLoader.image(at: url)
            withAnimation(.easeOut(duration: 0.2)) {
                image = loaded
                failed = loaded == nil
            }
        }
    }
}

/// A cat record's photo, at the size a screen wants.
extension FoirAPI.PhotoThumb {
    var thumbnailURL: URL? { (webp?.thumbnail?.url ?? url).flatMap(URL.init(string:)) }
    var mediumURL: URL? { (webp?.medium?.url ?? url).flatMap(URL.init(string:)) }
    var fullURL: URL? { url.flatMap(URL.init(string:)) }
}

/// Loads remote photos, keeping the ones seen recently in memory.
@MainActor enum PhotoLoader {
    private static var generation = 0
    // NSCache is safe to use from any thread; Swift can't see that.
    nonisolated(unsafe) private static let memory: NSCache<NSURL, UIImage> = {
        let cache = NSCache<NSURL, UIImage>()
        cache.totalCostLimit = 120 * 1024 * 1024
        return cache
    }()

    static func cached(_ url: URL) -> UIImage? {
        memory.object(forKey: url as NSURL)
    }

    static func forget() {
        generation += 1
        memory.removeAllObjects()
        URLCache.shared.removeAllCachedResponses()
    }

    static func image(at url: URL?) async -> UIImage? {
        guard let url else { return nil }
        let started = generation
        if let known = cached(url) { return known }
        guard let (data, _) = try? await URLSession.shared.data(from: url), let image = UIImage(data: data) else { return nil }
        let decoded = await image.byPreparingForDisplay() ?? image
        guard started == generation, !Task.isCancelled else {
            URLCache.shared.removeCachedResponse(for: URLRequest(url: url))
            return nil
        }
        memory.setObject(decoded, forKey: url as NSURL, cost: data.count * 4)
        return decoded
    }
}
