// @generated
// This file was automatically generated and should not be edited.

@_spi(Internal) @_spi(Unsafe) import ApolloAPI

extension FoirAPI {
  nonisolated struct FollowCatInput: InputObject {
    private(set) var __data: InputDict

    init(_ data: InputDict) {
      __data = data
    }

    init(
      catId: String,
      following: Bool
    ) {
      __data = InputDict([
        "catId": catId,
        "following": following
      ])
    }

    var catId: String {
      get { __data["catId"] }
      set { __data["catId"] = newValue }
    }

    var following: Bool {
      get { __data["following"] }
      set { __data["following"] = newValue }
    }
  }

}