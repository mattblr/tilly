import Foundation

@main
struct NotificationLinkChecks {
    static func main() {
        let site = URL(string: "https://tilly.ink")!
        let accepted = [
            "/feed": "tilly://feed", "/catch": "tilly://capture", "/account": "tilly://account",
            "tilly://capture": "tilly://capture", "tilly://feed": "tilly://feed",
            "tilly://cat/abcdefghij": "tilly://cat/abcdefghij",
            "/people/abcdefghij": "tilly://person/abcdefghij",
            "https://tilly.ink/cats/abcdefghij": "tilly://cat/abcdefghij"
        ]
        for (input, expected) in accepted { precondition(NotificationLink.url(input, site: site)?.absoluteString == expected, input) }
        let refused = ["", "//evil.test/feed", "https://evil.test/feed", "javascript:alert(1)", "/feed?next=evil", "/feed#x", "/cats/../account", "/cats/short", "tilly://cat/short", "tilly://feed/extra", "tilly://feed:443", "tilly://user@feed", "/cats/%61bcdefghij", "/sign-in", "feed", "/\\evil.test/feed"]
        for input in refused { precondition(NotificationLink.url(input, site: site) == nil, input) }
        precondition(NotificationLink.url(nil, site: site) == nil)
        // A fork's own site opens its screens; another site's links don't.
        let fork = URL(string: "https://example.app")!
        precondition(NotificationLink.url("https://example.app/cats/abcdefghij", site: fork)?.absoluteString == "tilly://cat/abcdefghij")
        precondition(NotificationLink.url("https://tilly.ink/cats/abcdefghij", site: fork) == nil)
        for host in ["cdn.foir.dev", "cdn-dev.foir.dev"] {
            precondition(NotificationLink.imageURL("https://\(host)/photo.png?token=example") != nil)
        }
        for input in ["https://evil.test/photo.png", "http://cdn.foir.dev/x", "https://cdn.foir.dev.evil.test/x", "https://user@cdn.foir.dev/x", "https://cdn.foir.dev:444/x", "file:///tmp/photo.png"] {
            precondition(NotificationLink.imageURL(input) == nil, input)
        }
        print("Native notification links: \(accepted.count) accepted and \(refused.count + 1) refused controls passed.")
    }
}
