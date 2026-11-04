import CoreLocation
import CryptoKit
import Observation
import UIKit

/// One catch, from the photo to the reveal.
///
/// The phone finds the cats in the photo and matches each against cats tagged
/// nearby. The user confirms or names each one; saving is the `save_catch`
/// operation's: one capture photo with a tag per cat, creating any new cat.
@MainActor @Observable
final class CatchFlow: Identifiable {
    enum Step {
        case looking
        case noCat
        case matching
        case tagging
        case saving
        case revealed(Reveal)
        case failed(String)
    }

    struct Candidate: Identifiable, Hashable {
        let catId: String
        let name: String
        let photo: URL?
        var id: String { catId }
    }

    struct TagChoice: Identifiable {
        let id: String
        var catId: String?
        var name: String
        let bounds: CGRect?
        let vector: [Double]?
        let candidates: [Candidate]
    }

    struct Reveal {
        enum Kind {
            /// The user named a cat nobody had caught.
            case discovery
            /// A known cat, met by this user for the first time.
            case firstMeeting
            /// A cat this user has met before.
            case again
        }

        let catId: String
        let name: String
        let kind: Kind
        let timesMet: Int
        let catches: Int
        /// The cat photo the catch made: what a field note or a post names.
        let photoKey: String?
        /// Present only for the canonical saved-capture workflow.
        var captureId: String?
        var otherCats: [Candidate] = []
    }

    /// How far around the user a cat counts as one they could have met.
    static let neighbourhood = 500.0

    let photo: UIImage
    private(set) var step: Step = .looking

    /// While the phone or Fóir is busy with the catch, and closing it would
    /// leave the user not knowing whether it was saved.
    var isWorking: Bool {
        switch step {
        case .looking, .matching, .saving: true
        default: false
        }
    }

    private(set) var tags: [TagChoice] = []
    /// The capture's note/skip boundary is closed. Leaving again, say back
    /// from the cat's page and then Close, mustn't run it a second time.
    private(set) var finalized = false

    /// "What did you notice?": the note tags offered, those chosen, and a line.
    static let noteLimit = 280
    private(set) var noteTags: [String]?
    var noteChosen: Set<String> = []
    var noteText = ""
    private(set) var noteSaved = false
    var hasNote: Bool { !noteChosen.isEmpty || !noteWords.isEmpty }
    private var noteWords: String { noteText.trimmingCharacters(in: .whitespacesAndNewlines) }
    private var tagSave: [TagChoice]?
    private var manualTaggingRequested = false
    private var taggedCandidates: [String: Candidate] = [:]
    private let foir: Foir
    private let copy: AppConfig
    private(set) var identity: TokenStore.Identity?
    private var place: CLLocationCoordinate2D?
    private var jpeg: Data?
    private var upload: Task<String, any Error>?
    /// Names this catch to the operation, so a retry can't record it twice.
    private let attempt = UUID().uuidString

    init(photo: UIImage, foir: Foir, copy: AppConfig) {
        self.copy = copy
        self.photo = photo
        self.foir = foir
        Task {
            identity = await foir.tokens.identity
            await look()
        }
    }

    func look() async {
        step = .looking
        #if DEBUG
        var diagnosticPhase = "vision"
        #endif
        do {
            let examined = try await timed("vision") { try await CatVision.examine(photo, multiple: true) }
            jpeg = examined.jpeg
            guard examined.vector != nil else {
                step = .noCat
                return
            }
            // Upload while the match is worked out: the save needs the file.
            upload = startUpload(examined.jpeg)

            step = .matching
            #if DEBUG
            diagnosticPhase = "location"
            #endif
            let place = try await timed("location") { try await Location.current() }
            self.place = place
            // Every cat tagged around here, however many pages that is: a cat
            // missed here would be offered as a new one.
            #if DEBUG
            diagnosticPhase = "nearby-tags"
            #endif
            let available = try await timed("nearby-tags") { try await taggedNearby(at: place) }
            #if DEBUG
            diagnosticPhase = "candidates"
            #endif
            var choices: [TagChoice] = []
            for cat in examined.cats {
                let verdict = Matcher.judge(cat.vector, against: available)
                let matches: [Matcher.Candidate]
                switch verdict {
                case .sure(let best, let others): matches = [best] + others
                case .ask(let offered): matches = offered
                case .unknown: matches = []
                }
                let shown = candidates(matches)
                var choice = TagChoice(id: UUID().uuidString, name: "", bounds: cat.bounds, vector: cat.vector, candidates: shown)
                // A sure match is named for the user, who can still change it.
                if case .sure = verdict, let best = shown.first, !choices.contains(where: { $0.catId == best.catId }) {
                    choice.catId = best.catId
                }
                #if DEBUG
                let comparable = available.filter { $0.vector != nil }.count
                let scores = matches.prefix(2).map { $0.score.map { String(format: "%.3f", $0) } ?? "none" }
                print("[TillyMatch] verdict=\(Self.verdictName(verdict)) top=\(scores) candidates=\(shown.count) nearby=\(available.count) comparable=\(comparable)")
                #endif
                choices.append(choice)
            }
            tags = choices
            step = .tagging
        } catch {
            #if DEBUG
            let diagnosticError = error as NSError
            print("[TillyCapture] phase=\(diagnosticPhase) errorType=\(String(reflecting: type(of: error))) domain=\(diagnosticError.domain) code=\(diagnosticError.code)")
            #endif
            step = .failed(UserFailure.key(error))
        }
    }

    var canTagMissedCats: Bool { jpeg != nil }

    #if DEBUG
    private static func verdictName(_ verdict: Matcher.Verdict) -> String {
        switch verdict {
        case .sure: "sure"
        case .ask: "ask"
        case .unknown: "unknown"
        }
    }
    #endif

    /// Correct a missed cat association; this supplies no detector evidence
    /// and never qualifies the photo for an AI challenge.
    func tagMissedCats() {
        guard canTagMissedCats, case .noCat = step else { return }
        manualTaggingRequested = true
        step = .matching
        Task { await prepareManualTags() }
    }

    private func prepareManualTags() async {
        step = .matching
        do {
            guard let jpeg, let identity, identity.userId != nil,
                  await foir.tokens.identity == identity else { throw TokenStore.SessionError.changed }
            // Reuse the normal identity-pinned private upload and real location.
            if upload == nil { upload = startUpload(jpeg) }
            let currentPlace = try await Location.current()
            guard await foir.tokens.identity == identity else { throw TokenStore.SessionError.changed }
            place = currentPlace
            tags = [TagChoice(id: UUID().uuidString, name: "", bounds: nil, vector: nil, candidates: [])]
            step = .tagging
        } catch {
            step = .failed(UserFailure.key(error))
        }
    }

    func retry() {
        if tagSave != nil { Task { await saveTags() }; return }
        if manualTaggingRequested { Task { await prepareManualTags() }; return }
        Task { await look() }
    }

    /// Each offered cat's name and the photo it was matched on.
    private func candidates(_ matches: [Matcher.Candidate]) -> [Candidate] {
        matches.compactMap { taggedCandidates["\($0.photoId)~\($0.catId)"] }
    }

    private func taggedNearby(at place: CLLocationCoordinate2D) async throws -> [Matcher.Photo] {
        let edges = try await Paging.all { [foir] after in
            let page = try await foir.fetch(FoirAPI.NearbyTaggedCatsQuery(lat: place.latitude, lng: place.longitude, radius: Self.neighbourhood, after: .maybe(after))).searchByLocation
            return (page.edges, page.pageInfo.fragments.more)
        }
        let distances = Dictionary(edges.map { ($0.node.recordId, $0.node.distanceMeters) }, uniquingKeysWith: min)
        let records = try await Paging.all(in: Array(distances.keys)) { [foir] ids, after in
            let page = try await foir.fetch(FoirAPI.MatchingCatTagsQuery(keys: .some(ids), after: .maybe(after))).captureCatTags
            return (page.edges.map(\.node), page.pageInfo.fragments.more)
        }
        return records.compactMap { tag in
            guard let capture = tag.capture?.fragments.canonicalMedia,
                  capture.state == "ready", capture.tagRevision == tag.revision, capture._ownerId == tag._ownerId,
                  let catId = tag.catKey, let cat = tag.cat else { return nil }
            taggedCandidates["\(capture._id)~\(catId)"] = Candidate(catId: catId, name: cat.name ?? copy.t("cat.unnamed"), photo: capture.photo?.fragments.photoThumb.mediumURL)
            return Matcher.Photo(photoId: capture._id, catId: catId, distance: distances[tag._id] ?? .infinity,
                vector: tag.vectorModel == CatVision.vectorModel ? tag.vector?.array?.compactMap(\.number) : nil)
        }
    }

    func setTag(_ id: String, catId: String? = nil, name: String? = nil) {
        guard case .tagging = step, let index = tags.firstIndex(where: { $0.id == id }) else { return }
        if let name { tags[index].name = name }
        else { tags[index].catId = catId; tags[index].name = "" }
    }

    func addTag() {
        guard case .tagging = step, tags.count < 8 else { return }
        tags.append(TagChoice(id: UUID().uuidString, name: "", bounds: nil, vector: nil, candidates: []))
    }

    func removeTag(_ id: String) {
        guard case .tagging = step, tags.count > 1 else { return }
        tags.removeAll { $0.id == id }
    }

    func confirmTags() { Task { await saveTags() } }

    private func saveTags() async {
        guard let place, let identity else { return }
        guard await foir.tokens.identity == identity else { step = .failed(UserFailure.key(TokenStore.SessionError.changed)); return }
        let selected = tagSave ?? tags
        guard !selected.isEmpty, selected.count <= 8,
              Set(selected.compactMap(\.catId)).count == selected.compactMap(\.catId).count,
              selected.allSatisfy({ $0.catId != nil || (!$0.name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && $0.name.count <= 60) })
        else { return }
        tagSave = selected
        step = .saving
        do {
            let fileId = try await timed("upload-wait") { try await uploadedPhoto() }
            let cats = selected.map { tag in
                ExecutionAPI.TillySaveCatchInputCatsItem(
                    bounds: tag.bounds.map { .some(.init(height: Double($0.height), width: Double($0.width), x: Double($0.minX), y: Double($0.minY))) } ?? .none,
                    catId: .maybe(tag.catId), key: tag.id, name: tag.catId == nil ? .some(tag.name.trimmingCharacters(in: .whitespacesAndNewlines)) : .none,
                    position: tag.bounds.map { .some(.init(x: Double($0.midX), y: Double($0.midY))) } ?? .none,
                    vector: .maybe(tag.vector), vectorModel: tag.vector == nil ? .none : .some(CatVision.vectorModel))
            }
            let input = ExecutionAPI.TillySaveCatchInput(captureKey: attempt, cats: cats, lat: place.latitude, lng: place.longitude, photoFileId: fileId)
            let result = try await timed("save-tagged-catch") { try await foir.saveTaggedCatch(input: input, key: attempt, ifIdentity: identity) }
            guard let catId = result["catId"]?.string, let photoKey = result["captureId"]?.string,
                  result["revision"]?.string != nil, let savedCats = result["cats"]?.array, savedCats.count == selected.count
            else { throw FoirError(message: "The photo hasn’t finished saving. Try again.", code: nil) }
            var shown = try await timed("reveal-reads") { try await reveal(catId, named: selected[0].name, isNew: selected[0].catId == nil, photoKey: photoKey) }
            shown.captureId = photoKey
            shown.otherCats = savedCats.dropFirst().compactMap { cat in
                guard let id = cat["catId"]?.string else { return nil }
                return Candidate(catId: id, name: cat["name"]?.string ?? copy.t("cat.unnamed"), photo: nil)
            }
            // Moderation and photo challenges run on Fóir after the save;
            // their results land on the user's badges, not here.
            step = .revealed(shown)
        } catch { step = .failed(UserFailure.key(error)) }
    }

    func loadNoteTags() async {
        guard noteTags == nil else { return }
        let found = try? await Paging.all { [foir] after in
            let page = try await foir.fetch(FoirAPI.NoteTagsQuery(after: .maybe(after))).noteTags
            return (page.edges.compactMap(\.node.label), page.pageInfo.fragments.more)
        }
        noteTags = found ?? []
    }

    /// Adds what the user noticed to the cat's story, once. Retrying the
    /// same words reuses their key, so an answer lost in transit can't add
    /// the note twice.
    func saveNote() async throws {
        guard !noteSaved, hasNote, case .revealed(let reveal) = step, let photoKey = reveal.photoKey else { return }
        guard let identity, await foir.tokens.identity == identity else { throw TokenStore.SessionError.changed }
        // Tags in the order they're offered, so a note reads the same each time.
        let tags = (noteTags ?? []).filter(noteChosen.contains)
        let words = noteWords
        let content = SHA256.hash(data: Data((tags + [words]).joined(separator: "\u{1F}").utf8))
        let key = "note-\(photoKey)-\(content.prefix(8).map { String(format: "%02x", $0) }.joined())"
        try await timed("note") { try await foir.addFieldNote(photoKey: photoKey, tags: tags, text: words, key: key) }
        noteSaved = true
    }

    /// Closes a saved capture's note/skip boundary, once.
    func finalize() async throws {
        guard !finalized, case .revealed(let reveal) = step, let captureId = reveal.captureId else { return }
        guard let identity else { throw TokenStore.SessionError.changed }
        try await timed("finalize") { try await foir.finalizeCapture(captureId: captureId, ifIdentity: identity) }
        finalized = true
    }

    /// Debug builds log how long each part of a catch takes.
    private func timed<T>(_ stage: String, _ work: () async throws -> T) async rethrows -> T {
        #if DEBUG
        let start = ContinuousClock.now
        defer {
            let elapsed = start.duration(to: .now).components
            print("[TillyCaptureTiming] stage=\(stage) ms=\(elapsed.seconds * 1000 + elapsed.attoseconds / 1_000_000_000_000_000)")
        }
        #endif
        return try await work()
    }

    private func startUpload(_ jpeg: Data) -> Task<String, any Error> {
        let expected = identity
        return Task { [foir] in
            guard let expected else { throw TokenStore.SessionError.changed }
            return try await foir.upload(jpeg: jpeg, filename: "catch.jpg", ifIdentity: expected)
        }
    }

    /// The uploaded photo's file id. A finished upload is reused; a failed one
    /// is tried again, so a retry doesn't stick on an upload that already failed.
    private func uploadedPhoto() async throws -> String {
        if let upload, let fileId = try? await upload.value { return fileId }
        guard let jpeg else { throw FoirError(message: "The photo is gone. Take it again.", code: nil) }
        let again = startUpload(jpeg)
        upload = again
        return try await again.value
    }

    /// What the reveal says: read back from Fóir, so its counts are the saved ones.
    private func reveal(_ catId: String, named name: String?, isNew: Bool, photoKey: String?) async throws -> Reveal {
        async let biography = foir.fetch(FoirAPI.CatBiographyQuery(id: catId))
        async let encounters = TaggedCaptures.count(catId: catId, mine: true, foir: foir)
        async let gallery = TaggedCaptures.count(catId: catId, foir: foir)
        let (cat, timesMet, catches) = try await (biography, encounters, gallery)
        return Reveal(
            catId: catId,
            name: cat.cat?.name ?? name ?? copy.t("cat.yourCat"),
            kind: isNew ? .discovery : timesMet <= 1 ? .firstMeeting : .again,
            timesMet: timesMet,
            catches: catches,
            photoKey: photoKey
        )
    }
}
