import UIKit
import UserNotifications

/// The system's half of push: the phone's address, handed to Fóir, and a tap
/// on a notification, which opens what it links to.
final class PushDelegate: NSObject, UIApplicationDelegate, UNUserNotificationCenterDelegate {
    /// Set by TillyApp once the model exists. A tap that launched the app
    /// can arrive first; its link opens as soon as the model is here.
    var model: AppModel? {
        didSet {
            guard let model, let link = pendingLink else { return }
            pendingLink = nil
            model.open(link)
        }
    }
    private var pendingLink: URL?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil) -> Bool {
        UNUserNotificationCenter.current().delegate = self
        return true
    }

    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        Push.deviceToken = deviceToken
        guard let model, model.account != nil else { return }
        Task { try? await model.foir.registerDevice(token: deviceToken) }
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: any Error) {}

    /// A notification that arrives while Tilly is open still shows.
    nonisolated func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification) async -> UNNotificationPresentationOptions {
        [.banner, .list, .sound]
    }

    /// Fóir puts a notification's link in `deepLink`. UIKit must hear that the
    /// tap is handled on the main thread: the async form of this method
    /// finishes on a background thread, and UIKit aborts the app.
    nonisolated func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse, withCompletionHandler completionHandler: @escaping () -> Void) {
        let link = (response.notification.request.content.userInfo["deepLink"] as? String).flatMap(URL.init(string:))
        let done = MainThreadCompletion(completionHandler)
        DispatchQueue.main.async {
            MainActor.assumeIsolated {
                if let link {
                    if let model = self.model { model.open(link) } else { self.pendingLink = link }
                }
                done.call()
            }
        }
    }
}

/// UserNotifications' completion handlers aren't marked Sendable. This one is
/// only ever called on the main thread, after the tap has been handled.
private struct MainThreadCompletion: @unchecked Sendable {
    private let handler: () -> Void
    init(_ handler: @escaping () -> Void) { self.handler = handler }
    func call() { handler() }
}
