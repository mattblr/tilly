import Foundation
import UniformTypeIdentifiers
import UserNotifications

/// Adds the finished art to a push without opening Tilly. A signed CDN link
/// is all it needs; expired links, slow downloads and bad files leave the text.
final class NotificationService: UNNotificationServiceExtension, URLSessionDownloadDelegate, @unchecked Sendable {
    private let lock = NSLock()
    private var handler: ((UNNotificationContent) -> Void)?
    private var content: UNMutableNotificationContent?
    private var download: URLSessionDownloadTask?
    private var session: URLSession?
    private static let maximumBytes: Int64 = 8 * 1024 * 1024

    override func didReceive(_ request: UNNotificationRequest, withContentHandler contentHandler: @escaping (UNNotificationContent) -> Void) {
        guard let copy = request.content.mutableCopy() as? UNMutableNotificationContent else {
            contentHandler(request.content)
            return
        }
        lock.lock()
        content = copy
        handler = contentHandler
        lock.unlock()

        guard let raw = copy.userInfo["imageUrl"] as? String, let url = URL(string: raw), Self.allowed(url) else {
            finish()
            return
        }
        let configuration = URLSessionConfiguration.ephemeral
        configuration.timeoutIntervalForRequest = 15
        configuration.timeoutIntervalForResource = 20
        configuration.httpCookieStorage = nil
        configuration.urlCredentialStorage = nil
        let session = URLSession(configuration: configuration, delegate: self, delegateQueue: nil)
        let task = session.downloadTask(with: url)
        lock.lock()
        guard handler != nil else {
            lock.unlock()
            session.invalidateAndCancel()
            return
        }
        self.session = session
        download = task
        lock.unlock()
        task.resume()
    }

    override func serviceExtensionTimeWillExpire() { finish() }

    /// Platform media only, the same hosts the app accepts (NotificationLink.imageURL).
    private static func allowed(_ url: URL) -> Bool {
        url.scheme == "https" && ["cdn.foir.dev", "cdn-dev.foir.dev"].contains(url.host ?? "") &&
            url.user == nil && url.password == nil && (url.port == nil || url.port == 443)
    }

    func urlSession(_ session: URLSession, task: URLSessionTask, willPerformHTTPRedirection response: HTTPURLResponse,
                    newRequest request: URLRequest, completionHandler: @escaping (URLRequest?) -> Void) {
        completionHandler(request.url.map(Self.allowed) == true ? request : nil)
    }

    func urlSession(_ session: URLSession, downloadTask: URLSessionDownloadTask, didWriteData bytesWritten: Int64,
                    totalBytesWritten: Int64, totalBytesExpectedToWrite: Int64) {
        if totalBytesWritten > Self.maximumBytes || totalBytesExpectedToWrite > Self.maximumBytes { finish() }
    }

    func urlSession(_ session: URLSession, downloadTask: URLSessionDownloadTask, didFinishDownloadingTo location: URL) {
        guard let response = downloadTask.response as? HTTPURLResponse, response.statusCode == 200,
              let finalURL = response.url, Self.allowed(finalURL),
              let mime = response.mimeType, ["image/png", "image/jpeg", "image/gif"].contains(mime),
              let type = UTType(mimeType: mime), let ext = type.preferredFilenameExtension,
              let size = try? location.resourceValues(forKeys: [.fileSizeKey]).fileSize,
              size > 0, Int64(size) <= Self.maximumBytes else { finish(); return }
        let directory = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString, isDirectory: true)
        defer { try? FileManager.default.removeItem(at: directory) }
        do {
            try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
            let file = directory.appendingPathComponent("art.\(ext)")
            try FileManager.default.moveItem(at: location, to: file)
            let attachment = try UNNotificationAttachment(identifier: "catch-art", url: file)
            finish(attachment: attachment)
        } catch { finish() }
    }

    func urlSession(_ session: URLSession, task: URLSessionTask, didCompleteWithError error: (any Error)?) {
        if error != nil { finish() }
    }

    /// Timeout and download completion may race. Deliver once, with the
    /// original title, body and deep link whether the attachment worked or not.
    private func finish(attachment: UNNotificationAttachment? = nil) {
        lock.lock()
        let deliver = handler
        let result = content
        if let attachment { result?.attachments = [attachment] }
        handler = nil
        content = nil
        let task = download
        let session = session
        download = nil
        self.session = nil
        lock.unlock()
        task?.cancel()
        session?.invalidateAndCancel()
        if let deliver, let result { deliver(result) }
    }
}
