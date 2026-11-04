// @generated
// This file was automatically generated and should not be edited.

@_exported import ApolloAPI
@_spi(Execution) @_spi(Unsafe) import ApolloAPI

extension NotificationAPI {
  nonisolated struct UnregisterNotificationDeviceMutation: GraphQLMutation {
    static let operationName: String = "UnregisterNotificationDevice"
    static let operationDocument: ApolloAPI.OperationDocument = .init(
      definition: .init(
        #"mutation UnregisterNotificationDevice($token: String!) { unregisterDeviceToken(token: $token) }"#
      ))

    public var token: String

    public init(token: String) {
      self.token = token
    }

    @_spi(Unsafe) public var __variables: Variables? { ["token": token] }

    nonisolated struct Data: NotificationAPI.SelectionSet {
      let __data: DataDict
      init(_dataDict: DataDict) { __data = _dataDict }

      static var __parentType: any ApolloAPI.ParentType { NotificationAPI.Objects.Mutation }
      static var __selections: [ApolloAPI.Selection] { [
        .field("unregisterDeviceToken", Bool.self, arguments: ["token": .variable("token")]),
      ] }
      static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
        UnregisterNotificationDeviceMutation.Data.self
      ] }

      var unregisterDeviceToken: Bool { __data["unregisterDeviceToken"] }
    }
  }

}