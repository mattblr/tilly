// @generated
// This file was automatically generated and should not be edited.

@_exported import ApolloAPI
@_spi(Execution) @_spi(Unsafe) import ApolloAPI

extension NotificationAPI {
  nonisolated struct ReadInboxNotificationMutation: GraphQLMutation {
    static let operationName: String = "ReadInboxNotification"
    static let operationDocument: ApolloAPI.OperationDocument = .init(
      definition: .init(
        #"mutation ReadInboxNotification($id: String!) { markNotificationRead(id: $id) }"#
      ))

    public var id: String

    public init(id: String) {
      self.id = id
    }

    @_spi(Unsafe) public var __variables: Variables? { ["id": id] }

    nonisolated struct Data: NotificationAPI.SelectionSet {
      let __data: DataDict
      init(_dataDict: DataDict) { __data = _dataDict }

      static var __parentType: any ApolloAPI.ParentType { NotificationAPI.Objects.Mutation }
      static var __selections: [ApolloAPI.Selection] { [
        .field("markNotificationRead", Bool.self, arguments: ["id": .variable("id")]),
      ] }
      static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
        ReadInboxNotificationMutation.Data.self
      ] }

      var markNotificationRead: Bool { __data["markNotificationRead"] }
    }
  }

}