import Foundation

/// Where the app reaches Fóir, and the publishable key it names itself with.
/// Both come from Info.plist, filled from Config/Tilly.xcconfig at build time.
struct FoirConfig: Sendable {
    let graphQLURL: URL
    let appKey: String

    var contentSafetyEnabled: Bool {
        Bundle.main.object(forInfoDictionaryKey: "TillyModerationEnabled") as? String == "YES"
    }

    var paidFeaturesEnabled: Bool {
        Bundle.main.object(forInfoDictionaryKey: "TillyPaidFeaturesEnabled") as? String != "NO"
    }

    /// Preserve installed production sessions; isolated targets name their own
    /// keychain account so a build switch never sends another pool's refresh.
    var sessionAccount: String {
        let name = Bundle.main.object(forInfoDictionaryKey: "FoirSessionNamespace") as? String ?? "production"
        return name == "production" ? "tokens" : "tokens.\(name)"
    }

    static let main: FoirConfig = {
        let info = Bundle.main.infoDictionary ?? [:]
        guard let url = (info["FoirAPIURL"] as? String).flatMap(URL.init(string:)),
              let key = info["FoirAppKey"] as? String, !key.isEmpty
        else {
            fatalError("Info.plist has no FoirAPIURL or FoirAppKey: run scripts/app-key.sh, then build again.")
        }
        return FoirConfig(graphQLURL: url, appKey: key)
    }()

    /// The website, from TILLY_SITE_URL in Config/Tilly.xcconfig.
    static let site: URL = {
        guard let url = (Bundle.main.object(forInfoDictionaryKey: "TillySiteURL") as? String).flatMap(URL.init(string:)),
              url.scheme == "https", url.host != nil
        else { fatalError("Info.plist has no TillySiteURL: set TILLY_SITE_URL in Config/Tilly.xcconfig.") }
        return url
    }()
    static var terms: URL { site.appending(path: "terms") }
    static var privacy: URL { site.appending(path: "privacy") }

    /// A route beside /graphql on the same origin, such as a sign-in step's.
    func route(_ path: String) -> URL {
        var components = URLComponents(url: graphQLURL, resolvingAgainstBaseURL: false)!
        components.path = path
        components.query = nil
        return components.url!
    }
}
