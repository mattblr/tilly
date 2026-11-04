// @generated
// This file was automatically generated and should not be edited.

@_spi(Internal) @_spi(Unsafe) import ApolloAPI

extension FoirAPI {
  nonisolated struct LikeCaptureInput: InputObject {
    private(set) var __data: InputDict

    init(_ data: InputDict) {
      __data = data
    }

    init(
      liked: Bool,
      photoKey: String
    ) {
      __data = InputDict([
        "liked": liked,
        "photoKey": photoKey
      ])
    }

    var liked: Bool {
      get { __data["liked"] }
      set { __data["liked"] = newValue }
    }

    var photoKey: String {
      get { __data["photoKey"] }
      set { __data["photoKey"] = newValue }
    }
  }

}