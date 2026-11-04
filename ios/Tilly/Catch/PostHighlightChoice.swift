import SwiftUI

struct PostHighlightBadges: View {
    let catalog: [PostHighlight]
    let selected: Set<String>
    var body: some View {
        ViewThatFits(in: .horizontal) {
            HStack(spacing: 6) { badges }
            VStack(alignment: .leading, spacing: 6) { badges }
        }
    }
    private var badges: some View {
        ForEach(catalog.filter { selected.contains($0.id) }) { entry in
            Label(entry.title, systemImage: entry.icon.systemName)
                .font(.caption).foregroundStyle(Theme.muted)
                .padding(.horizontal, 8).padding(.vertical, 4)
                .background(Theme.raised, in: Capsule())
        }
    }
}
