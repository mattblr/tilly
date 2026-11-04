// @generated
// This file was automatically generated and should not be edited.

@_spi(Internal) @_spi(Unsafe) import ApolloAPI

extension SafetyAPI {
  nonisolated struct SetUserBlockInput: InputObject {
    private(set) var __data: InputDict

    init(_ data: InputDict) {
      __data = data
    }

    init(
      blocked: Bool,
      userId: String
    ) {
      __data = InputDict([
        "blocked": blocked,
        "userId": userId
      ])
    }

    var blocked: Bool {
      get { __data["blocked"] }
      set { __data["blocked"] = newValue }
    }

    var userId: String {
      get { __data["userId"] }
      set { __data["userId"] = newValue }
    }
  }

}