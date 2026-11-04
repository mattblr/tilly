import SwiftUI
import UIKit

/// A cat's photos full screen, at their full size: swipe between them, pinch
/// or double tap to zoom, and drag down to close.
struct PhotoViewer: View {
    let photos: Paged<GalleryPhoto>
    let start: String
    let catName: String
    let details: CaptureDetails

    @Environment(AppModel.self) private var model

    @Environment(\.dismiss) private var dismiss
    @State private var selection: String?
    @State private var drop: CGFloat = 0
    @State private var zoomed = false

    var body: some View {
        ZStack(alignment: .topTrailing) {
            Color.black.opacity(1 - min(abs(drop) / 400, 0.6)).ignoresSafeArea()
            TabView(selection: $selection) {
                ForEach(photos.rows) { photo in
                    let piece = model.art.piece(for: photo.id)
                    ZoomablePhoto(url: photo.full, preview: photo.medium,
                                  art: piece?.status == .ready ? piece?.image : nil,
                                  label: model.config.t("cat.photoOf", ["name": catName]),
                                  showArtLabel: model.config.t("art.flip"),
                                  showPhotoLabel: model.config.t("art.flipBack"),
                                  zoomed: $zoomed)
                        .tag(Optional(photo.id))
                        .task { await photos.reached(photo) }
                }
            }
            .tabViewStyle(.page(indexDisplayMode: photos.rows.count > 1 ? .always : .never))
            .ignoresSafeArea()
            .offset(y: drop)
            .simultaneousGesture(
                DragGesture(minimumDistance: 20)
                    .onChanged { value in
                        guard !zoomed, abs(value.translation.height) > abs(value.translation.width) else { return }
                        drop = value.translation.height
                    }
                    .onEnded { value in
                        guard !zoomed else { return }
                        if abs(value.translation.height) > 140 || abs(value.predictedEndTranslation.height) > 400 {
                            dismiss()
                        } else {
                            withAnimation(.snappy) { drop = 0 }
                        }
                    }
            )

            if let detail = details.detail(of: selection ?? start), !detail.highlightKeys.isEmpty {
                VStack {
                    Spacer()
                    PostHighlightBadges(catalog: detail.highlightCatalog, selected: detail.highlightKeys)
                        .padding(.horizontal, 16).padding(.bottom, photos.rows.count > 1 ? 72 : 36)
                }
                .frame(maxWidth: .infinity)
                .allowsHitTesting(false)
            }

            Button { dismiss() } label: {
                Image(systemName: "xmark").font(.system(size: 17, weight: .semibold)).frame(width: 44, height: 44)
            }
            .buttonStyle(.glass)
            .padding(.trailing, 16)
            .accessibilityLabel(model.config.t("common.close"))
        }
        .onAppear { selection = start }
        .onChange(of: selection) { zoomed = false; drop = 0 }
        .task(id: photos.rows.map(\.id)) { await model.art.load(photos.rows.map(\.id)) }
        .statusBarHidden()
    }
}

/// One photo that zooms like Photos: pinch, pan, and double tap in and out.
private struct ZoomablePhoto: UIViewRepresentable {
    let url: URL?
    let preview: URL?
    let art: URL?
    let label: String
    let showArtLabel: String
    let showPhotoLabel: String
    @Binding var zoomed: Bool

    func makeCoordinator() -> Coordinator { Coordinator(zoomed: $zoomed) }

    func makeUIView(context: Context) -> UIScrollView {
        let scroll = UIScrollView()
        scroll.delegate = context.coordinator
        scroll.minimumZoomScale = 1
        scroll.maximumZoomScale = 5
        scroll.showsVerticalScrollIndicator = false
        scroll.showsHorizontalScrollIndicator = false
        scroll.contentInsetAdjustmentBehavior = .never
        scroll.backgroundColor = .clear

        let image = context.coordinator.imageView
        image.contentMode = .scaleAspectFit
        image.frame = scroll.bounds
        image.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        image.isUserInteractionEnabled = true
        scroll.addSubview(image)

        let doubleTap = UITapGestureRecognizer(target: context.coordinator, action: #selector(Coordinator.doubleTapped(_:)))
        doubleTap.numberOfTapsRequired = 2
        scroll.addGestureRecognizer(doubleTap)
        let hold = UILongPressGestureRecognizer(target: context.coordinator, action: #selector(Coordinator.held(_:)))
        hold.minimumPressDuration = 0.3
        hold.allowableMovement = 10
        hold.cancelsTouchesInView = false
        hold.delegate = context.coordinator
        scroll.addGestureRecognizer(hold)

        context.coordinator.configure(label: label, showArt: showArtLabel, showPhoto: showPhotoLabel)
        context.coordinator.load(preview: preview, full: url)
        context.coordinator.loadArt(art)
        return scroll
    }

    func updateUIView(_ scroll: UIScrollView, context: Context) {
        context.coordinator.configure(label: label, showArt: showArtLabel, showPhoto: showPhotoLabel)
        context.coordinator.loadArt(art)
    }

    static func dismantleUIView(_ scroll: UIScrollView, coordinator: Coordinator) {
        coordinator.cancel()
    }

    @MainActor
    final class Coordinator: NSObject, UIScrollViewDelegate, UIGestureRecognizerDelegate {
        let imageView = UIImageView()
        private let zoomed: Binding<Bool>
        private var photoImage: UIImage?
        private var artImage: UIImage?
        private var artURL: URL?
        private var showingArt = false
        private var photoTask: Task<Void, Never>?
        private var artTask: Task<Void, Never>?
        private var showArtLabel = ""
        private var showPhotoLabel = ""

        init(zoomed: Binding<Bool>) {
            self.zoomed = zoomed
        }

        func configure(label: String, showArt: String, showPhoto: String) {
            imageView.isAccessibilityElement = true
            imageView.accessibilityLabel = label
            imageView.accessibilityTraits = .image
            showArtLabel = showArt
            showPhotoLabel = showPhoto
            updateAccessibility()
        }

        func load(preview: URL?, full: URL?) {
            photoTask?.cancel()
            if let preview, let known = PhotoLoader.cached(preview) { photoImage = known; imageView.image = known }
            photoTask = Task { [weak self] in
                if self?.photoImage == nil, let quick = await PhotoLoader.image(at: preview), !Task.isCancelled {
                    self?.photoImage = quick
                    if self?.showingArt == false { self?.imageView.image = quick }
                }
                if let sharp = await PhotoLoader.image(at: full), !Task.isCancelled {
                    self?.photoImage = sharp
                    if self?.showingArt == false { self?.imageView.image = sharp }
                }
            }
        }

        func loadArt(_ url: URL?) {
            guard url != artURL else { return }
            artTask?.cancel()
            artURL = url
            artImage = nil
            showingArt = false
            imageView.image = photoImage
            updateAccessibility()
            guard let url else { return }
            artTask = Task { [weak self] in
                let image = await PhotoLoader.image(at: url)
                guard !Task.isCancelled, let self, self.artURL == url else { return }
                self.artImage = image
                self.updateAccessibility()
            }
        }

        func cancel() { photoTask?.cancel(); artTask?.cancel() }

        private func updateAccessibility() {
            guard artImage != nil else { imageView.accessibilityCustomActions = nil; imageView.accessibilityHint = nil; return }
            let title = showingArt ? showPhotoLabel : showArtLabel
            imageView.accessibilityHint = title
            imageView.accessibilityCustomActions = [UIAccessibilityCustomAction(name: title, target: self, selector: #selector(accessibilityFlip))]
        }

        @objc private func accessibilityFlip() -> Bool { flip() }

        @discardableResult private func flip() -> Bool {
            guard let artImage, let photoImage else { return false }
            showingArt.toggle()
            let image = showingArt ? artImage : photoImage
            UIView.transition(with: imageView,
                              duration: UIAccessibility.isReduceMotionEnabled ? 0 : 0.28,
                              options: [.transitionCrossDissolve, .allowUserInteraction]) {
                self.imageView.image = image
            }
            UIImpactFeedbackGenerator(style: .medium).impactOccurred()
            updateAccessibility()
            return true
        }

        @objc func held(_ hold: UILongPressGestureRecognizer) {
            if hold.state == .began { flip() }
        }

        func gestureRecognizerShouldBegin(_ gestureRecognizer: UIGestureRecognizer) -> Bool {
            // Movement cancels a hold before it wins; paging, pinch and drag-down
            // keep their existing recognizers. No artwork means no hold at all.
            artImage != nil && photoImage != nil
        }

        func viewForZooming(in scrollView: UIScrollView) -> UIView? { imageView }

        func scrollViewDidZoom(_ scrollView: UIScrollView) {
            zoomed.wrappedValue = scrollView.zoomScale > 1.01
        }

        @objc func doubleTapped(_ tap: UITapGestureRecognizer) {
            guard let scroll = tap.view as? UIScrollView else { return }
            if scroll.zoomScale > 1.01 {
                scroll.setZoomScale(1, animated: true)
            } else {
                let point = tap.location(in: imageView)
                let size = CGSize(width: scroll.bounds.width / 2.5, height: scroll.bounds.height / 2.5)
                scroll.zoom(to: CGRect(x: point.x - size.width / 2, y: point.y - size.height / 2, width: size.width, height: size.height), animated: true)
            }
        }
    }
}
