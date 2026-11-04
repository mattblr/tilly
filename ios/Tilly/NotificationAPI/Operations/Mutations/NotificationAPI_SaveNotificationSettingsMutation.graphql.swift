// @generated
// This file was automatically generated and should not be edited.

@_exported import ApolloAPI
@_spi(Execution) @_spi(Unsafe) import ApolloAPI

extension NotificationAPI {
  nonisolated struct SaveNotificationSettingsMutation: GraphQLMutation {
    static let operationName: String = "SaveNotificationSettings"
    static let operationDocument: ApolloAPI.OperationDocument = .init(
      definition: .init(
        #"mutation SaveNotificationSettings($input: SaveNotificationSettingsInput!) { executeSaveNotificationSettings(input: $input) { __typename result { __typename ok } execution { __typename status error } } }"#
      ))

    public var input: SaveNotificationSettingsInput

    public init(input: SaveNotificationSettingsInput) {
      self.input = input
    }

    @_spi(Unsafe) public var __variables: Variables? { ["input": input] }

    nonisolated struct Data: NotificationAPI.SelectionSet {
      let __data: DataDict
      init(_dataDict: DataDict) { __data = _dataDict }

      static var __parentType: any ApolloAPI.ParentType { NotificationAPI.Objects.Mutation }
      static var __selections: [ApolloAPI.Selection] { [
        .field("executeSaveNotificationSettings", ExecuteSaveNotificationSettings?.self, arguments: ["input": .variable("input")]),
      ] }
      static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
        SaveNotificationSettingsMutation.Data.self
      ] }

      /// Execute the Save notification settings operation
      var executeSaveNotificationSettings: ExecuteSaveNotificationSettings? { __data["executeSaveNotificationSettings"] }

      /// ExecuteSaveNotificationSettings
      ///
      /// Parent Type: `ExecuteSaveNotificationSettingsPayload`
      nonisolated struct ExecuteSaveNotificationSettings: NotificationAPI.SelectionSet {
        let __data: DataDict
        init(_dataDict: DataDict) { __data = _dataDict }

        static var __parentType: any ApolloAPI.ParentType { NotificationAPI.Objects.ExecuteSaveNotificationSettingsPayload }
        static var __selections: [ApolloAPI.Selection] { [
          .field("__typename", String.self),
          .field("result", Result?.self),
          .field("execution", Execution.self),
        ] }
        static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
          SaveNotificationSettingsMutation.Data.ExecuteSaveNotificationSettings.self
        ] }

        /// Typed result; populated on SYNC completion, null on ASYNC dispatch.
        var result: Result? { __data["result"] }
        /// Execution row. Use execution.id to subscribe on operationSaveNotificationSettingsExecution.
        var execution: Execution { __data["execution"] }

        /// ExecuteSaveNotificationSettings.Result
        ///
        /// Parent Type: `SaveNotificationSettingsOutput`
        nonisolated struct Result: NotificationAPI.SelectionSet {
          let __data: DataDict
          init(_dataDict: DataDict) { __data = _dataDict }

          static var __parentType: any ApolloAPI.ParentType { NotificationAPI.Objects.SaveNotificationSettingsOutput }
          static var __selections: [ApolloAPI.Selection] { [
            .field("__typename", String.self),
            .field("ok", Bool?.self),
          ] }
          static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
            SaveNotificationSettingsMutation.Data.ExecuteSaveNotificationSettings.Result.self
          ] }

          var ok: Bool? { __data["ok"] }
        }

        /// ExecuteSaveNotificationSettings.Execution
        ///
        /// Parent Type: `OperationExecution`
        nonisolated struct Execution: NotificationAPI.SelectionSet {
          let __data: DataDict
          init(_dataDict: DataDict) { __data = _dataDict }

          static var __parentType: any ApolloAPI.ParentType { NotificationAPI.Objects.OperationExecution }
          static var __selections: [ApolloAPI.Selection] { [
            .field("__typename", String.self),
            .field("status", GraphQLEnum<NotificationAPI.OperationExecutionStatus>.self),
            .field("error", String?.self),
          ] }
          static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
            SaveNotificationSettingsMutation.Data.ExecuteSaveNotificationSettings.Execution.self
          ] }

          var status: GraphQLEnum<NotificationAPI.OperationExecutionStatus> { __data["status"] }
          var error: String? { __data["error"] }
        }
      }
    }
  }

}