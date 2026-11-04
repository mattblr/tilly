// @generated
// This file was automatically generated and should not be edited.

@_spi(Internal) @_spi(Unsafe) import ApolloAPI

extension SelfieAPI {
  nonisolated struct TillyUpdateCaptureTagsInput: InputObject {
    private(set) var __data: InputDict

    init(_ data: InputDict) {
      __data = data
    }

    init(
      cats: [TillyUpdateCaptureTagsInputCatsItem],
      expectedRevision: String,
      photoKey: String,
      revision: String
    ) {
      __data = InputDict([
        "cats": cats,
        "expectedRevision": expectedRevision,
        "photoKey": photoKey,
        "revision": revision
      ])
    }

    var cats: [TillyUpdateCaptureTagsInputCatsItem] {
      get { __data["cats"] }
      set { __data["cats"] = newValue }
    }

    var expectedRevision: String {
      get { __data["expectedRevision"] }
      set { __data["expectedRevision"] = newValue }
    }

    var photoKey: String {
      get { __data["photoKey"] }
      set { __data["photoKey"] = newValue }
    }

    var revision: String {
      get { __data["revision"] }
      set { __data["revision"] = newValue }
    }
  }

}