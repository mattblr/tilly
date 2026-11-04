// @generated
// This file was automatically generated and should not be edited.

import ApolloAPI

nonisolated protocol NotificationAPI_SelectionSet: ApolloAPI.SelectionSet & ApolloAPI.RootSelectionSet
where Schema == NotificationAPI.SchemaMetadata {}

nonisolated protocol NotificationAPI_InlineFragment: ApolloAPI.SelectionSet & ApolloAPI.InlineFragment
where Schema == NotificationAPI.SchemaMetadata {}

nonisolated protocol NotificationAPI_MutableSelectionSet: ApolloAPI.MutableRootSelectionSet
where Schema == NotificationAPI.SchemaMetadata {}

nonisolated protocol NotificationAPI_MutableInlineFragment: ApolloAPI.MutableSelectionSet & ApolloAPI.InlineFragment
where Schema == NotificationAPI.SchemaMetadata {}

extension NotificationAPI {
  typealias SelectionSet = NotificationAPI_SelectionSet

  typealias InlineFragment = NotificationAPI_InlineFragment

  typealias MutableSelectionSet = NotificationAPI_MutableSelectionSet

  typealias MutableInlineFragment = NotificationAPI_MutableInlineFragment

  nonisolated enum SchemaMetadata: ApolloAPI.SchemaMetadata {
    static let configuration: any ApolloAPI.SchemaConfiguration.Type = SchemaConfiguration.self

    private static let objectTypeMap: [String: ApolloAPI.Object] = [
      "ExecuteSaveNotificationSettingsPayload": NotificationAPI.Objects.ExecuteSaveNotificationSettingsPayload,
      "InboxNotification": NotificationAPI.Objects.InboxNotification,
      "InboxNotificationConnection": NotificationAPI.Objects.InboxNotificationConnection,
      "InboxNotificationEdge": NotificationAPI.Objects.InboxNotificationEdge,
      "Mutation": NotificationAPI.Objects.Mutation,
      "NotificationPreference": NotificationAPI.Objects.NotificationPreference,
      "NotificationSettings": NotificationAPI.Objects.NotificationSettings,
      "OperationExecution": NotificationAPI.Objects.OperationExecution,
      "PageInfo": NotificationAPI.Objects.PageInfo,
      "Query": NotificationAPI.Objects.Query,
      "SaveNotificationSettingsOutput": NotificationAPI.Objects.SaveNotificationSettingsOutput
    ]

    static func objectType(forTypename typename: String) -> ApolloAPI.Object? {
      objectTypeMap[typename]
    }
  }

  nonisolated enum Objects {}
  nonisolated enum Interfaces {}
  nonisolated enum Unions {}

}