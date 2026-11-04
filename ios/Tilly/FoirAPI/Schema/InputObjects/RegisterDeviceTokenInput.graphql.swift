// @generated
// This file was automatically generated and should not be edited.

@_spi(Internal) @_spi(Unsafe) import ApolloAPI

extension FoirAPI {
  /// Input for registering a device for push notifications
  nonisolated struct RegisterDeviceTokenInput: InputObject {
    private(set) var __data: InputDict

    init(_ data: InputDict) {
      __data = data
    }

    init(
      deviceName: GraphQLNullable<String> = nil,
      platform: GraphQLEnum<PushPlatform>,
      token: String
    ) {
      __data = InputDict([
        "deviceName": deviceName,
        "platform": platform,
        "token": token
      ])
    }

    var deviceName: GraphQLNullable<String> {
      get { __data["deviceName"] }
      set { __data["deviceName"] = newValue }
    }

    var platform: GraphQLEnum<PushPlatform> {
      get { __data["platform"] }
      set { __data["platform"] = newValue }
    }

    var token: String {
      get { __data["token"] }
      set { __data["token"] = newValue }
    }
  }

}