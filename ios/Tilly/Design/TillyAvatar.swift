import SwiftUI

/// Original neighbourhood-cat geometry, shared with the web component. Photos
/// remain the user's choice; this is a local default, never an image-model call.
struct TillyAvatar: View {
    let seed: String
    var motion = true
    var greeting = false
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.scenePhase) private var scenePhase
    @State private var hovering = false
    @State private var earAngle = 0.0
    @State private var eyeScale = 1.0
    private let cream = Color(red: 245 / 255, green: 245 / 255, blue: 242 / 255)

    var body: some View {
        let traits = AvatarIdentity(seed: seed)
        GeometryReader { frame in
            ZStack {
                Circle().fill(Theme.brand)
                if let geometry = AvatarGeometry.shared {
                    ZStack {
                        AvatarPath(commands: geometry.leftEars[traits.ears]).fill(cream)
                        AvatarPath(commands: geometry.leftInnerEars[traits.ears]).fill(Theme.brand)
                            .mask(AvatarPath(commands: geometry.leftEars[traits.ears]))
                    }
                    .rotationEffect(.degrees(earAngle), anchor: UnitPoint(x: 30 / 96, y: 36 / 96))
                    ZStack {
                        AvatarPath(commands: geometry.rightEar).fill(cream)
                        AvatarPath(commands: geometry.rightInnerEar).fill(Theme.brand)
                            .mask(AvatarPath(commands: geometry.rightEar))
                    }
                    AvatarPath(commands: geometry.heads[traits.head]).fill(cream)
                    AvatarPath(commands: geometry.markings[traits.marking]).fill(Theme.brand.opacity(0.23))
                    AvatarPath(commands: geometry.eyes[traits.eyes])
                        .stroke(Theme.brand, style: StrokeStyle(lineWidth: frame.size.width * 3.5 / 96, lineCap: .round, lineJoin: .round))
                        .scaleEffect(x: 1, y: eyeScale, anchor: .center)
                    AvatarPath(commands: geometry.mouth)
                        .stroke(Theme.brand, style: StrokeStyle(lineWidth: frame.size.width * 3.5 / 96, lineCap: .round, lineJoin: .round))
                    AvatarPath(commands: geometry.nose).fill(Theme.brand)
                }
            }
        }
        .aspectRatio(1, contentMode: .fit)
        .clipShape(Circle())
        .accessibilityHidden(true)
        .onHover { hovering = $0 }
        .task(id: MotionIdentity(seed: seed, options: [motion, reduceMotion, scenePhase == .active, greeting, hovering])) {
            guard motion && !reduceMotion && scenePhase == .active else { earAngle = 0; eyeScale = 1; return }
            let phase = Double(AvatarIdentity(seed: seed).eyes) * 0.7 + Double(AvatarIdentity(seed: seed).ears) * 0.3
            do {
                while !Task.isCancelled {
                    withAnimation(.easeInOut(duration: 0.18)) { earAngle = greeting || hovering ? -13 : -9 }
                    try await Task.sleep(for: .milliseconds(180))
                    withAnimation(.easeOut(duration: 0.3)) { earAngle = 0 }
                    try await Task.sleep(for: .seconds(1.5 + phase))
                    withAnimation(.easeIn(duration: 0.08)) { eyeScale = 0.12 }
                    try await Task.sleep(for: .milliseconds(90))
                    withAnimation(.easeOut(duration: 0.1)) { eyeScale = 1 }
                    try await Task.sleep(for: .seconds(11))
                }
            } catch { earAngle = 0; eyeScale = 1 }
        }
        .onDisappear { earAngle = 0; eyeScale = 1 }
    }

    private struct MotionIdentity: Equatable {
        let seed: String
        let options: [Bool]
    }
}

private struct AvatarGeometry: Decodable {
    let leftEars: [[[Double]]]
    let rightEar: [[Double]]
    let leftInnerEars: [[[Double]]]
    let rightInnerEar: [[Double]]
    let heads: [[[Double]]]
    let markings: [[[Double]]]
    let eyes: [[[Double]]]
    let nose: [[Double]]
    let mouth: [[Double]]
    static let shared: AvatarGeometry? = {
        guard let url = Bundle.main.url(forResource: "AvatarGeometry", withExtension: "json"),
              let data = try? Data(contentsOf: url) else { return nil }
        return try? JSONDecoder().decode(AvatarGeometry.self, from: data)
    }()
}

/// The shared geometry uses only move, line, quadratic, cubic and close commands.
private struct AvatarPath: Shape {
    let commands: [[Double]]
    func path(in rect: CGRect) -> Path {
        var path = Path()
        for command in commands {
            guard let kind = command.first else { continue }
            func point(_ index: Int) -> CGPoint { CGPoint(x: command[index], y: command[index + 1]) }
            switch Int(kind) {
            case 0 where command.count == 3: path.move(to: point(1))
            case 1 where command.count == 3: path.addLine(to: point(1))
            case 2 where command.count == 5: path.addQuadCurve(to: point(3), control: point(1))
            case 3 where command.count == 7: path.addCurve(to: point(5), control1: point(1), control2: point(3))
            case 4: path.closeSubpath()
            default: continue
            }
        }
        return path.applying(CGAffineTransform(scaleX: rect.width / 96, y: rect.height / 96))
    }
}
