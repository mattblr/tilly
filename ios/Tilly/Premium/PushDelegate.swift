import UIKit
import UserNotifications

/// The system's half of push: the phone's address, handed to Fóir, and a tap
/// on a notification, which opens what it links to.
final class PushDelegate: NSObject, UIApplicationDelegate, UNUserNotificationCenterDelegate {
    /// Set by TillyApp once the model exists.
    var model: AppModel?

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

    /// Fóir puts a notification's link in `deepLink`.
    nonisolated func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse) async {
        guard let link = response.notification.request.content.userInfo["deepLink"] as? String, let url = URL(string: link) else { return }
        await MainActor.run { self.model?.open(url) }
    }
}
