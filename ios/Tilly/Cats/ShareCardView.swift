import PhosphorSwift
import SwiftUI

/// A cat, a moment, a story worth passing on: a portrait card of one cat that
/// goes out through the share sheet as an image. It carries the neighbourhood,
/// never the spot, and only the user's own words.
struct ShareCardView: View {
    @Environment(AppModel.self) private var model
    struct Story {
        enum Photo {
            case local(UIImage)
            case remote(URL?)
        }

        let catName: String
        let photo: Photo
        let quote: String
        let area: String?
    }

    let story: Story

    @Environment(\.displayScale) private var displayScale
    @State private var photo: UIImage?
    @State private var card: UIImage?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                ScreenTitle(title: model.config.t("share-card.title"))

                ShareCard(story: story, photo: photo)
                    .padding(.top, 12)

                Text(model.config.t("share-card.subtitle"))
                    .font(.meta)
                    .foregroundStyle(Theme.muted)
                    .padding(.top, 14)

                if let card {
                    ShareLink(
                        item: Image(uiImage: card),
                        preview: SharePreview(model.config.t("share-card.preview", ["name": story.catName]), image: Image(uiImage: card))
                    ) {
                        Label { Text(model.config.t("share-card.share")) } icon: { Icon(icon: .export) }
                    }
                    .buttonStyle(.primary)
                    .padding(.top, 10)
                } else {
                    Button {} label: { Label { Text(model.config.t("share-card.share")) } icon: { Icon(icon: .export) } }
                        .buttonStyle(.primary)
                        .disabled(true)
                        .padding(.top, 10)
                }

            }
            .padding(.horizontal, Theme.margin)
            .padding(.bottom, 24)
        }
        .background(Theme.background)
        .navigationTitle(model.config.t("common.share"))
        .navigationBarTitleDisplayMode(.inline)
        .toolbar(removing: .title)
        .task { await prepare() }
    }

    private func prepare() async {
        switch story.photo {
        case .local(let image): photo = image
        case .remote(let url): photo = await PhotoLoader.image(at: url)
        }
        let renderer = ImageRenderer(content: ShareCard(story: story, photo: photo).frame(width: 360).padding(18).background(Theme.background).environment(model))
        renderer.scale = max(displayScale, 3)
        card = renderer.uiImage
    }
}

/// The card itself, drawn the same on screen and in the shared image.
struct ShareCard: View {
    @Environment(AppModel.self) private var model
    let story: ShareCardView.Story
    let photo: UIImage?

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Group {
                if let photo {
                    Image(uiImage: photo).resizable().scaledToFill()
                } else {
                    Theme.raised
                }
            }
            .frame(maxWidth: .infinity)
            .frame(height: 230)
            .clipped()

            VStack(alignment: .leading, spacing: 0) {
                Text(story.catName).font(.system(size: 26, weight: .semibold)).kerning(-0.5)
                Text("“\(story.quote)”").font(.system(size: 17)).padding(.top, 10)
                Rectangle().fill(Theme.rule).frame(height: 1).padding(.top, 18)
                HStack(alignment: .bottom) {
                    Text(story.area.map { model.config.t("share-card.area", ["area": $0]) } ?? model.config.t("share-card.neighbourhood"))
                        .font(.meta)
                        .foregroundStyle(Theme.muted)
                    Spacer()
                    Wordmark(size: 24)
                }
                .padding(.top, 12)
            }
            .padding(20)
        }
        .foregroundStyle(Theme.ink)
        .background(Theme.raised)
        .clipShape(RoundedRectangle(cornerRadius: 14))
        .overlay(RoundedRectangle(cornerRadius: 14).stroke(Theme.rule, lineWidth: 1))
    }
}
