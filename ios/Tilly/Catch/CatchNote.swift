import SwiftUI

/// "What did you notice?" on the reveal: a few tags and a line for the catch
/// just saved, added to the cat's story when the catch is finished. The tags
/// are Fóir's note-tag records, so they're changed in the console, not here.
struct CatchNoteSection: View {
    @Bindable var flow: CatchFlow
    @Environment(AppModel.self) private var model

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text(model.config.t("observe.prompt")).font(.sectionTitle)
            if let tags = flow.noteTags {
                FlowTags(tags: tags, chosen: $flow.noteChosen).padding(.vertical, 15)
            } else {
                RoaringCat(size: 44).frame(maxWidth: .infinity).padding(.vertical, 15)
            }
            Text(model.config.t("observe.noteLabel")).font(.meta).padding(.bottom, 7)
            TextField(model.config.t("observe.notePlaceholder"),
                      text: Binding(get: { flow.noteText }, set: { flow.noteText = String($0.prefix(CatchFlow.noteLimit)) }),
                      axis: .vertical)
                .lineLimit(3...6)
                .padding(12)
                .background(Theme.raised, in: RoundedRectangle(cornerRadius: 10))
                .overlay(RoundedRectangle(cornerRadius: 10).stroke(Theme.rule, lineWidth: 1))
            Text("\(flow.noteText.count)/\(CatchFlow.noteLimit)").font(.system(size: 12)).foregroundStyle(Theme.muted).padding(.top, 4)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .disabled(flow.noteSaved)
        .task { await flow.loadNoteTags() }
    }
}

/// Tags that wrap onto the next line, each one toggled on and off.
struct FlowTags: View {
    let tags: [String]
    @Binding var chosen: Set<String>

    var body: some View {
        WrappingStack(spacing: 8) {
            ForEach(tags, id: \.self) { tag in
                let on = chosen.contains(tag)
                Button {
                    if on { chosen.remove(tag) } else { chosen.insert(tag) }
                } label: {
                    Text(tag)
                        .font(.body15)
                        .padding(.horizontal, 13)
                        .frame(minHeight: 44)
                        .background(on ? Theme.raised : .clear, in: Capsule())
                        .overlay(Capsule().stroke(on ? Theme.ink : Theme.rule, lineWidth: 1))
                }
                .buttonStyle(.plain)
                .accessibilityAddTraits(on ? .isSelected : [])
                .sensoryFeedback(.selection, trigger: on)
            }
        }
    }
}

/// Views in a row that carries on onto the next line when it's full.
struct WrappingStack: Layout {
    var spacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let rows = rows(in: proposal.width ?? .infinity, subviews)
        let height = rows.map(\.height).reduce(0, +) + spacing * CGFloat(max(rows.count - 1, 0))
        return CGSize(width: proposal.width ?? rows.map(\.width).max() ?? 0, height: height)
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        var y = bounds.minY
        for row in rows(in: bounds.width, subviews) {
            var x = bounds.minX
            for index in row.items {
                let size = subviews[index].sizeThatFits(.unspecified)
                subviews[index].place(at: CGPoint(x: x, y: y), proposal: ProposedViewSize(size))
                x += size.width + spacing
            }
            y += row.height + spacing
        }
    }

    private struct Row {
        var items: [Int] = []
        var width: CGFloat = 0
        var height: CGFloat = 0
    }

    private func rows(in width: CGFloat, _ subviews: Subviews) -> [Row] {
        var rows = [Row()]
        for index in subviews.indices {
            let size = subviews[index].sizeThatFits(.unspecified)
            if !rows[rows.count - 1].items.isEmpty, rows[rows.count - 1].width + spacing + size.width > width {
                rows.append(Row())
            }
            let gap = rows[rows.count - 1].items.isEmpty ? 0 : spacing
            rows[rows.count - 1].items.append(index)
            rows[rows.count - 1].width += gap + size.width
            rows[rows.count - 1].height = max(rows[rows.count - 1].height, size.height)
        }
        return rows
    }
}
