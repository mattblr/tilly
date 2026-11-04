// @generated
// This file was automatically generated and should not be edited.

@_spi(Internal) @_spi(Unsafe) import ApolloAPI

extension NotificationAPI {
  /// Input for updating a notification preference
  nonisolated struct UpdateNotificationPreferenceInput: InputObject {
    private(set) var __data: InputDict

    init(_ data: InputDict) {
      __data = data
    }

    init(
      category: GraphQLEnum<NotificationCategory>,
      channel: String,
      enabled: Bool
    ) {
      __data = InputDict([
        "category": category,
        "channel": channel,
        "enabled": enabled
      ])
    }

    var category: GraphQLEnum<NotificationCategory> {
      get { __data["category"] }
      set { __data["category"] = newValue }
    }

    var channel: String {
      get { __data["channel"] }
      set { __data["channel"] = newValue }
    }

    var enabled: Bool {
      get { __data["enabled"] }
      set { __data["enabled"] = newValue }
    }
  }

}