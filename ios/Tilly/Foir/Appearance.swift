import Foundation

struct AppearanceOptions {
    static let consentVersion = "cat-appearance-v2"
    let available: Bool
    let premiumOnly: Bool
    let eligible: Bool
    let enabled: Bool
}

extension Foir {
    func appearanceOptions(ifIdentity expected: TokenStore.Identity? = nil) async throws -> AppearanceOptions {
        let identity = if let expected { expected } else { await tokens.identity }
        let answer = try await fetch(ExecutionAPI.AppearancePreferencesQuery(now: .some(ISO8601DateFormatter().string(from: .now))), ifIdentity: identity)
        return AppearanceOptions(available: answer.appSettings?.appearanceEnabled == true && ["regular", "premium"].contains(answer.appSettings?.appearanceEligibility ?? ""),
            premiumOnly: answer.appSettings?.appearanceEligibility == "premium",
            eligible: answer.appSettings?.appearanceEligibility == "regular" || answer.myPremiumGrants.totalCount > 0,
            enabled: answer.myAppearanceAccount?.enabled == true && answer.myAppearanceAccount?.consentVersion == AppearanceOptions.consentVersion)
    }

    func saveAppearanceOptions(enabled: Bool, ifIdentity expected: TokenStore.Identity? = nil) async throws {
        let identity = if let expected { expected } else { await tokens.identity }
        let input = ExecutionAPI.SaveAppearancePreferencesInput(consentVersion: enabled ? .some(AppearanceOptions.consentVersion) : .none, enabled: enabled)
        let answer = try await perform(ExecutionAPI.SaveAppearancePreferencesMutation(input: input), ifIdentity: identity).executeSaveAppearancePreferences
        guard answer?.result?.ok == true else { throw FoirError(message: "The appearance preference could not be saved.", code: nil) }
    }

    func catAppearance(catId: String) async throws -> CatAppearanceEvidence? {
        let answer = try await fetch(ExecutionAPI.PublicCatAppearanceQuery(id: .some(catId)))
        let evidence = answer.appearanceVoteAggregate
        let result = CatAppearanceEvidence.fromGroups(evidence.groups.map { ($0.key, $0.count) }, truncated: evidence.truncated)
        return result
    }
}
