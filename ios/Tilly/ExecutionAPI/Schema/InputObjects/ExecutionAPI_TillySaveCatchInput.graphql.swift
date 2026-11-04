// @generated
// This file was automatically generated and should not be edited.

@_spi(Internal) @_spi(Unsafe) import ApolloAPI

extension ExecutionAPI {
  nonisolated struct TillySaveCatchInput: InputObject {
    private(set) var __data: InputDict

    init(_ data: InputDict) {
      __data = data
    }

    init(
      captureKey: String,
      cats: [TillySaveCatchInputCatsItem],
      lat: Double,
      lng: Double,
      photoFileId: String
    ) {
      __data = InputDict([
        "captureKey": captureKey,
        "cats": cats,
        "lat": lat,
        "lng": lng,
        "photoFileId": photoFileId
      ])
    }

    var captureKey: String {
      get { __data["captureKey"] }
      set { __data["captureKey"] = newValue }
    }

    var cats: [TillySaveCatchInputCatsItem] {
      get { __data["cats"] }
      set { __data["cats"] = newValue }
    }

    var lat: Double {
      get { __data["lat"] }
      set { __data["lat"] = newValue }
    }

    var lng: Double {
      get { __data["lng"] }
      set { __data["lng"] = newValue }
    }

    var photoFileId: String {
      get { __data["photoFileId"] }
      set { __data["photoFileId"] = newValue }
    }
  }

}