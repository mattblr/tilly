import Foundation

/// Presentation uses an allowlist of copy keys, never an SDK/provider error's text.
protocol UserFailureCode { var userFailureCode: String? { get } }
enum UserFailure {
    static func key(_ error: any Error) -> String {
        if let url = error as? URLError {
            switch url.code {
            case .notConnectedToInternet, .networkConnectionLost, .timedOut, .cannotConnectToHost, .cannotFindHost: return "errors.network"
            default: break
            }
        }
        let kind: String
        switch (error as? any UserFailureCode)?.userFailureCode {
        case "UNAUTHENTICATED": kind = "signIn"
        case "STEP_UP_REQUIRED": kind = "recentAuth"
        case "PERMISSION_DENIED": kind = "permission"
        case "INVALID_ARGUMENT": kind = "invalid"
        case "ALREADY_EXISTS": kind = "conflict"
        case "RATE_LIMITED": kind = "limited"
        case "TIMEOUT", "UNAVAILABLE": kind = "network"
        case "CAMERA": kind = "camera"
        case "LOCATION_DENIED": kind = "locationDenied"
        case "LOCATION": kind = "location"
        case "PENDING": kind = "pending"
        default: kind = "generic"
        }
        return "errors.\(kind)"
    }
}
