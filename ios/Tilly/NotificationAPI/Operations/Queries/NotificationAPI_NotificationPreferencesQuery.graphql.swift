// @generated
// This file was automatically generated and should not be edited.

@_exported import ApolloAPI
@_spi(Execution) @_spi(Unsafe) import ApolloAPI

extension NotificationAPI {
  nonisolated struct NotificationPreferencesQuery: GraphQLQuery {
    static let operationName: String = "NotificationPreferences"
    static let operationDocument: ApolloAPI.OperationDocument = .init(
      definition: .init(
        #"query NotificationPreferences { notificationPreferences { __typename category enabled channels } myNotificationSettings { __typename timeZone reminderHour artReady streakReminders communityUpdates } }"#
      ))

    public init() {}

    nonisolated struct Data: NotificationAPI.SelectionSet {
      let __data: DataDict
      init(_dataDict: DataDict) { __data = _dataDict }

      static var __parentType: any ApolloAPI.ParentType { NotificationAPI.Objects.Query }
      static var __selections: [ApolloAPI.Selection] { [
        .field("notificationPreferences", [NotificationPreference?].self),
        .field("myNotificationSettings", MyNotificationSettings?.self),
      ] }
      static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
        NotificationPreferencesQuery.Data.self
      ] }

      /// Get notification preferences for the authenticated user
      var notificationPreferences: [NotificationPreference?] { __data["notificationPreferences"] }
      /// The authenticated user's own Notification settings.
      var myNotificationSettings: MyNotificationSettings? { __data["myNotificationSettings"] }

      /// NotificationPreference
      ///
      /// Parent Type: `NotificationPreference`
      nonisolated struct NotificationPreference: NotificationAPI.SelectionSet {
        let __data: DataDict
        init(_dataDict: DataDict) { __data = _dataDict }

        static var __parentType: any ApolloAPI.ParentType { NotificationAPI.Objects.NotificationPreference }
        static var __selections: [ApolloAPI.Selection] { [
          .field("__typename", String.self),
          .field("category", String.self),
          .field("enabled", Bool.self),
          .field("channels", [String?]?.self),
        ] }
        static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
          NotificationPreferencesQuery.Data.NotificationPreference.self
        ] }

        var category: String { __data["category"] }
        var enabled: Bool { __data["enabled"] }
        var channels: [String?]? { __data["channels"] }
      }

      /// MyNotificationSettings
      ///
      /// Parent Type: `NotificationSettings`
      nonisolated struct MyNotificationSettings: NotificationAPI.SelectionSet {
        let __data: DataDict
        init(_dataDict: DataDict) { __data = _dataDict }

        static var __parentType: any ApolloAPI.ParentType { NotificationAPI.Objects.NotificationSettings }
        static var __selections: [ApolloAPI.Selection] { [
          .field("__typename", String.self),
          .field("timeZone", String?.self),
          .field("reminderHour", Int?.self),
          .field("artReady", Bool?.self),
          .field("streakReminders", Bool?.self),
          .field("communityUpdates", Bool?.self),
        ] }
        static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
          NotificationPreferencesQuery.Data.MyNotificationSettings.self
        ] }

        var timeZone: String? { __data["timeZone"] }
        var reminderHour: Int? { __data["reminderHour"] }
        var artReady: Bool? { __data["artReady"] }
        var streakReminders: Bool? { __data["streakReminders"] }
        var communityUpdates: Bool? { __data["communityUpdates"] }
      }
    }
  }

}