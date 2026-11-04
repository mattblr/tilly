import SwiftUI

/// Correct associations on the same photo. The original upload, post and
/// capture date are never replaced, and a retry keeps the exact edit revision.
struct EditCaptureTags: View {
    let post: FeedPost
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    @State private var tags: [Tag] = []
    @State private var candidates: [TaggedCaptures.Cat] = []
    @State private var loaded = false
    @State private var working = false
    @State private var failure: String?
    @State private var attempt: [SelfieAPI.TillyUpdateCaptureTagsInputCatsItem]?
    @State private var revision = UUID().uuidString
    @State private var generation = 0
    private func t(_ key: String, _ values: [String: String] = [:]) -> String { model.config.t("capture-tags.\(key)", values) }

    struct Tag: Identifiable {
        let id: String
        var catId: String?
        var name: String
        let position: FoirAPI.JSON?
        let bounds: FoirAPI.JSON?
        let vector: [Double]?
        let vectorModel: String?

        var input: SelfieAPI.TillyUpdateCaptureTagsInputCatsItem {
            .init(bounds: bounds.flatMap { box in
                guard let x = box["x"]?.number, let y = box["y"]?.number, let width = box["width"]?.number, let height = box["height"]?.number else { return nil }
                return .some(.init(height: height, width: width, x: x, y: y))
            } ?? .none, catId: .maybe(catId), key: id,
            name: catId == nil ? .some(name.trimmingCharacters(in: .whitespacesAndNewlines)) : .none,
            position: position.flatMap { point in
                guard let x = point["x"]?.number, let y = point["y"]?.number else { return nil }
                return .some(.init(x: x, y: y))
            } ?? .none, vector: .maybe(vector), vectorModel: .maybe(vectorModel))
        }
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    CatPhoto(url: post.photo).frame(height: 240).clipShape(RoundedRectangle(cornerRadius: Theme.photoCorner))
                    if !loaded { ProgressView(t("loading")) }
                    ForEach(tags.indices, id: \.self) { index in
                        VStack(alignment: .leading, spacing: 10) {
                            HStack {
                                Text(t("row", ["number": String(index + 1)])).font(.sectionTitle)
                                Spacer()
                                Button(t("remove", ["number": String(index + 1)]), systemImage: "xmark") { tags.remove(at: index) }
                                    .labelStyle(.iconOnly).frame(minWidth: 44, minHeight: 44).disabled(tags.count == 1)
                            }
                            Picker(t("choose", ["number": String(index + 1)]), selection: Binding(get: { tags[index].catId ?? "new" }, set: { tags[index].catId = $0 == "new" ? nil : $0 })) {
                                Text(t("new")).tag("new")
                                ForEach(candidates) { cat in
                                    Text(cat.name).tag(cat.id).disabled(tags.enumerated().contains { $0.offset != index && $0.element.catId == cat.id })
                                }
                            }.pickerStyle(.menu)
                            if tags[index].catId == nil {
                                TextField(t("name"), text: $tags[index].name).textFieldStyle(.roundedBorder)
                                    .onChange(of: tags[index].name) { _, name in tags[index].name = String(name.prefix(60)) }
                            }
                        }.padding(16).background(Theme.raised, in: RoundedRectangle(cornerRadius: 12))
                    }
                    .disabled(working || attempt != nil)
                    if loaded {
                        Button(t("add"), systemImage: "plus") { tags.append(Tag(id: UUID().uuidString, name: "", position: nil, bounds: nil, vector: nil, vectorModel: nil)) }
                            .buttonStyle(.secondary).disabled(tags.count >= 8 || working || attempt != nil)
                        Button(t(working ? "saving" : attempt == nil ? "save" : "retry")) { Task { await save() } }
                            .buttonStyle(.primary).disabled(working || tags.isEmpty || tags.contains { $0.catId == nil && $0.name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty })
                    }
                    if let failure {
                        Text(model.config.failureText(failure)).font(.meta).foregroundStyle(.red)
                        if !loaded { Button(t("tryAgain")) { Task { await load() } } }
                    }
                }.padding(Theme.margin)
            }
            .background(Theme.background).navigationTitle(t("edit")).navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button(role: .close) { dismiss() }.disabled(working) } }
            .interactiveDismissDisabled(working)
            .task { await load() }
            .onDisappear { generation += 1 }
        }
    }

    private func load() async {
        guard !loaded, let expected = post.captureRevision, post.authorId == model.account?.userId else { return }
        let started = generation
        let identity = await model.foir.tokens.identity
        guard identity.userId == post.authorId, !Task.isCancelled else { return }
        failure = nil
        do {
            let records = try await Paging.all { after in
                let page = try await model.foir.fetch(FoirAPI.MyEditableCaptureTagsQuery(photo: .some(post.photoKey), revision: .some(expected), after: .maybe(after)), ifIdentity: identity).myCaptureCatTags
                return (page.edges.map(\.node), page.pageInfo.fragments.more)
            }
            guard !records.isEmpty else { throw FoirError(message: "This photo changed. Reopen it before editing.", code: nil) }
            let loadedTags: [Tag] = records.compactMap { tag -> Tag? in
                guard let key = tag.tagKey, let catId = tag.catKey else { return nil }
                return Tag(id: key, catId: catId, name: "", position: tag.position, bounds: tag.bounds, vector: tag.vector?.array?.compactMap(\.number), vectorModel: tag.vectorModel)
            }
            var cats = records.compactMap { $0.cat.map { TaggedCaptures.Cat(id: $0._id, name: $0.name ?? model.config.t("cat.unnamed")) } }
            if let coordinate = post.coordinate {
                let nearby = try await Sightings.fetch(around: coordinate, radius: CatchFlow.neighbourhood, foir: model.foir, copy: model.config)
                cats += nearby.map { TaggedCaptures.Cat(id: $0.catId, name: $0.name) }
            }
            var seen = Set<String>()
            let loadedCandidates = cats.filter { seen.insert($0.id).inserted }
            guard generation == started, !Task.isCancelled, model.account?.userId == post.authorId,
                  await model.foir.tokens.identity == identity else { return }
            tags = loadedTags
            candidates = loadedCandidates
            loaded = true
        } catch {
            if generation == started, !Task.isCancelled, model.account?.userId == post.authorId,
               await model.foir.tokens.identity == identity { failure = UserFailure.key(error) }
        }
    }

    private func save() async {
        guard !working, loaded, let expected = post.captureRevision, post.authorId == model.account?.userId else { return }
        let started = generation
        let identity = await model.foir.tokens.identity
        guard identity.userId == post.authorId, !Task.isCancelled else { return }
        working = true
        failure = nil
        defer { if generation == started { working = false } }
        do {
            attempt = attempt ?? tags.map(\.input)
            let input = SelfieAPI.TillyUpdateCaptureTagsInput(cats: attempt ?? [], expectedRevision: expected, photoKey: post.photoKey, revision: revision)
            let reply = try await model.foir.perform(SelfieAPI.EditCaptureTagsMutation(input: input, key: revision), ifIdentity: identity).executeUpdateCaptureTags
            if let error = reply?.result?.error ?? reply?.execution.error { throw FoirError(message: error, code: nil) }
            guard reply?.result?.ok == true else { throw FoirError(message: "The edit hasn’t finished. Retry to check it.", code: nil) }
            guard generation == started, !Task.isCancelled, model.account?.userId == post.authorId,
                  await model.foir.tokens.identity == identity else { return }
            model.caught()
            dismiss()
        } catch {
            if generation == started, !Task.isCancelled, model.account?.userId == post.authorId,
               await model.foir.tokens.identity == identity { failure = UserFailure.key(error) }
        }
    }
}
