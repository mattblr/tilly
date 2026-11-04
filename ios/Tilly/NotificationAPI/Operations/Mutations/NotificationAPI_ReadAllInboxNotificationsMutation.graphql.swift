// @generated
// This file was automatically generated and should not be edited.

@_exported import ApolloAPI
@_spi(Execution) @_spi(Unsafe) import ApolloAPI

extension NotificationAPI {
  nonisolated struct ReadAllInboxNotificationsMutation: GraphQLMutation {
    static let operationName: String = "ReadAllInboxNotifications"
    static let operationDocument: ApolloAPI.OperationDocument = .init(
      definition: .init(
        #"mutation ReadAllInboxNotifications { markAllNotificationsRead }"#
      ))

    public init() {}

    nonisolated struct Data: NotificationAPI.SelectionSet {
      let __data: DataDict
      init(_dataDict: DataDict) { __data = _dataDict }

      static var __parentType: any ApolloAPI.ParentType { NotificationAPI.Objects.Mutation }
      static var __selections: [ApolloAPI.Selection] { [
        .field("markAllNotificationsRead", Bool.self),
      ] }
      static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
        ReadAllInboxNotificationsMutation.Data.self
      ] }

      var markAllNotificationsRead: Bool { __data["markAllNotificationsRead"] }
    }
  }

}