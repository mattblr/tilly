import Foundation

/// Identity v1, shared with web/avatar-identity.ts. ASCII whitespace is trimmed,
/// ASCII capitals lowercased, and remaining UTF-8 bytes kept unchanged.
/// Trait salts are independent; never use email or Swift's randomized Hasher.
struct AvatarIdentity {
    let ears: Int
    let head: Int
    let marking: Int
    let eyes: Int

    init(seed: String) {
        var bytes = Array(seed.utf8)
        let spaces: Set<UInt8> = [9, 10, 13, 32]
        while let first = bytes.first, spaces.contains(first) { bytes.removeFirst() }
        while let last = bytes.last, spaces.contains(last) { bytes.removeLast() }
        bytes = bytes.map { (65...90).contains($0) ? $0 + 32 : $0 }
        func trait(_ name: String, _ count: UInt32) -> Int {
            var hash: UInt32 = 2_166_136_261
            for byte in Array("tilly-avatar-v1|".utf8) + bytes + Array("|\(name)".utf8) {
                hash = (hash ^ UInt32(byte)) &* 16_777_619
            }
            return Int(hash % count)
        }
        ears = trait("ears", 3)
        head = trait("head", 3)
        marking = trait("marking", 4)
        eyes = trait("eyes", 3)
    }
}
