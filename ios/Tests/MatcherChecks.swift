import Foundation

@main
struct MatcherChecks {
    static func photo(_ cat: String, _ vector: [Double]?, distance: Double = 10) -> Matcher.Photo {
        Matcher.Photo(photoId: "\(cat)-photo", catId: cat, distance: distance, vector: vector)
    }

    static func isSure(_ verdict: Matcher.Verdict, _ cat: String) -> Bool {
        if case .sure(let best, _) = verdict { return best.catId == cat }
        return false
    }

    static func isAsk(_ verdict: Matcher.Verdict) -> Bool {
        if case .ask = verdict { return true }
        return false
    }

    static func main() {
        let probe: [Double] = [1, 0, 0]
        // Close, clearly ahead of the next cat: named for the user.
        precondition(isSure(Matcher.judge(probe, against: [photo("biscuit", [0.95, 0.31, 0]), photo("pepper", [0.5, 0.86, 0])]), "biscuit"))
        // An identical vector is a broken print, not a match: offered, never named.
        precondition(isAsk(Matcher.judge(probe, against: [photo("biscuit", [1, 0, 0])])))
        // Below the bar: offered.
        precondition(isAsk(Matcher.judge(probe, against: [photo("biscuit", [0.8, 0.6, 0])])))
        // Two cats nearly as alike: offered.
        precondition(isAsk(Matcher.judge(probe, against: [photo("biscuit", [0.95, 0.31, 0]), photo("tilly", [0.94, 0.34, 0])])))
        // Nothing nearby: unknown.
        if case .unknown = Matcher.judge(probe, against: []) {} else { preconditionFailure("expected unknown") }
        print("Native matcher checks passed (5 controls).")
    }
}
