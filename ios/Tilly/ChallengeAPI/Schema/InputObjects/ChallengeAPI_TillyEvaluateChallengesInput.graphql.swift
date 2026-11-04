// @generated
// This file was automatically generated and should not be edited.

@_spi(Internal) @_spi(Unsafe) import ApolloAPI

extension ChallengeAPI {
  nonisolated struct TillyEvaluateChallengesInput: InputObject {
    private(set) var __data: InputDict

    init(_ data: InputDict) {
      __data = data
    }

    init(
      captureId: String,
      retry: GraphQLNullable<Bool> = nil,
      revision: String
    ) {
      __data = InputDict([
        "captureId": captureId,
        "retry": retry,
        "revision": revision
      ])
    }

    var captureId: String {
      get { __data["captureId"] }
      set { __data["captureId"] = newValue }
    }

    var retry: GraphQLNullable<Bool> {
      get { __data["retry"] }
      set { __data["retry"] = newValue }
    }

    var revision: String {
      get { __data["revision"] }
      set { __data["revision"] = newValue }
    }
  }

}