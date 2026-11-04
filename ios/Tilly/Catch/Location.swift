import CoreLocation
import Observation
import UIKit

/// Where the user is, asked for when they need it: to catch, or to see the
/// cats around them.
enum Location {
    enum Failure: LocalizedError, UserFailureCode {
        case denied
        case unavailable

        var userFailureCode: String? {
            switch self {
            case .denied: "LOCATION_DENIED"
            case .unavailable: "LOCATION"
            }
        }

        var errorDescription: String? {
            switch self {
            case .denied: "Tilly needs your location to know which cats live near you. You can allow it in Settings."
            case .unavailable: "Your location couldn't be found. Try again in a moment."
            }
        }
    }

    static func current(timeout: Duration = .seconds(12)) async throws -> CLLocationCoordinate2D {
        try await withThrowingTaskGroup(of: CLLocationCoordinate2D.self) { tasks in
            tasks.addTask { try await nextLocation() }
            tasks.addTask {
                try await Task.sleep(for: timeout)
                throw Failure.unavailable
            }
            defer { tasks.cancelAll() }
            guard let coordinate = try await tasks.next() else { throw Failure.unavailable }
            return coordinate
        }
    }

    private static func nextLocation() async throws -> CLLocationCoordinate2D {
        let session = CLServiceSession(authorization: .whenInUse)
        defer { withExtendedLifetime(session) {} }
        for try await update in CLLocationUpdate.liveUpdates() {
            try Task.checkCancellation()
            if update.authorizationDenied || update.authorizationDeniedGlobally { throw Failure.denied }
            if let location = update.location { return location.coordinate }
        }
        try Task.checkCancellation()
        throw Failure.unavailable
    }
}


/// One foreground permission request shared by the launch, map and feed.
/// Permission changes invalidate location-dependent views; no coordinates persist here.
@MainActor @Observable
final class LocationPermission: NSObject, CLLocationManagerDelegate {
    private let manager = CLLocationManager()
    private(set) var authorization: CLAuthorizationStatus = .notDetermined
    private(set) var revision = 0

    var isAuthorized: Bool { authorization == .authorizedAlways || authorization == .authorizedWhenInUse }

    override init() {
        super.init()
        authorization = manager.authorizationStatus
        manager.delegate = self
    }

    func requestOnOpen() {
        authorization = manager.authorizationStatus
        if authorization == .notDetermined { manager.requestWhenInUseAuthorization() }
    }

    func becameActive() {
        requestOnOpen()
        revision += 1
    }

    nonisolated func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        Task { @MainActor [weak self] in
            guard let self else { return }
            let status = self.manager.authorizationStatus
            guard status != self.authorization else { return }
            self.authorization = status
            self.revision += 1
        }
    }

    static func openSettings() {
        // Request this app's settings using Apple's supported URL.
        guard let url = URL(string: UIApplication.openSettingsURLString) else { return }
        UIApplication.shared.open(url)
    }
}
