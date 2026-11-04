import Apollo
import Foundation

/// The social operations. Each writes the signed-in user's own records; the
/// run itself says who the user is, so nothing here names them.
extension Foir {
    /// Finish the optional note/skip boundary. Native record hooks own the
    /// follow-up work; this call cannot request generation or select its owner.
    func finalizeCapture(captureId: String, ifIdentity expected: TokenStore.Identity? = nil) async throws {
        let identity = if let expected { expected } else { await tokens.identity }
        let signature = ["finalize_capture", String(identity.generation), identity.userId ?? "", captureId]
        let key = await operationRetries.key(for: signature)
        let input = ExecutionAPI.FinalizeCaptureInput(captureId: captureId, timeZone: TimeZone.current.identifier)
        let run = try await operation {
            try await self.perform(ExecutionAPI.FinalizeCaptureMutation(input: input, key: key), ifIdentity: identity).executeFinalizeCapture
        }
        if let status = run?.execution.status.rawValue, ["FAILED", "CANCELLED", "TIMED_OUT"].contains(status) {
            await operationRetries.finished(signature)
        }
        try Self.check(ok: run?.result?.ok, error: run?.execution.error)
        await operationRetries.finished(signature)
    }
    /// The run owns the private preparation and bounded publication slices.
    /// Capture identity survives retries; the initiating account owns polling.
    func saveTaggedCatch(input: ExecutionAPI.TillySaveCatchInput, key: String, ifIdentity expected: TokenStore.Identity? = nil) async throws -> FoirAPI.JSON {
        let identity = if let expected { expected } else { await tokens.identity }
        let signature = ["tilly.save-catch", String(identity.generation), identity.userId ?? "", key]
        let retryKey = await operationRetries.key(for: signature)
        let run = try await operation {
            try await self.perform(ExecutionAPI.SaveCatchRunMutation(input: input, key: retryKey), ifIdentity: identity).executeSaveCatch
        }
        guard let execution = run?.execution else { throw FoirError(message: "The save is still pending.", code: "PENDING") }
        do {
            let result = try await awaitOwnRun(id: execution.id, key: "tilly.save-catch", identity: identity)
            await operationRetries.finished(signature)
            return result
        } catch {
            if (error as? FoirError)?.code == "OPERATION_FAILED" { await operationRetries.finished(signature) }
            throw error
        }
    }
    /// Who sees the user's catches: everyone, or only the followers they
    /// accept. Following a private user is a request.
    enum Privacy: String, CaseIterable, Sendable {
        case `public`
        case `private`

        init(stored: String?) { self = stored == nil || stored == "public" ? .public : .private }
    }

    /// Where the user stands with someone they follow, or asked to.
    enum Follow: Sendable, Equatable {
        case notFollowing, requested, following
    }

    /// A user's counts. Anyone signed in may ask; the lists behind them
    /// follow the user's privacy.
    struct Counts: Sendable, Equatable {
        var followers = 0, following = 0, cats = 0, catches = 0
    }

    /// Saves the profile. A new photo's file id replaces the photo; leaving it
    /// out keeps the one already set, unless `removePhoto` says to drop it.
    func saveProfile(
        displayName: String,
        username: String,
        bio: String,
        photoFileId: String? = nil,
        removePhoto: Bool = false,
        privacy: Privacy? = nil,
        ifIdentity expected: TokenStore.Identity? = nil
    ) async throws {
        let input = ExecutionAPI.TillySaveProfileInput(
            bio: .some(bio),
            displayName: displayName,
            photoFileId: .maybe(photoFileId),
            privacy: .maybe(privacy.map { GraphQLEnum(rawValue: $0.rawValue) }),
            removePhoto: removePhoto ? .some(true) : .none,
            username: username
        )
        let identity = await tokens.identity
        guard expected == nil || expected == identity else { throw FoirError(message: "The signed-in account changed.", code: nil) }
        let signature = ["tilly.save-profile", String(identity.generation), identity.userId ?? "", displayName, username, bio, photoFileId ?? "", String(removePhoto), privacy?.rawValue ?? ""]
        let key = await operationRetries.key(for: signature)
        let run = try await operation { try await self.perform(ExecutionAPI.SaveProfileRunMutation(input: input, key: key), ifIdentity: identity).executeSaveProfile }
        guard let execution = run?.execution else { throw FoirError(message: "The save is still pending.", code: "PENDING") }
        _ = try await awaitOwnRun(id: execution.id, key: "tilly.save-profile", identity: identity)
        await operationRetries.finished(signature)
    }

    /// Likes or unlikes a capture, and answers whether the user now likes it.
    func setLike(photoKey: String, liked: Bool) async throws -> Bool {
        let input = FoirAPI.LikeCaptureInput(liked: liked, photoKey: photoKey)
        let run = try await operation { try await self.perform(FoirAPI.LikeCaptureMutation(input: input, key: .some("like-\(photoKey)"))).executeLikeCapture }
        try Self.check(ok: run?.result?.ok, error: run?.result?.error ?? run?.execution.error)
        return run?.result?.active ?? liked
    }

    func setCatFollow(catId: String, following: Bool) async throws -> Bool {
        let input = FoirAPI.FollowCatInput(catId: catId, following: following)
        let run = try await operation { try await self.perform(FoirAPI.FollowCatMutation(input: input, key: .some("follow-cat-\(catId)"))).executeFollowCat }
        try Self.check(ok: run?.result?.ok, error: run?.result?.error ?? run?.execution.error)
        return run?.result?.active ?? following
    }

    /// Follows or unfollows a user. A private user is asked first.
    func setFollow(userId: String, following: Bool) async throws -> Follow {
        let input = FoirAPI.FollowUserInput(following: .some(following), userId: userId)
        let run = try await operation {
            try await self.perform(FoirAPI.FollowUserMutation(input: input, key: .some("follow-user-\(userId)"))).executeFollowUser
        }
        try Self.check(ok: run?.result?.ok, error: run?.result?.error ?? run?.execution.error)
        guard run?.result?.active ?? following else { return .notFollowing }
        return run?.result?.status == "requested" ? .requested : .following
    }

    enum FollowerReply: String, Sendable { case accept, decline, remove }

    /// Answers someone's request to follow the user, or removes a follower.
    func answerFollower(userId: String, _ reply: FollowerReply) async throws {
        let input = FoirAPI.FollowUserInput(follower: .some(.case(reply == .accept ? .accept : reply == .decline ? .decline : .remove)), userId: userId)
        let run = try await operation {
            try await self.perform(FoirAPI.FollowUserMutation(input: input, key: .some("follower-\(userId)"))).executeFollowUser
        }
        try Self.check(ok: run?.result?.ok, error: run?.result?.error ?? run?.execution.error)
    }

    func profileCounts(userId: String) async throws -> Counts {
        let run = try await operation { try await self.perform(FoirAPI.ProfileCountsMutation(input: .init(userId: userId))).executeProfileCounts }
        try Self.check(ok: run?.result?.ok, error: run?.result?.error ?? run?.execution.error)
        let result = run?.result
        return Counts(followers: result?.followers ?? 0, following: result?.following ?? 0, cats: result?.cats ?? 0, catches: result?.catches ?? 0)
    }

    /// Takes back access to the user's catches from people who stopped
    /// following them. Fóir lets only the user's own account do that, so the
    /// app starts it in the background; one run at a time.
    func tidyFollowers() async {
        _ = try? await perform(FoirAPI.TidyFollowersMutation())
    }

    /// Adds what the user noticed to one of their own catches. The same key
    /// names the same note, so a retry can't add it twice.
    func addFieldNote(photoKey: String, tags: [String], text: String, key: String) async throws {
        let input = FoirAPI.TillyAddFieldNoteInput(photoKey: photoKey, tags: .some(tags), text: .some(text))
        let run = try await operation {
            try await self.perform(FoirAPI.AddFieldNoteMutation(input: input, key: key)).executeAddFieldNote
        }
        try Self.check(ok: run?.result?.ok, error: run?.result?.error ?? run?.execution.error)
    }

    /// Observe only this account's run. Re-check the captured identity before
    /// token lookup and after each response, including renewal and polling.
    func awaitOwnRun(id: String, key: String, identity: TokenStore.Identity) async throws -> FoirAPI.JSON {
        for _ in 0..<200 {
            try Task.checkCancellation()
            let answer = try await fetch(ExecutionAPI.OwnOperationRunQuery(id: id), ifIdentity: identity)
            guard let run = answer.operationExecution, run.id == id, run.operationKey == key else {
                throw FoirError(message: "The save is still pending.", code: "PENDING")
            }
            switch run.status.rawValue {
            case "COMPLETED":
                guard let result = run.result, result["ok"] == .bool(true) else {
                    throw FoirError(message: run.result?["error"]?.string ?? "That didn’t work. Try again.", code: nil)
                }
                return result
            case "FAILED", "CANCELLED", "TIMED_OUT":
                throw FoirError(message: run.error ?? "That didn’t work. Try again.", code: "OPERATION_FAILED")
            default: try await Task.sleep(for: .milliseconds(600))
            }
        }
        throw FoirError(message: "The save is still pending.", code: "PENDING")
    }

    /// Shares one of the user's catches, or reshares a public post with a comment.
    @discardableResult
    /// Seen by whoever sees the user's catches, by their profile's setting.
    func share(photoKey: String? = nil, reshareOf: String? = nil, note: String = "", comment: String = "") async throws -> String? {
        let identity = await tokens.identity
        let signature = ["tilly.share-capture", String(identity.generation), identity.userId ?? "", photoKey ?? "", reshareOf ?? "", note, comment]
        let key = await operationRetries.key(for: signature)
        let input = ExecutionAPI.TillyShareCaptureInput(
            comment: comment.isEmpty ? .none : .some(comment),
            note: note.isEmpty ? .none : .some(note),
            photoKey: photoKey.map { .some($0) } ?? .none,
            reshareOf: reshareOf.map { .some($0) } ?? .none
        )
        let run = try await operation {
            try await self.perform(ExecutionAPI.ShareCaptureRunMutation(input: input, key: key), ifIdentity: identity).executeShareCapture
        }
        guard let execution = run?.execution else { throw FoirError(message: "The share is still pending.", code: "PENDING") }
        do {
            let result = try await awaitOwnRun(id: execution.id, key: "tilly.share-capture", identity: identity)
            await operationRetries.finished(signature)
            return result["id"]?.string
        } catch {
            if (error as? FoirError)?.code == "OPERATION_FAILED" { await operationRetries.finished(signature) }
            throw error
        }
    }

    /// Runs an operation, turning its refusal into the words its handler gave.
    private func operation<T>(_ run: () async throws -> T) async throws -> T {
        do {
            return try await run()
        } catch let error as FoirError {
            throw FoirError(message: Self.handlerMessage(in: error.message) ?? error.message, code: error.code)
        }
    }

    private static func check(ok: Bool?, error: String?) throws {
        if ok == true { return }
        throw FoirError(message: error.flatMap { handlerMessage(in: $0) ?? $0 } ?? "That didn’t work. Try again.", code: nil)
    }

    /// A refused run reads "operation failed: HTTP 409: {…"error":"That username is taken."}".
    private static func handlerMessage(in message: String) -> String? {
        guard let start = message.range(of: "\"error\":\"") else { return nil }
        let rest = message[start.upperBound...]
        guard let end = rest.firstIndex(of: "\"") else { return nil }
        return String(rest[..<end])
    }
}

/// Memory only: a pending retry observes the same run, including after the UI's
/// observation deadline. Never retain a session bearer or refresh token here.
actor OperationRetries {
    private var pending: [[String]: String] = [:]
    func key(for signature: [String]) -> String {
        if let key = pending[signature] { return key }
        if pending.count >= 20 { pending.removeAll() }
        let key = UUID().uuidString
        pending[signature] = key
        return key
    }
    func finished(_ signature: [String]) { pending.removeValue(forKey: signature) }
}
