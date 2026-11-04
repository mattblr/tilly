import AVFoundation
import AVKit
import PhosphorSwift
import PhotosUI
import SwiftUI

/// The Capture tab: always the camera, ready. A photo taken opens the catch
/// over it, so closing the catch comes straight back to a live viewfinder.
/// Catching needs a user; everything else in Tilly is open to anyone.
struct CaptureView: View {
    @Environment(AppModel.self) private var model

    var body: some View {
        Group {
            if model.account == nil {
                signedOut
            } else {
                Viewfinder { model.catching = CatchFlow(photo: $0, foir: model.foir, copy: model.config) }
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        .background(Theme.background)
    }

    private var signedOut: some View {
        VStack(alignment: .leading, spacing: 16) {
            ScreenTitle(title: model.config.t("catch.title"), subtitle: model.config.t("catch.keepCats"))
            Text(model.config.t("catch.signedOut"))
                .font(.body15)
                .foregroundStyle(Theme.muted)
            Button(model.config.t("common.signIn")) { model.signInReason = model.config.t("catch.keepCats") }
                .buttonStyle(.primary)
        }
        .padding(.horizontal, Theme.margin)
    }
}

/// The camera, and only the camera: a catch is a photo taken there and then.
/// Pinch or the zoom buttons zoom, Camera Control zooms and shoots, and the
/// volume buttons shoot as they do in the Camera app. The simulator has no
/// camera, so a debug build there picks a photo instead.
private struct Viewfinder: View {
    let taken: (UIImage) -> Void

    @Environment(AppModel.self) private var model
    @State private var camera = Camera()
    @State private var lens = Camera.Lens()
    @State private var flash: AVCaptureDevice.FlashMode = .off
    @State private var failure: String?
    @State private var capturing = false
    @State private var shots = 0
    @State private var pinchFrom: CGFloat?
    @State private var catBox: CGRect?
    @State private var frameSize: CGSize = .zero
    @State private var picked: PhotosPickerItem?

    /// Live while the tab is in front and no catch is open over it.
    private var live: Bool { model.tab == .capture && model.catching == nil }

    var body: some View {
        ZStack {
            if Camera.isAvailable {
                CameraPreview(session: camera.session)
                    .gesture(pinch)
                    .overlay { CatBox(box: catBox, frame: frameSize) }
                    .ignoresSafeArea()
            } else {
                Color.black.ignoresSafeArea()
            }
            if let failure {
                Text(model.config.failureText(failure))
                    .font(.body15)
                    .foregroundStyle(.white)
                    .multilineTextAlignment(.center)
                    .padding(24)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color.black.ignoresSafeArea())
        .safeAreaInset(edge: .bottom, spacing: 0) {
            controls
                .padding(.horizontal, Theme.margin)
                .padding(.bottom, 18)
        }
        .task(id: live) {
            guard Camera.isAvailable else { return }
            if live {
                camera.zoomed = { lens.zoom = $0 }
                camera.catSeen = { box, size in
                    withAnimation(.easeOut(duration: 0.15)) { catBox = box }
                    frameSize = size
                }
                do { lens = try await camera.start(); failure = nil } catch { failure = UserFailure.key(error) }
            } else {
                camera.stop()
                catBox = nil
            }
        }
        .onDisappear { camera.stop() }
        .onCameraCaptureEvent(isEnabled: live && !capturing) { event in
            if event.phase == .ended { shoot() }
        }
        .sensoryFeedback(.impact(weight: .medium), trigger: shots)
        .onChange(of: picked) {
            guard let picked else { return }
            Task {
                if let data = try? await picked.loadTransferable(type: Data.self), let photo = UIImage(data: data) { taken(photo) }
                self.picked = nil
            }
        }
    }

    private var pinch: some Gesture {
        MagnifyGesture()
            .onChanged { value in
                let from = pinchFrom ?? lens.zoom
                pinchFrom = from
                let target = min(max(from * value.magnification, lens.minZoom), lens.maxZoom)
                lens.zoom = target
                Task { if let now = await camera.zoom(to: target) { lens.zoom = now.zoom } }
            }
            .onEnded { _ in pinchFrom = nil }
    }

    @ViewBuilder
    private var controls: some View {
        if Camera.isAvailable {
            VStack(spacing: 14) {
                if lens.presets.count > 1 { zoomPresets }
                HStack {
                    flashButton.frame(maxWidth: .infinity)
                    Button(action: shoot) { ShutterRing() }
                        .buttonStyle(.plain)
                        .disabled(capturing || failure != nil)
                        .accessibilityLabel(model.config.t("catch.takePhoto"))
                    flipButton.frame(maxWidth: .infinity)
                }
            }
        } else {
            #if targetEnvironment(simulator)
            PhotosPicker(selection: $picked, matching: .images) { ShutterRing() }
                .accessibilityLabel(model.config.t("catch.pickPhoto"))
            #else
            Text(model.config.t("catch.cameraMissing")).font(.meta)
            #endif
        }
    }

    /// One button per lens, as the Camera app has. The one in use shows the
    /// exact zoom, so a pinch between lenses still reads true.
    private var zoomPresets: some View {
        let active = lens.presets.last { $0 <= lens.zoom + 0.05 } ?? lens.presets[0]
        return HStack(spacing: 4) {
            ForEach(lens.presets, id: \.self) { preset in
                let isActive = preset == active
                Button {
                    Task { if let now = await camera.zoom(to: preset, animated: true) { lens = now; lens.zoom = preset } }
                } label: {
                    Text(isActive ? Self.zoomLabel(lens.zoom, suffix: true) : Self.zoomLabel(preset, suffix: false))
                        .font(.system(size: isActive ? 13 : 11, weight: .semibold))
                        .monospacedDigit()
                        .foregroundStyle(isActive ? Color.yellow : .white)
                        .frame(width: 38, height: 38)
                        .background(.black.opacity(0.45), in: Circle())
                }
                .buttonStyle(.plain)
                .accessibilityLabel(model.config.t("catch.zoom", ["zoom": Self.zoomLabel(preset, suffix: true)]))
            }
        }
        .padding(4)
        .background(.black.opacity(0.25), in: Capsule())
    }

    /// "0.5", "1", "2.4": to a tenth, without a trailing ".0".
    static func zoomLabel(_ zoom: CGFloat, suffix: Bool) -> String {
        let tenths = Int((zoom * 10).rounded())
        let text = tenths % 10 == 0 ? "\(tenths / 10)" : "\(tenths / 10).\(tenths % 10)"
        return suffix ? "\(text)×" : text
    }

    private var flashButton: some View {
        Button {
            flash = switch flash {
            case .off: .auto
            case .auto: .on
            default: .off
            }
        } label: {
            Group {
                switch flash {
                case .on: Ph.lightning.fill
                case .auto: Ph.lightningA.regular
                default: Ph.lightningSlash.regular
                }
            }
            .frame(width: 22, height: 22)
            .foregroundStyle(flash == .on ? Color.yellow : .white)
            .frame(width: 48, height: 48)
            .background(.black.opacity(0.4), in: Circle())
        }
        .buttonStyle(.plain)
        .opacity(lens.hasFlash ? 1 : 0.35)
        .disabled(!lens.hasFlash)
        .accessibilityLabel(model.config.t("catch.flash"))
        .accessibilityValue(flash == .on ? model.config.t("common.on") : flash == .auto ? model.config.t("common.automatic") : model.config.t("common.off"))
    }

    private var flipButton: some View {
        Button {
            Task {
                do { lens = try await camera.flip() } catch { failure = UserFailure.key(error) }
            }
        } label: {
            Ph.cameraRotate.regular
                .frame(width: 22, height: 22)
                .foregroundStyle(.white)
                .frame(width: 48, height: 48)
                .background(.black.opacity(0.4), in: Circle())
        }
        .buttonStyle(.plain)
        .sensoryFeedback(.selection, trigger: lens.position)
        .accessibilityLabel(model.config.t(lens.position == .front ? "catch.backCamera" : "catch.selfieCamera"))
    }

    private func shoot() {
        guard !capturing, failure == nil else { return }
        capturing = true
        shots += 1
        Task {
            do { taken(try await camera.capture(flash: lens.hasFlash ? flash : .off)) } catch { failure = UserFailure.key(error) }
            capturing = false
        }
    }
}

/// The box round the cat the viewfinder sees, drawn over the preview, which
/// fills its frame the way the preview layer does.
private struct CatBox: View {
    let box: CGRect?
    let frame: CGSize

    var body: some View {
        GeometryReader { geo in
            if let box, frame.width > 0, frame.height > 0 {
                let rect = Self.place(box, image: frame, in: geo.size)
                RoundedRectangle(cornerRadius: 14)
                    .stroke(.white, lineWidth: 3)
                    .shadow(color: .black.opacity(0.35), radius: 4)
                    .frame(width: rect.width, height: rect.height)
                    .position(x: rect.midX, y: rect.midY)
                    .transition(.opacity)
            }
        }
        .allowsHitTesting(false)
        .accessibilityHidden(true)
    }

    /// Where a box in the upright frame falls once the frame is scaled to fill
    /// the view and centred, as `resizeAspectFill` does.
    static func place(_ box: CGRect, image: CGSize, in view: CGSize) -> CGRect {
        let scale = max(view.width / image.width, view.height / image.height)
        let drawn = CGSize(width: image.width * scale, height: image.height * scale)
        let origin = CGPoint(x: (view.width - drawn.width) / 2, y: (view.height - drawn.height) / 2)
        return CGRect(
            x: origin.x + box.minX * drawn.width,
            y: origin.y + box.minY * drawn.height,
            width: box.width * drawn.width,
            height: box.height * drawn.height
        )
    }
}

private struct ShutterRing: View {
    var body: some View {
        Circle()
            .fill(.white)
            .padding(9)
            .overlay(Circle().stroke(.white, lineWidth: 5))
            .frame(width: 70, height: 70)
    }
}
