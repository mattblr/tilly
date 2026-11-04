import Foundation

extension Foir {
    /// Self-service and recent-sign-in proof stay on Fóir. Success closes the
    /// account; its owned files/records are removed by platform continuation.
    func deleteAccount(expectedUserID: String) async throws -> Bool {
        let identity = await tokens.identity
        guard identity.userId == expectedUserID else {
            throw FoirError(message: "The signed-in account changed.", code: nil)
        }
        let result = try await perform(FoirAPI.DeleteOwnAccountMutation(), ifIdentity: identity).deleteMyAccount
        guard result?.success == true else {
            throw FoirError(message: "Account deletion was not accepted.", code: nil)
        }
        guard await tokens.identity == identity else { return false }
        // The accepted deletion revoked this session. Do not try another
        // authenticated mutation with it; forget local registration instead.
        return await forgetDeletedAccount(identity: identity)
    }
}
