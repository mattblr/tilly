import UIKit
import Vision

/// What the phone sees in a photo: whether a cat is in it, and the vector that
/// stands for that cat.
enum CatVision {
    /// Names the model the vectors come from. A vector is compared only with
    /// vectors from the same model, so changing the model starts afresh rather
    /// than matching nonsense. Apple's feature print stands in until the recognition pipeline
    /// has measured which model recognises one cat across photos.
    static let vectorModel = "apple-featureprint-2"

    /// The longest side of the photo as uploaded, in pixels.
    private static let longestSide: CGFloat = 2048
    /// How sure the animal detector must be that it found a cat.
    private static let catConfidence: Float = 0.5

    struct Examined: Sendable {
        /// The photo as it is uploaded: upright, re-encoded, with none of the
        /// camera's metadata. The photo is public; where it was taken is not.
        let jpeg: Data
        /// The cat's vector, or nil when the photo has no cat in it.
        let vector: [Double]?
        let cats: [DetectedCat]
    }

    struct DetectedCat: Sendable {
        /// Upright image coordinates, measured from the top left, like web tags.
        let bounds: CGRect
        let vector: [Double]
    }

    @concurrent
    static func examine(_ photo: UIImage, multiple: Bool = false) async throws -> Examined {
        let upright = redrawn(photo)
        guard let image = upright.cgImage, let jpeg = upright.jpegData(compressionQuality: 0.85) else {
            throw FoirError(message: "That photo couldn't be read.", code: nil)
        }
        let detected = try detectedCats(in: image)
        let boxes = multiple ? detected : Array(detected.prefix(1))
        guard boxes.count <= 8 else {
            throw FoirError(message: "There are more than eight cats in this photo. Try a smaller group.", code: nil)
        }
        let cats = try boxes.map { box in
            // Feature prints stay local, per cat, in the existing model space.
            let crop = image.cropping(to: pixelRect(of: box, in: image)) ?? image
            return DetectedCat(bounds: CGRect(x: box.minX, y: 1 - box.maxY, width: box.width, height: box.height), vector: try featurePrint(of: crop))
        }
        return Examined(jpeg: jpeg, vector: cats.first?.vector, cats: cats)
    }

    private static func redrawn(_ photo: UIImage) -> UIImage {
        let scale = min(1, longestSide / max(photo.size.width, photo.size.height))
        let size = CGSize(width: (photo.size.width * scale).rounded(), height: (photo.size.height * scale).rounded())
        let format = UIGraphicsImageRendererFormat()
        format.scale = 1
        return UIGraphicsImageRenderer(size: size, format: format).image { _ in
            photo.draw(in: CGRect(origin: .zero, size: size))
        }
    }

    private static func detectedCats(in image: CGImage) throws -> [CGRect] {
        let request = VNRecognizeAnimalsRequest()
        try configureSimulatorCompute(request)
        try VNImageRequestHandler(cgImage: image, orientation: .up).perform([request])
        let cats = (request.results ?? []).compactMap { observation -> (CGRect, Float)? in
            guard let label = observation.labels.first(where: { $0.identifier == VNAnimalIdentifier.cat.rawValue }),
                  label.confidence >= catConfidence
            else { return nil }
            return (observation.boundingBox, label.confidence)
        }
        // Remove duplicate detector boxes before offering a tag for each cat.
        var kept: [CGRect] = []
        for (box, _) in cats.sorted(by: { $0.1 > $1.1 }) {
            if kept.contains(where: { other in
                let intersection = box.intersection(other)
                let overlap = intersection.isNull ? 0 : intersection.width * intersection.height
                let union = box.width * box.height + other.width * other.height - overlap
                return union > 0 && overlap / union > 0.8
            }) { continue }
            kept.append(box)
        }
        return kept
    }

    /// Simulator Vision can select an unavailable accelerator and fail internally.
    /// Keep the same request and model, assigning only CPU devices that Vision
    /// explicitly reports as supported for each stage. Physical devices retain
    /// Vision's normal hardware selection.
    private static func configureSimulatorCompute(_ request: VNRequest) throws {
        #if targetEnvironment(simulator)
        for (stage, devices) in try request.supportedComputeStageDevices {
            if let cpu = devices.first(where: { device in
                if case .cpu = device { return true }
                return false
            }) {
                request.setComputeDevice(cpu, for: stage)
            }
        }
        #endif
    }

    /// Vision's box is normalised with its origin bottom left. A margin keeps
    /// the ears and tail a tight box would cut.
    private static func pixelRect(of box: CGRect, in image: CGImage) -> CGRect {
        let width = CGFloat(image.width), height = CGFloat(image.height)
        let rect = CGRect(x: box.minX * width, y: (1 - box.maxY) * height, width: box.width * width, height: box.height * height)
        return rect.insetBy(dx: -rect.width * 0.1, dy: -rect.height * 0.1)
            .intersection(CGRect(x: 0, y: 0, width: width, height: height))
            .integral
    }

    /// The feature print as a unit vector, rounded so the photo's record stays small.
    private static func featurePrint(of image: CGImage) throws -> [Double] {
        let request = VNGenerateImageFeaturePrintRequest()
        request.revision = VNGenerateImageFeaturePrintRequestRevision2
        try configureSimulatorCompute(request)
        try VNImageRequestHandler(cgImage: image, orientation: .up).perform([request])
        guard let print = request.results?.first else {
            throw FoirError(message: "The cat in that photo couldn't be read.", code: nil)
        }
        let values: [Double] = print.data.withUnsafeBytes { bytes in
            switch print.elementType {
            case .float: bytes.bindMemory(to: Float.self).prefix(print.elementCount).map(Double.init)
            case .double: Array(bytes.bindMemory(to: Double.self).prefix(print.elementCount))
            default: []
            }
        }
        let length = values.reduce(0) { $0 + $1 * $1 }.squareRoot()
        guard length > 0 else { throw FoirError(message: "The cat in that photo couldn't be read.", code: nil) }
        return values.map { ($0 / length * 100_000).rounded() / 100_000 }
    }
}
