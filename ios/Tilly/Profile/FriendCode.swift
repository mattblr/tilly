import CoreImage.CIFilterBuiltins
import SwiftUI
import VisionKit

/// The user's own code: a friend scans it, in Tilly or the Camera app, and
/// lands on their page to follow them.
struct MyCodeSheet: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            VStack(spacing: 18) {
                if let me = model.account?.userId {
                    let link = ProfileLink.url(for: me)
                    QRCode(text: link.absoluteString)
                        .frame(width: 240, height: 240)
                        .padding(18)
                        .background(.white, in: RoundedRectangle(cornerRadius: 22))
                        .padding(.top, 30)
                    VStack(spacing: 4) {
                        Text(model.circle.mine?.displayName ?? model.config.t("profile.code.yourCode")).font(.sectionTitle)
                        if let username = model.circle.mine?.username, !username.isEmpty {
                            Text("@\(username)").font(.meta).foregroundStyle(Theme.muted)
                        }
                    }
                    Text(model.config.t("profile.code.intro"))
                        .font(.meta)
                        .foregroundStyle(Theme.muted)
                        .multilineTextAlignment(.center)
                    ShareLink(item: link, subject: Text(model.config.t("profile.code.shareSubject")), message: Text(model.config.t("profile.code.shareMessage"))) {
                        Label(model.config.t("profile.code.share"), systemImage: "square.and.arrow.up")
                    }
                    .buttonStyle(.secondary)
                }
                Spacer()
            }
            .padding(.horizontal, Theme.margin)
            .frame(maxWidth: .infinity)
            .background(Theme.background)
            .navigationTitle(model.config.t("profile.code.title"))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button(role: .close) { dismiss() } }
            }
        }
    }
}

/// A QR code, drawn crisp at any size.
struct QRCode: View {
    @Environment(AppModel.self) private var model
    let text: String

    var body: some View {
        if let image = Self.image(for: text) {
            Image(uiImage: image).resizable().interpolation(.none).scaledToFit()
                .accessibilityLabel(model.config.t("profile.code.accessibility"))
        }
    }

    static func image(for text: String) -> UIImage? {
        let filter = CIFilter.qrCodeGenerator()
        filter.message = Data(text.utf8)
        filter.correctionLevel = "M"
        guard let output = filter.outputImage, let cg = CIContext().createCGImage(output, from: output.extent) else { return nil }
        return UIImage(cgImage: cg)
    }
}

/// Scanning a friend's code: the first Tilly code seen opens their page.
struct ScanCodeSheet: View {
    @Environment(AppModel.self) private var model
    let found: (String) -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var note: String?

    var body: some View {
        NavigationStack {
            Group {
                if DataScannerViewController.isSupported, DataScannerViewController.isAvailable {
                    CodeScanner { text in
                        guard let url = URL(string: text), let userId = ProfileLink.userId(in: url) else {
                            note = model.config.t("profile.code.invalid")
                            return
                        }
                        found(userId)
                    }
                    .ignoresSafeArea(edges: .bottom)
                    .overlay(alignment: .bottom) {
                        Text(note ?? model.config.t("profile.code.point"))
                            .font(.body15)
                            .padding(.horizontal, 16)
                            .padding(.vertical, 10)
                            .background(.regularMaterial, in: Capsule())
                            .padding(.bottom, 40)
                    }
                } else {
                    VStack(spacing: 8) {
                        Text(model.config.t("profile.code.unavailable")).font(.sectionTitle)
                        Text(model.config.t("profile.code.cameraRequired"))
                            .font(.meta)
                            .foregroundStyle(Theme.muted)
                            .multilineTextAlignment(.center)
                    }
                    .padding(Theme.margin)
                }
            }
            .navigationTitle(model.config.t("profile.code.scan"))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button(role: .close) { dismiss() } }
            }
        }
    }
}

/// VisionKit's live scanner, reading QR codes only.
private struct CodeScanner: UIViewControllerRepresentable {
    let found: (String) -> Void

    func makeCoordinator() -> Coordinator { Coordinator(found: found) }

    func makeUIViewController(context: Context) -> DataScannerViewController {
        let scanner = DataScannerViewController(
            recognizedDataTypes: [.barcode(symbologies: [.qr])],
            qualityLevel: .balanced,
            recognizesMultipleItems: false,
            isHighFrameRateTrackingEnabled: false,
            isHighlightingEnabled: true
        )
        scanner.delegate = context.coordinator
        return scanner
    }

    func updateUIViewController(_ scanner: DataScannerViewController, context: Context) {
        if !scanner.isScanning { try? scanner.startScanning() }
    }

    static func dismantleUIViewController(_ scanner: DataScannerViewController, coordinator: Coordinator) {
        scanner.stopScanning()
    }

    @MainActor
    final class Coordinator: NSObject, DataScannerViewControllerDelegate {
        let found: (String) -> Void

        init(found: @escaping (String) -> Void) {
            self.found = found
        }

        func dataScanner(_ dataScanner: DataScannerViewController, didAdd addedItems: [RecognizedItem], allItems: [RecognizedItem]) {
            for case .barcode(let code) in addedItems {
                if let text = code.payloadStringValue { found(text) }
            }
        }
    }
}
