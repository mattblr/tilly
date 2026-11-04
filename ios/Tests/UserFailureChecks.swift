import Foundation

private struct ProviderFailure: LocalizedError, UserFailureCode {
    let userFailureCode: String?
    var errorDescription: String? { "[foir] HTTP 500 private record / credential" }
}
@main struct UserFailureChecks {
    static func main() {
        precondition(UserFailure.key(ProviderFailure(userFailureCode: nil)) == "errors.generic")
        precondition(UserFailure.key(ProviderFailure(userFailureCode: "INTERNAL")) == "errors.generic")
        precondition(UserFailure.key(ProviderFailure(userFailureCode: "UNAUTHENTICATED")) == "errors.signIn")
        precondition(UserFailure.key(ProviderFailure(userFailureCode: "STEP_UP_REQUIRED")) == "errors.recentAuth")
        precondition(UserFailure.key(ProviderFailure(userFailureCode: "INVALID_ARGUMENT")) == "errors.invalid")
        precondition(UserFailure.key(ProviderFailure(userFailureCode: "RATE_LIMITED")) == "errors.limited")
        precondition(UserFailure.key(URLError(.notConnectedToInternet)) == "errors.network")
        precondition(UserFailure.key(ProviderFailure(userFailureCode: "LOCATION_DENIED")) == "errors.locationDenied")
        precondition(UserFailure.key(ProviderFailure(userFailureCode: "LOCATION")) == "errors.location")
        print("Native friendly failure checks passed (9 controls).")
    }
}
