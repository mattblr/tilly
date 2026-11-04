// @generated
// This file was automatically generated and should not be edited.

@_spi(Internal) @_spi(Unsafe) import ApolloAPI

extension FoirAPI {
  nonisolated struct ProfileCountsInput: InputObject {
    private(set) var __data: InputDict

    init(_ data: InputDict) {
      __data = data
    }

    init(
      userId: String
    ) {
      __data = InputDict([
        "userId": userId
      ])
    }

    var userId: String {
      get { __data["userId"] }
      set { __data["userId"] = newValue }
    }
  }

}