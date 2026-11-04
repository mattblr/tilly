import Foundation

/// Notification text supplies only a destination within Tilly, never an external site.
enum NotificationLink {
    /// Only platform media is fetched; notification text cannot add tracking hosts.
    static func imageURL(_ value: String?) -> URL? {
        guard let value, let url = URL(string: value), url.scheme == "https",
              ["cdn.foir.dev", "cdn-dev.foir.dev"].contains(url.host ?? ""),
              url.user == nil, url.password == nil, url.port == nil || url.port == 443 else { return nil }
        return url
    }
    /// `site` is the website's origin (FoirConfig.site): its links open the same screens.
    static func url(_ value: String?, site: URL) -> URL? {
        guard let value, !value.isEmpty,
              value.range(of: #"[\\\s%?#]"#, options: .regularExpression) == nil else { return nil }
        var path = value
        if value.hasPrefix("tilly://") {
            guard let url = URL(string: value), url.user == nil, url.password == nil, url.port == nil,
                  let host = url.host else { return nil }
            let names = ["capture": "catch", "feed": "feed", "account": "account", "cat": "cats", "person": "people"]
            guard let name = names[host] else { return nil }
            path = "/\(name)\(url.path)"
        } else if value.hasPrefix(origin(of: site) + "/") {
            path = String(value.dropFirst(origin(of: site).count))
        }
        if ["/feed", "/catch", "/account"].contains(path) {
            return URL(string: "tilly://\(path == "/catch" ? "capture" : String(path.dropFirst()))")
        }
        guard path.range(of: #"^/(cats|people)/[a-z0-9]{10,40}$"#, options: .regularExpression) != nil else { return nil }
        let parts = path.split(separator: "/")
        return URL(string: "tilly://\(parts[0] == "cats" ? "cat" : "person")/\(parts[1])")
    }

    private static func origin(of site: URL) -> String {
        var origin = site.absoluteString
        while origin.hasSuffix("/") { origin.removeLast() }
        return origin
    }
}
