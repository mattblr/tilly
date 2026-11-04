import Foundation
import Observation

/// One half of a follow: a request and who it names, with the answer's status.
private struct Half: Sendable {
    let request: String
    let user: String
    var status: String? = nil
}

/// A user as others see them.
struct Profile: Hashable, Sendable, Identifiable {
    let userId: String
    let displayName: String
    let username: String
    let bio: String
    var photo: URL?
    /// Public, or private: catches only for the followers they accept.
    var privacy: Foir.Privacy = .public
    var isPrivate: Bool { privacy == .private }

    var initial: String { displayName.first.map { String($0).uppercased() } ?? "?" }
    var id: String { userId }

    init(userId: String, displayName: String, username: String, bio: String, photo: URL? = nil) {
        self.userId = userId
        self.displayName = displayName
        self.username = username
        self.bio = bio
        self.photo = photo
    }

    init?(_ stored: FoirAPI.ProfileFields) {
        guard let owner = stored._ownerId else { return nil }
        self.init(
            userId: owner,
            displayName: stored.displayName ?? "",
            username: stored.username ?? "",
            bio: stored.bio ?? "",
            photo: stored.photo?.fragments.photoThumb.thumbnailURL
        )
        privacy = Foir.Privacy(stored: stored.privacy)
    }
}

/// The signed-in user's social world: their own profile, who they follow,
/// who follows them, requests either way, the cats they follow, and the names
/// of everyone seen. A follow has two halves: the asker's request and the
/// answer of the user asked. It is on while the request stands and the
/// answer is accepted.
@MainActor @Observable
final class SocialCircle {
    enum ProfileSetup: Equatable {
        case loading, needsProfile, ready, failed(String)
    }
    private(set) var profileSetup: ProfileSetup = .loading
    private(set) var mine: Profile?
    private(set) var following: Set<String> = []
    private(set) var followers: Set<String> = []
    /// People the user asked to follow who haven't answered.
    private(set) var requested: Set<String> = []
    /// People asking to follow the user, oldest first.
    private(set) var requests: [String] = []
    private(set) var followedCats: Set<String> = []
    private(set) var profiles: [String: Profile] = [:]
    private(set) var loaded = false
    private(set) var blocked: Set<String> = []
    private(set) var safetyReady = false
    private(set) var safetyFailed = false
    func allows(_ author: String?, repostedBy: String? = nil) -> Bool {
        guard me != nil else { return true }
        guard safetyReady else { return author == me && (repostedBy == nil || repostedBy == me) }
        return !(author.map(blocked.contains) ?? false) && !(repostedBy.map(blocked.contains) ?? false)
    }

    func follow(of userId: String) -> Foir.Follow {
        following.contains(userId) ? .following : requested.contains(userId) ? .requested : .notFollowing
    }

    private let foir: Foir
    let copy: AppConfig
    private var generation = 0
    private(set) var me: String?

    init(foir: Foir, copy: AppConfig) {
        self.copy = copy
        self.foir = foir
    }

    /// Follows the user who is signed in, or forgets everything when nobody is.
    func reload(for user: String?) async {
        generation += 1
        let current = generation
        if me != user {
            mine = nil
            profiles = [:]
            following = []; followers = []; followedCats = []; requested = []; requests = []
        }
        me = user
        loaded = false
        profileSetup = .loading
        blocked = []; safetyReady = false; safetyFailed = false
        guard let user else {
            mine = nil
            following = []
            followers = []
            requested = []
            requests = []
            followedCats = []
            loaded = false
            safetyReady = true
            return
        }
        // Own-profile setup is independent of follow/block list availability.
        await refreshMine()
        guard me == user, generation == current else { return }
        do {
            blocked = try await foir.blockedAccounts()
            guard me == user, generation == current else { return }
            safetyReady = true
            async let mine = Paging.all { after in
                let page = try await self.foir.fetch(FoirAPI.MyRequestsQuery(me: .some(user), after: .maybe(after))).followRequests
                return (page.edges.compactMap { edge in edge.node.followeeId.map { Half(request: edge.node._id, user: $0) } }, page.pageInfo.fragments.more)
            }
            async let theirAnswers = Paging.all { after in
                let page = try await self.foir.fetch(FoirAPI.MyAnswersQuery(meText: .some(user), after: .maybe(after))).followApprovals
                return (page.edges.compactMap { edge in edge.node.requestId.map { Half(request: $0, user: edge.node._ownerId ?? "", status: edge.node.status) } }, page.pageInfo.fragments.more)
            }
            async let toMe = Paging.all { after in
                let page = try await self.foir.fetch(FoirAPI.RequestsToMeQuery(meText: .some(user), after: .maybe(after))).followRequests
                return (page.edges.compactMap { edge in edge.node._ownerId.map { Half(request: edge.node._id, user: $0) } }, page.pageInfo.fragments.more)
            }
            async let myAnswers = Paging.all { after in
                let page = try await self.foir.fetch(FoirAPI.MyApprovalsQuery(me: .some(user), after: .maybe(after))).followApprovals
                return (page.edges.compactMap { edge in edge.node.requestId.map { Half(request: $0, user: edge.node.followerId ?? "", status: edge.node.status) } }, page.pageInfo.fragments.more)
            }
            async let catIds = Paging.all { after in
                let page = try await self.foir.fetch(FoirAPI.MyCatFollowsQuery(after: .maybe(after))).myCatFollows
                return (page.edges.compactMap(\.node.catKey), page.pageInfo.fragments.more)
            }
            let asked = try await mine, answered = try await theirAnswers, asking = try await toMe, answers = try await myAnswers
            let cats = Set(try await catIds)
            guard me == user, generation == current else { return }
            let answerTo = Dictionary(answered.map { ($0.request, $0.status) }, uniquingKeysWith: { first, _ in first })
            following = Set(asked.filter { answerTo[$0.request] == "accepted" }.map(\.user)).subtracting(blocked)
            requested = Set(asked.filter { answerTo[$0.request] == nil }.map(\.user)).subtracting(blocked).subtracting(following)
            let standing = Set(asking.map(\.request)), mineTo = Dictionary(answers.map { ($0.request, $0.status) }, uniquingKeysWith: { first, _ in first })
            followers = Set(answers.filter { $0.status == "accepted" && standing.contains($0.request) }.map(\.user)).subtracting(blocked)
            var seen = Set<String>()
            requests = asking.filter { mineTo[$0.request] == nil && !blocked.contains($0.user) && seen.insert($0.user).inserted }.map(\.user)
            followedCats = cats
            // Someone stopped following: only this account can take back the
            // access they still hold, so start the tidy in the background.
            if answers.contains(where: { $0.status == "accepted" && !standing.contains($0.request) }) {
                Task { [foir] in await foir.tidyFollowers() }
            }
            await load(profilesOf: following.union(followers).union(requested).union(requests))
            guard me == user, generation == current else { return }
            loaded = true
        } catch {
            guard me == user, generation == current else { return }
            if !safetyReady { safetyFailed = true }
            loaded = true
        }
    }

    /// Fetches the profiles not already known, and any named to refresh.
    func load(profilesOf ids: some Sequence<String>, refreshing: Set<String> = []) async {
        let missing = Set(ids).subtracting(profiles.keys).union(refreshing)
        guard !missing.isEmpty else { return }
        let current = generation
        let found = try? await Paging.all(in: missing) { piece, after in
            let page = try await self.foir.fetch(FoirAPI.ProfilesQuery(ids: .some(piece), after: .maybe(after))).profiles
            return (page.edges.compactMap { Profile($0.node.fragments.profileFields) }, page.pageInfo.fragments.more)
        }
        guard generation == current else { return }
        for profile in found ?? [] { profiles[profile.userId] = profile }
    }

    func name(of userId: String) -> String {
        if userId == me { return copy.t("profile.you") }
        return profiles[userId]?.displayName ?? copy.t("profile.aUser")
    }

    /// Reads the user's own profile again, after it's saved.
    func refreshMine() async {
        guard let user = me else { return }
        let current = generation
        profileSetup = .loading
        do {
            let identity = await foir.tokens.identity
            guard identity.userId == user else { return }
            let found = try await Paging.all { after in
                let page = try await self.foir.fetch(FoirAPI.ProfilesQuery(ids: .some([user]), after: .maybe(after)), ifIdentity: identity).profiles
                return (page.edges.compactMap { Profile($0.node.fragments.profileFields) }, page.pageInfo.fragments.more)
            }
            guard me == user, generation == current else { return }
            mine = found.first { $0.userId == user }
            profiles[user] = mine
            // An empty successful read means setup is needed; a failed read does not.
            profileSetup = mine.map { !$0.username.isEmpty && !$0.displayName.isEmpty } == true ? .ready : .needsProfile
        } catch {
            guard me == user, generation == current else { return }
            profileSetup = .failed(UserFailure.key(error))
        }
    }

    func saved(_ profile: Profile) {
        guard profile.userId == me else { return }
        profiles[profile.userId] = profile
        mine = profile
        profileSetup = !profile.username.isEmpty && !profile.displayName.isEmpty ? .ready : .needsProfile
    }

    @discardableResult
    func setFollowing(_ userId: String, _ on: Bool) async throws -> Foir.Follow {
        let now = try await foir.setFollow(userId: userId, following: on)
        following.remove(userId); requested.remove(userId)
        switch now {
        case .following: following.insert(userId)
        case .requested: requested.insert(userId)
        case .notFollowing: break
        }
        return now
    }

    /// Accepts or declines someone's request, or removes a follower.
    func answer(_ userId: String, _ reply: Foir.FollowerReply) async throws {
        try await foir.answerFollower(userId: userId, reply)
        requests.removeAll { $0 == userId }
        if reply == .accept { followers.insert(userId) } else { followers.remove(userId) }
    }
    func setBlocked(_ id: String, _ on: Bool, expectedUserID: String) async throws {
        try await foir.setBlocked(id, blocked: on, expectedUserID: expectedUserID)
        guard me == expectedUserID else { throw FoirError(message: "The signed-in account changed.", code: nil) }
        if on { blocked.insert(id) } else { blocked.remove(id) }
        await reload(for: expectedUserID)
    }

    func setFollowingCat(_ catId: String, _ on: Bool) async throws {
        let now = try await foir.setCatFollow(catId: catId, following: on)
        if now { followedCats.insert(catId) } else { followedCats.remove(catId) }
    }
}
