// @generated
// This file was automatically generated and should not be edited.

@_spi(Internal) @_spi(Unsafe) import ApolloAPI

extension ExecutionAPI {
  nonisolated struct TillySaveCatchInputCatsItemPosition: InputObject {
    private(set) var __data: InputDict

    init(_ data: InputDict) {
      __data = data
    }

    init(
      x: Double,
      y: Double
    ) {
      __data = InputDict([
        "x": x,
        "y": y
      ])
    }

    var x: Double {
      get { __data["x"] }
      set { __data["x"] = newValue }
    }

    var y: Double {
      get { __data["y"] }
      set { __data["y"] = newValue }
    }
  }

}