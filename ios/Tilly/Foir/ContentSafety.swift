import Foundation

extension Foir {
    func blockedAccounts() async throws -> Set<String> {
        guard config.contentSafetyEnabled else { return [] }
        guard await tokens.current?.userId != nil else { return [] }
        var ids = Set<String>(), cursors = Set<String>(), after: String?
        repeat {
            let page = try await fetch(SafetyAPI.BlockedAccountsQuery(after: .maybe(after))).myUserBlocks
            ids.formUnion(page.edges.compactMap(\.node.blockedUserId))
            guard page.pageInfo.hasNextPage else { return ids }
            guard let next = page.pageInfo.endCursor, cursors.insert(next).inserted else { throw FoirError(message: "The block list did not advance.", code: nil) }
            after = next
        } while after != nil
        return ids
    }
    func setBlocked(_ userID: String, blocked: Bool, expectedUserID: String) async throws {
        guard await tokens.current?.userId == expectedUserID else { throw FoirError(message: "The signed-in account changed.", code: nil) }
        let result = try await perform(SafetyAPI.SetUserBlockMutation(input: .init(blocked: blocked, userId: userID))).executeSetUserBlock
        guard result?.result?.ok == true, result?.result?.active == blocked else { throw FoirError(message: result?.execution.error ?? "The account selection did not save.", code: nil) }
    }
    func reportContent(type: String, id: String, reason: String, details: String, key: String, expectedUserID: String) async throws {
        guard await tokens.current?.userId == expectedUserID,
              let kind = SafetyAPI.ReportContentInputTargetType(rawValue: type),
              let why = SafetyAPI.ReportContentInputReason(rawValue: reason) else { throw FoirError(message: "Sign in and choose a report reason.", code: nil) }
        let input = SafetyAPI.ReportContentInput(details: .some(details), reason: .case(why), targetId: id, targetType: .case(kind))
        let result = try await perform(SafetyAPI.ReportContentMutation(input: input, key: .some(key))).executeReportContent
        guard result?.result?.ok == true else { throw FoirError(message: result?.execution.error ?? "The report did not save.", code: nil) }
    }
}
