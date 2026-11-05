import Foundation

/// Which cat a new photo shows, judged on the phone against the cats already
/// tagged nearby. Only the neighbourhood's tags are compared, so a cat is
/// told apart from its neighbours, not from every cat there is.
enum Matcher {
    /// How alike (cosine) the best photo must be for the phone to name the cat
    /// without asking. A placeholder: the recognition pipeline sets it where a cat never seen
    /// before is mistaken for another 5% of the time.
    static let sure = 0.90
    /// How far ahead of the next cat the best must be to count as sure.
    static let lead = 0.05
    /// How many cats "Is it one of these?" offers.
    static let offered = 3
    /// Two photos never score this alike unless the vector is broken: the
    /// simulator's CPU-only Vision has returned the same print for different
    /// cats. Such a match is offered, never named for the user.
    static let implausible = 0.9999

    struct Photo: Sendable {
        let photoId: String
        let catId: String
        let distance: Double
        /// Nil when the photo has no vector from this phone's model.
        let vector: [Double]?
    }

    struct Candidate: Sendable, Hashable {
        let catId: String
        /// The photo of the cat that looks most alike, or the nearest one.
        let photoId: String
        /// Nil when none of the cat's photos can be compared.
        let score: Double?
    }

    enum Verdict: Sendable {
        case sure(Candidate, others: [Candidate])
        case ask([Candidate])
        case unknown
    }

    static func judge(_ vector: [Double], against photos: [Photo]) -> Verdict {
        let byCat = Dictionary(grouping: photos, by: \.catId)
        let candidates: [(Candidate, distance: Double)] = byCat.map { catId, photos in
            let scored = photos.compactMap { photo in photo.vector.flatMap { cosine(vector, $0) }.map { (photo, $0) } }
            let nearest = photos.min { $0.distance < $1.distance }!
            if let (photo, score) = scored.max(by: { $0.1 < $1.1 }) {
                return (Candidate(catId: catId, photoId: photo.photoId, score: score), nearest.distance)
            }
            return (Candidate(catId: catId, photoId: nearest.photoId, score: nil), nearest.distance)
        }
        // The most alike first; cats with nothing to compare after, nearest first.
        let ranked = candidates.sorted { a, b in
            switch (a.0.score, b.0.score) {
            case let (x?, y?): x > y
            case (.some, nil): true
            case (nil, .some): false
            case (nil, nil): a.distance < b.distance
            }
        }.map(\.0)

        guard let best = ranked.first else { return .unknown }
        let runnerUp = ranked.dropFirst().first?.score ?? 0
        if let score = best.score, score >= sure, score < implausible, score - runnerUp >= lead {
            return .sure(best, others: Array(ranked.dropFirst().prefix(offered - 1)))
        }
        return .ask(Array(ranked.prefix(offered)))
    }

    static func cosine(_ a: [Double], _ b: [Double]) -> Double? {
        guard a.count == b.count, !a.isEmpty else { return nil }
        var dot = 0.0, aa = 0.0, bb = 0.0
        for i in a.indices {
            dot += a[i] * b[i]
            aa += a[i] * a[i]
            bb += b[i] * b[i]
        }
        guard aa > 0, bb > 0 else { return nil }
        return dot / (aa.squareRoot() * bb.squareRoot())
    }
}
