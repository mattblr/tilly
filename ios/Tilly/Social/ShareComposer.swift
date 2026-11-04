import SwiftUI

/// Resharing someone's public capture with a comment. The reshare is seen by
/// whoever sees the user's catches, by their profile's Public or Private
/// setting; the original stays in front. A user's own catches need no
/// sharing: each is posted when it's saved.
struct ShareComposer: View {
    enum Subject {
        /// Another user's public post.
        case reshare(FeedPost)
    }

    let subject: Subject

    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    @State private var text = ""
    @State private var working = false
    @State private var failure: String?
    @State private var photo: UIImage?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                Group {
                    if let photo {
                        Image(uiImage: photo).resizable().scaledToFill()
                    } else {
                        Theme.raised
                    }
                }
                .frame(maxWidth: .infinity)
                .frame(height: 260)
                .clipShape(RoundedRectangle(cornerRadius: Theme.photoCorner))
                .padding(.top, 12)

                Text(attribution).font(.meta).foregroundStyle(Theme.muted).padding(.top, 8)

                Text(isReshare ? model.config.t("social.comment") : model.config.t("social.postNote")).font(.meta).padding(.top, 18).padding(.bottom, 7)
                TextField(isReshare ? model.config.t("social.commentPlaceholder") : model.config.t("social.notePlaceholder"), text: $text, axis: .vertical)
                    .lineLimit(3...6)
                    .padding(12)
                    .background(Theme.raised, in: RoundedRectangle(cornerRadius: 10))
                    .overlay(RoundedRectangle(cornerRadius: 10).stroke(Theme.rule, lineWidth: 1))
                Text("\(text.count)/280").font(.system(size: 12)).foregroundStyle(text.count > 280 ? .red : Theme.muted).padding(.top, 4)

                Text(model.config.t(model.circle.mine?.isPrivate == true ? "social.seenBy.private" : "social.seenBy.public"))
                    .font(.meta)
                    .foregroundStyle(Theme.muted)
                    .padding(.top, 14)

                Button(isReshare ? model.config.t("social.repost") : model.config.t("social.shareInApp")) { share() }
                    .buttonStyle(.primary)
                    .disabled(working || text.count > 280)
                    .padding(.top, 20)
                if let failure {
                    Text(model.config.failureText(failure)).font(.meta).foregroundStyle(.red).padding(.top, 10)
                }
            }
            .padding(.horizontal, Theme.margin)
            .padding(.bottom, 24)
        }
        .background(Theme.background)
        .navigationTitle(isReshare ? model.config.t("social.repost") : model.config.t("common.share"))
        .navigationBarTitleDisplayMode(.inline)
        .task { await loadPhoto() }
    }

    private var isReshare: Bool { true }

    private var attribution: String {
        switch subject {
        case .reshare(let post): model.config.t("social.captureAttribution", ["name": model.circle.name(of: post.authorId), "cat": post.catName])
        }
    }

    private func loadPhoto() async {
        switch subject {
        case .reshare(let post): photo = await PhotoLoader.image(at: post.photo)
        }
    }

    private func share() {
        working = true
        failure = nil
        let words = text.trimmingCharacters(in: .whitespacesAndNewlines)
        Task {
            do {
                switch subject {
                case .reshare(let post):
                    try await model.foir.share(reshareOf: post.originalId, comment: words)
                }
                dismiss()
            } catch {
                failure = UserFailure.key(error)
            }
            working = false
        }
    }
}
