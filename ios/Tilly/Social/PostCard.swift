import SwiftUI

/// Where a post's taps lead.
enum PostRoute: Hashable {
    case cat(String)
    case person(String)
    case reshare(FeedPost)
}

/// A shared capture: who caught which cat and when, the photo, the cat's heart,
/// and a reshare's comment floating on the photo it reshares.
struct PostCard: View {
    let post: FeedPost
    let route: (PostRoute) -> Void

    @Environment(AppModel.self) private var model
    @State private var area: String?
    @State private var editingTags = false

    var body: some View {
        if model.circle.allows(post.authorId, repostedBy: post.resharerId) {
        VStack(alignment: .leading, spacing: 0) {
            Button { route(.person(post.authorId)) } label: {
                HStack(spacing: 10) {
                    Avatar(profile: model.circle.profiles[post.authorId], fallbackSeed: post.authorId, size: 35)
                    VStack(alignment: .leading, spacing: 1) {
                        Text(model.circle.name(of: post.authorId)).font(.body15.weight(.semibold))
                        Text(Recency.long(since: post.caughtAt, copy: model.config))
                            .font(.meta)
                            .foregroundStyle(Theme.muted)
                    }
                    Spacer()
                }
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .padding(.vertical, 12)

            ArtFlip(photoKey: post.photoKey, catcherId: post.authorId) {
                Color.clear
                    .frame(height: 300)
                    .overlay { CatPhoto(url: post.photo) }
                    .clipShape(RoundedRectangle(cornerRadius: Theme.photoCorner))
                    .contentShape(Rectangle())
                    .onTapGesture { route(.cat(post.catId)) }
                    .accessibilityAddTraits(.isButton)
                    .accessibilityLabel(model.config.t("social.openCat", ["name": post.catName]))
            }
            .overlay(alignment: .bottomLeading) { reshareBubble }

            if let catalog = post.highlightCatalog {
                PostHighlightBadges(catalog: catalog, selected: post.highlightKeys).padding(.top, 8)
            }
            if post.cats.isEmpty {
                Button { route(.cat(post.catId)) } label: {
                    Text(post.catName).font(.body15.weight(.semibold))
                        .frame(maxWidth: .infinity, alignment: .leading).frame(minHeight: 44)
                }.buttonStyle(.plain).accessibilityLabel(model.config.t("social.openCat", ["name": post.catName]))
            } else {
                ViewThatFits(in: .horizontal) {
                    HStack(spacing: 14) { catLinks }
                    VStack(alignment: .leading, spacing: 4) { catLinks }
                }
            }

            HStack(spacing: 16) {
                LikeButton(photoKey: post.photoKey, catId: post.catId, catName: post.catName)
                if post.isPublic {
                    Button { route(.reshare(post)) } label: {
                        HStack(spacing: 6) { Icon(icon: .repeat, size: 18); Text(model.config.t("social.repost")).font(.meta) }
                    }
                    .buttonStyle(.plain)
                    .frame(minHeight: 44)
                }
                if post.authorId == model.account?.userId, post.resharerId == nil, post.captureRevision != nil {
                    Button(model.config.t("social.editCats"), systemImage: "tag") { editingTags = true }
                        .labelStyle(.iconOnly).frame(minWidth: 44, minHeight: 44)
                }
                Spacer()
                ContentSafetyMenu(targetType: "post", targetId: post.id, ownerId: post.resharerId ?? post.authorId)
            }
            .padding(.top, 7)

            if let note = post.note, !note.isEmpty {
                Text(note).font(.body15)
                    .padding(.top, 4)
            }
            Text(model.config.t("feed.post.seenAround", ["area": area ?? "here"]))
                .font(.meta)
                .foregroundStyle(Theme.muted)
                .padding(.top, 6)
        }
        .sheet(isPresented: $editingTags) { EditCaptureTags(post: post) }
        .padding(.bottom, 14)
        .task(id: post.id) {
            if let coordinate = post.coordinate { area = await AreaNames.name(of: coordinate) }
        }
        }
    }

    /// Who reshared this capture, floating on its lower corner, with the
    /// latest comment beside them. The capture's own catcher stays in the header.
    @ViewBuilder
    private var catLinks: some View {
        ForEach(post.cats) { cat in
            Button { route(.cat(cat.id)) } label: {
                Text(cat.name).font(.body15.weight(.semibold)).frame(minHeight: 44)
            }.buttonStyle(.plain).accessibilityLabel(model.config.t("social.openCat", ["name": cat.name]))
        }
    }

    @ViewBuilder
    private var reshareBubble: some View {
        let reshares = model.reshares.on(post.photoKey).filter { model.circle.allows($0.userId) }
        if let latest = reshares.first {
            HStack(alignment: .bottom, spacing: 6) {
                Button { route(.person(latest.userId)) } label: {
                    ZStack(alignment: .bottomLeading) {
                        ForEach(Array(reshares.prefix(3).enumerated().reversed()), id: \.element.postId) { index, reshare in
                            Avatar(profile: model.circle.profiles[reshare.userId], fallbackSeed: reshare.userId, size: 32)
                                .overlay(Circle().stroke(.white, lineWidth: 2))
                                .offset(x: CGFloat(index) * 14)
                        }
                    }
                    .padding(.trailing, CGFloat(min(reshares.count, 3) - 1) * 14)
                }
                .buttonStyle(.plain)
                .accessibilityLabel(model.config.t(reshares.count == 1 ? "social.reshareLabel.one" : "social.reshareLabel.other", ["name": model.circle.name(of: latest.userId), "count": String(reshares.count - 1)]))
                let said = reshares.first { !($0.comment ?? "").isEmpty }
                VStack(alignment: .leading, spacing: 2) {
                    Text(model.circle.name(of: (said ?? latest).userId)).font(.system(size: 12, weight: .semibold))
                    if let comment = said?.comment {
                        Text(comment.count > 115 ? comment.prefix(112) + "…" : comment).font(.meta)
                    } else {
                        Text(model.config.t("social.reshared")).font(.meta)
                    }
                }
                .foregroundStyle(Theme.ink)
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .background(Theme.raised, in: RoundedRectangle(cornerRadius: 14))
            }
            .padding(10)
        }
    }
}

/// A user's photo in a circle, or their initial until they've set one.
struct Avatar: View {
    var initial: String = "?"
    var seed: String = "unknown"
    var photo: URL?
    /// A photo just picked, before it's uploaded.
    var picked: UIImage?
    var size: CGFloat = 35

    init(initial: String = "?", seed: String = "unknown", photo: URL? = nil, picked: UIImage? = nil, size: CGFloat = 35) {
        self.initial = initial
        self.seed = seed
        self.photo = photo
        self.picked = picked
        self.size = size
    }

    init(profile: Profile?, fallbackSeed: String = "unknown", size: CGFloat = 35) {
        self.init(initial: profile?.initial ?? "?", seed: profile?.userId ?? fallbackSeed, photo: profile?.photo, size: size)
    }

    var body: some View {
        Group {
            if let picked {
                Image(uiImage: picked).resizable().scaledToFill()
            } else if photo != nil {
                CatPhoto(url: photo)
            } else {
                TillyAvatar(seed: seed, greeting: size >= 64)
            }
        }
        .frame(width: size, height: size)
        .clipShape(Circle())
        .accessibilityHidden(true)
    }
}

/// The heart likes one capture, and shows that capture's likes. A cat's own
/// likes are its captures' added up.
struct LikeButton: View {
    let photoKey: String
    let catId: String
    let catName: String

    @Environment(AppModel.self) private var model

    var body: some View {
        let liked = model.likes.likes(capture: photoKey)
        let count = model.likes.count(capture: photoKey)
        Button {
            guard model.account != nil else {
                model.signInReason = model.config.t("social.likeSignIn")
                return
            }
            Task { await model.likes.toggle(capture: photoKey, cat: catId) }
        } label: {
            HStack(spacing: 6) {
                (liked ? Ph.heart.fill : Ph.heart.regular)
                    .frame(width: 19, height: 19)
                    .foregroundStyle(liked ? Theme.signal : Theme.ink)
                    .phaseAnimator([1, 1.3, 1], trigger: liked) { heart, scale in
                        heart.scaleEffect(liked ? scale : 1)
                    } animation: { _ in .snappy(duration: 0.18) }
                Text(model.config.t("social.likes", count: count)).font(.meta)
            }
            .frame(minHeight: 44)
        }
        .buttonStyle(.plain)
        .sensoryFeedback(.impact(weight: .light), trigger: liked)
        .accessibilityLabel(model.config.t(liked ? "social.unlikeCat" : "social.likeCat", ["name": catName]))
        .accessibilityAddTraits(liked ? .isSelected : [])
    }
}
