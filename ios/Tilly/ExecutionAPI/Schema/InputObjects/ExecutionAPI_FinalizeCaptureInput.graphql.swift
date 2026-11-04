// @generated
// This file was automatically generated and should not be edited.

@_spi(Internal) @_spi(Unsafe) import ApolloAPI

extension ExecutionAPI {
  nonisolated struct FinalizeCaptureInput: InputObject {
    private(set) var __data: InputDict

    init(_ data: InputDict) {
      __data = data
    }

    init(
      captureId: String,
      timeZone: String
    ) {
      __data = InputDict([
        "captureId": captureId,
        "timeZone": timeZone
      ])
    }

    var captureId: String {
      get { __data["captureId"] }
      set { __data["captureId"] = newValue }
    }

    var timeZone: String {
      get { __data["timeZone"] }
      set { __data["timeZone"] = newValue }
    }
  }

}