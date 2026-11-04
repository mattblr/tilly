import Foundation

extension Foir {
    func challengeCollection(captureId: String? = nil, ifIdentity identity: TokenStore.Identity) async throws -> ChallengeCollection {
        guard let owner = identity.userId else { throw TokenStore.SessionError.changed }
        let challenges: [PhotoChallenge] = try await challengePages { after in
            let page = try await self.fetch(ChallengeAPI.ChallengeCatalogQuery(after: .maybe(after)), ifIdentity: identity).photoChallenges
            let rows = try page.edges.map { edge -> PhotoChallenge in
                let row = edge.node
                guard let key = row._naturalKey, let title = row.title, let description = row.description,
                      let icon = row.icon, let start = PhotoChallenge.date(row.startsAt), let end = PhotoChallenge.date(row.endsAt),
                      start < end, let version = row.criteriaVersion, let target = row.targetCount, target > 0,
                      let enabled = row.enabled else { throw Self.challengeReadFailure }
                return PhotoChallenge(id: key, title: title, description: description, icon: icon, startsAt: start,
                    endsAt: end, version: version, targetCount: target, enabled: enabled)
            }
            return (rows, page.pageInfo.hasNextPage, page.pageInfo.endCursor)
        }
        let badges: [ChallengeBadge] = try await challengePages { after in
            let page = try await self.fetch(ChallengeAPI.OwnChallengeAwardsQuery(after: .maybe(after)), ifIdentity: identity).myChallengeAwards
            let rows = try page.edges.map { edge -> ChallengeBadge in
                let row = edge.node
                guard row._ownerId == owner, let key = row.challengeKey, let version = row.challengeVersion,
                      let title = row.title, let icon = row.icon, let progress = row.progress, progress >= 0,
                      let target = row.targetCount, target > 0, let active = row.active else { throw Self.challengeReadFailure }
                return ChallengeBadge(id: row._id, challengeKey: key, version: version, title: title, icon: icon,
                    progress: progress, targetCount: target, active: active, earnedAt: PhotoChallenge.date(row.earnedAt))
            }
            return (rows, page.pageInfo.hasNextPage, page.pageInfo.endCursor)
        }
        var evidence: [ChallengeEvidence] = []
        if let captureId {
            evidence = try await challengePages { after in
                let page = try await self.fetch(ChallengeAPI.OwnChallengeEvaluationsQuery(captureId: .some(captureId), after: .maybe(after)), ifIdentity: identity).myChallengeEvaluations
                let rows = try page.edges.map { edge -> ChallengeEvidence in
                    let row = edge.node
                    guard row._ownerId == owner, row.captureId == captureId, let key = row.challengeKey,
                          let version = row.challengeVersion, let raw = row.status, let status = ChallengeEvidence.Status(rawValue: raw),
                          let attempts = row.attemptCount, let retries = row.retryCount else { throw Self.challengeReadFailure }
                    return ChallengeEvidence(id: row._id, challengeKey: key, version: version, captureId: captureId,
                        status: status, reasonCode: row.reasonCode, attemptCount: attempts, retryCount: retries)
                }
                return (rows, page.pageInfo.hasNextPage, page.pageInfo.endCursor)
            }
        }
        return ChallengeCollection(challenges: challenges, badges: badges, evidence: evidence)
    }

    private static var challengeReadFailure: FoirError {
        FoirError(message: "Challenge checking is unavailable.", code: nil)
    }

    private func challengePages<Row>(_ read: (String?) async throws -> ([Row], Bool, String?)) async throws -> [Row] {
        var rows: [Row] = [], after: String?, seen = Set<String>()
        repeat {
            let (page, hasNext, cursor) = try await read(after)
            rows += page
            guard rows.count <= 10_000 else { throw Self.challengeReadFailure }
            if !hasNext { break }
            guard let cursor else { throw PaginationFailure.missingCursor }
            guard seen.count < 100, seen.insert(cursor).inserted else { throw PaginationFailure.repeatedCursor }
            after = cursor
        } while after != nil
        return rows
    }
}
