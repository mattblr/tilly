// @generated
// This file was automatically generated and should not be edited.

@_spi(Internal) @_spi(Unsafe) import ApolloAPI

extension ExecutionAPI {
  nonisolated struct TillySaveCatchInputCatsItemBounds: InputObject {
    private(set) var __data: InputDict

    init(_ data: InputDict) {
      __data = data
    }

    init(
      height: Double,
      width: Double,
      x: Double,
      y: Double
    ) {
      __data = InputDict([
        "height": height,
        "width": width,
        "x": x,
        "y": y
      ])
    }

    var height: Double {
      get { __data["height"] }
      set { __data["height"] = newValue }
    }

    var width: Double {
      get { __data["width"] }
      set { __data["width"] = newValue }
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