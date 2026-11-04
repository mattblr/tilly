// @generated
// This file was automatically generated and should not be edited.

@_exported import ApolloAPI
@_spi(Execution) @_spi(Unsafe) import ApolloAPI

extension NotificationAPI {
  nonisolated struct UpdateNotificationPreferenceMutation: GraphQLMutation {
    static let operationName: String = "UpdateNotificationPreference"
    static let operationDocument: ApolloAPI.OperationDocument = .init(
      definition: .init(
        #"mutation UpdateNotificationPreference($input: UpdateNotificationPreferenceInput!) { updateNotificationPreference(input: $input) }"#
      ))

    public var input: UpdateNotificationPreferenceInput

    public init(input: UpdateNotificationPreferenceInput) {
      self.input = input
    }

    @_spi(Unsafe) public var __variables: Variables? { ["input": input] }

    nonisolated struct Data: NotificationAPI.SelectionSet {
      let __data: DataDict
      init(_dataDict: DataDict) { __data = _dataDict }

      static var __parentType: any ApolloAPI.ParentType { NotificationAPI.Objects.Mutation }
      static var __selections: [ApolloAPI.Selection] { [
        .field("updateNotificationPreference", Bool.self, arguments: ["input": .variable("input")]),
      ] }
      static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
        UpdateNotificationPreferenceMutation.Data.self
      ] }

      var updateNotificationPreference: Bool { __data["updateNotificationPreference"] }
    }
  }

}