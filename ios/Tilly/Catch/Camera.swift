import AVFoundation
import SwiftUI
import UIKit
import Vision

/// The in-app viewfinder's camera: either lens, zoom, flash, and photos. The
/// session is only ever touched on its own queue; what the viewfinder shows
/// about it comes back as a `Lens`.
final class Camera: NSObject, @unchecked Sendable {
    enum Failure: LocalizedError, UserFailureCode {
        var userFailureCode: String? { "CAMERA" }
        case denied
        case unavailable
        case noPhoto

        var errorDescription: String? {
            switch self {
            case .denied: "Tilly needs the camera to catch cats. You can allow it in Settings."
            case .unavailable: "The camera isn't available right now."
            case .noPhoto: "That photo didn't come through. Try again."
            }
        }
    }

    /// What the viewfinder can offer for the lens in use. Zoom is in the
    /// factors the Camera app shows, where 1× is the main wide lens.
    struct Lens: Equatable, Sendable {
        var position: AVCaptureDevice.Position = .back
        var zoom: CGFloat = 1
        var minZoom: CGFloat = 1
        var maxZoom: CGFloat = 1
        /// The zooms worth a button: each lens's own, and 2×.
        var presets: [CGFloat] = [1]
        var hasFlash = false
    }

    static var isAvailable: Bool {
        AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back) != nil
    }

    /// How far digital zoom goes past the longest lens.
    static let zoomCeiling: CGFloat = 10

    let session = AVCaptureSession()
    /// Camera Control's zoom slider moved: the zoom it set.
    var zoomed: (@MainActor @Sendable (CGFloat) -> Void)?
    /// What the viewfinder sees, a few times a second: the cat in view, as a
    /// box in the upright frame with its origin top left and its sides from 0
    /// to 1, or nil when there is none; and the upright frame's size.
    var catSeen: (@MainActor @Sendable (CGRect?, CGSize) -> Void)?

    /// How often the viewfinder looks for a cat, in seconds.
    static let lookEvery: CFTimeInterval = 0.14

    private let output = AVCapturePhotoOutput()
    private let frames = AVCaptureVideoDataOutput()
    private let lookQueue = DispatchQueue(label: "ink.tilly.camera.look")
    /// Touched only on lookQueue.
    private var lastLook: CFTimeInterval = 0
    private let queue = DispatchQueue(label: "ink.tilly.camera")
    private var input: AVCaptureDeviceInput?
    private var pending: CheckedContinuation<UIImage, any Error>?

    func start() async throws -> Lens {
        guard await AVCaptureDevice.requestAccess(for: .video) else { throw Failure.denied }
        return try await onQueue { [self] in
            if input == nil { try configure(.back) }
            if !session.isRunning { session.startRunning() }
            return lens()
        }
    }

    func stop() {
        queue.async { [self] in
            if session.isRunning { session.stopRunning() }
        }
    }

    /// The other lens: the selfie camera, or back again.
    func flip() async throws -> Lens {
        try await onQueue { [self] in
            try configure(input?.device.position == .front ? .back : .front)
            return lens()
        }
    }

    /// Zooms to a factor the viewfinder shows, within what the lens can do.
    func zoom(to shown: CGFloat, animated: Bool = false) async -> Lens? {
        try? await onQueue { [self] in
            guard let device = input?.device else { return lens() }
            let factor = min(max(shown / device.displayVideoZoomFactorMultiplier, device.minAvailableVideoZoomFactor), maxFactor(device))
            try device.lockForConfiguration()
            if animated { device.ramp(toVideoZoomFactor: factor, withRate: 12) } else { device.videoZoomFactor = factor }
            device.unlockForConfiguration()
            var now = lens()
            now.zoom = factor * device.displayVideoZoomFactorMultiplier
            return now
        }
    }

    func capture(flash: AVCaptureDevice.FlashMode) async throws -> UIImage {
        try await withCheckedThrowingContinuation { continuation in
            queue.async { [self] in
                guard session.isRunning else { return continuation.resume(throwing: Failure.unavailable) }
                pending = continuation
                let settings = AVCapturePhotoSettings()
                if output.supportedFlashModes.contains(flash) { settings.flashMode = flash }
                output.capturePhoto(with: settings, delegate: self)
            }
        }
    }

    private func onQueue<T: Sendable>(_ work: @escaping @Sendable () throws -> T) async throws -> T {
        try await withCheckedThrowingContinuation { done in
            queue.async {
                do { done.resume(returning: try work()) } catch { done.resume(throwing: error) }
            }
        }
    }

    /// The back camera as one device across its lenses, so zooming out
    /// reaches the ultra wide as the Camera app does; the selfie camera alone.
    private static func device(at position: AVCaptureDevice.Position) -> AVCaptureDevice? {
        let kinds: [AVCaptureDevice.DeviceType] = position == .back
            ? [.builtInTripleCamera, .builtInDualWideCamera, .builtInDualCamera, .builtInWideAngleCamera]
            : [.builtInWideAngleCamera]
        return AVCaptureDevice.DiscoverySession(deviceTypes: kinds, mediaType: .video, position: position).devices.first
    }

    private func configure(_ position: AVCaptureDevice.Position) throws {
        guard let device = Self.device(at: position), let next = try? AVCaptureDeviceInput(device: device) else { throw Failure.unavailable }
        session.beginConfiguration()
        defer { session.commitConfiguration() }
        session.sessionPreset = .photo
        if let input { session.removeInput(input) }
        guard session.canAddInput(next) else {
            if let input { session.addInput(input) }
            throw Failure.unavailable
        }
        session.addInput(next)
        input = next
        if !session.outputs.contains(output) {
            guard session.canAddOutput(output) else { throw Failure.unavailable }
            session.addOutput(output)
        }
        // The frames the viewfinder looks for a cat in. Late ones are dropped:
        // only the newest is worth looking at.
        if !session.outputs.contains(frames), session.canAddOutput(frames) {
            frames.alwaysDiscardsLateVideoFrames = true
            frames.setSampleBufferDelegate(self, queue: lookQueue)
            session.addOutput(frames)
        }
        // Start at 1×, the main lens, not the ultra wide a triple camera opens on.
        if (try? device.lockForConfiguration()) != nil {
            device.videoZoomFactor = min(max(1 / device.displayVideoZoomFactorMultiplier, device.minAvailableVideoZoomFactor), maxFactor(device))
            device.unlockForConfiguration()
        }
        addCameraControl(for: device)
    }

    /// Camera Control's zoom, on phones that have the button.
    private func addCameraControl(for device: AVCaptureDevice) {
        guard session.supportsControls else { return }
        for control in session.controls { session.removeControl(control) }
        session.setControlsDelegate(self, queue: queue)
        let multiplier = device.displayVideoZoomFactorMultiplier
        let slider = AVCaptureSystemZoomSlider(device: device) { [weak self] factor in
            guard let zoomed = self?.zoomed else { return }
            Task { @MainActor in zoomed(factor * multiplier) }
        }
        if session.canAddControl(slider) { session.addControl(slider) }
    }

    private func maxFactor(_ device: AVCaptureDevice) -> CGFloat {
        let longest = (device.virtualDeviceSwitchOverVideoZoomFactors.last?.doubleValue).map { CGFloat($0) } ?? 1
        return min(device.maxAvailableVideoZoomFactor, longest * Self.zoomCeiling)
    }

    private func lens() -> Lens {
        guard let device = input?.device else { return Lens() }
        let multiplier = device.displayVideoZoomFactorMultiplier
        let shown = { (factor: CGFloat) in (factor * multiplier * 10).rounded() / 10 }
        var presets = Set([shown(device.minAvailableVideoZoomFactor)])
        for switchOver in device.virtualDeviceSwitchOverVideoZoomFactors { presets.insert(shown(CGFloat(switchOver.doubleValue))) }
        presets.insert(1)
        if maxFactor(device) * multiplier >= 2 { presets.insert(2) }
        return Lens(
            position: device.position,
            zoom: device.videoZoomFactor * multiplier,
            minZoom: device.minAvailableVideoZoomFactor * multiplier,
            maxZoom: maxFactor(device) * multiplier,
            presets: presets.sorted().filter { $0 >= device.minAvailableVideoZoomFactor * multiplier - 0.01 },
            hasFlash: device.hasFlash
        )
    }
}

extension Camera: AVCapturePhotoCaptureDelegate {
    func photoOutput(_ output: AVCapturePhotoOutput, didFinishProcessingPhoto photo: AVCapturePhoto, error: (any Error)?) {
        let image = photo.fileDataRepresentation().flatMap(UIImage.init(data:))
        queue.async { [self] in
            let continuation = pending
            pending = nil
            if let error {
                continuation?.resume(throwing: error)
            } else if let image {
                continuation?.resume(returning: image)
            } else {
                continuation?.resume(throwing: Failure.noPhoto)
            }
        }
    }
}

extension Camera: AVCaptureVideoDataOutputSampleBufferDelegate {
    func captureOutput(_ output: AVCaptureOutput, didOutput sampleBuffer: CMSampleBuffer, from connection: AVCaptureConnection) {
        let now = CACurrentMediaTime()
        guard let report = catSeen, now - lastLook >= Self.lookEvery, let buffer = CMSampleBufferGetImageBuffer(sampleBuffer) else { return }
        lastLook = now
        // The sensor lies on its side: upright is turned right, and mirrored
        // as well for the selfie camera, as its preview is.
        let front = connection.inputPorts.first?.sourceDevicePosition == .front
        let request = VNRecognizeAnimalsRequest()
        try? VNImageRequestHandler(cvPixelBuffer: buffer, orientation: front ? .leftMirrored : .right).perform([request])
        let cat = (request.results ?? [])
            .filter { $0.labels.contains { $0.identifier == VNAnimalIdentifier.cat.rawValue } }
            .max { $0.confidence < $1.confidence }
        // Vision's origin is bottom left; the viewfinder's is top left.
        let box = cat.map { CGRect(x: $0.boundingBox.minX, y: 1 - $0.boundingBox.maxY, width: $0.boundingBox.width, height: $0.boundingBox.height) }
        let upright = CGSize(width: CVPixelBufferGetHeight(buffer), height: CVPixelBufferGetWidth(buffer))
        Task { @MainActor in report(box, upright) }
    }
}

extension Camera: AVCaptureSessionControlsDelegate {
    func sessionControlsDidBecomeActive(_ session: AVCaptureSession) {}
    func sessionControlsWillEnterFullscreenAppearance(_ session: AVCaptureSession) {}
    func sessionControlsWillExitFullscreenAppearance(_ session: AVCaptureSession) {}
    func sessionControlsDidBecomeInactive(_ session: AVCaptureSession) {}
}

/// What the camera sees, filling its frame.
struct CameraPreview: UIViewRepresentable {
    let session: AVCaptureSession

    func makeUIView(context: Context) -> PreviewView {
        let view = PreviewView()
        view.preview.session = session
        view.preview.videoGravity = .resizeAspectFill
        return view
    }

    func updateUIView(_ view: PreviewView, context: Context) {}

    final class PreviewView: UIView {
        override class var layerClass: AnyClass { AVCaptureVideoPreviewLayer.self }
        var preview: AVCaptureVideoPreviewLayer { layer as! AVCaptureVideoPreviewLayer }
    }
}
