// @generated
// This file was automatically generated and should not be edited.

@_exported import ApolloAPI
@_spi(Execution) @_spi(Unsafe) import ApolloAPI

extension ExecutionAPI {
  nonisolated struct SaveAppearancePreferencesMutation: GraphQLMutation {
    static let operationName: String = "SaveAppearancePreferences"
    static let operationDocument: ApolloAPI.OperationDocument = .init(
      definition: .init(
        #"mutation SaveAppearancePreferences($input: SaveAppearancePreferencesInput!) { executeSaveAppearancePreferences(input: $input, mode: SYNC) { __typename execution { __typename id status error } result { __typename ok } } }"#
      ))

    public var input: SaveAppearancePreferencesInput

    public init(input: SaveAppearancePreferencesInput) {
      self.input = input
    }

    @_spi(Unsafe) public var __variables: Variables? { ["input": input] }

    nonisolated struct Data: ExecutionAPI.SelectionSet {
      let __data: DataDict
      init(_dataDict: DataDict) { __data = _dataDict }

      static var __parentType: any ApolloAPI.ParentType { ExecutionAPI.Objects.Mutation }
      static var __selections: [ApolloAPI.Selection] { [
        .field("executeSaveAppearancePreferences", ExecuteSaveAppearancePreferences?.self, arguments: [
          "input": .variable("input"),
          "mode": "SYNC"
        ]),
      ] }
      static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
        SaveAppearancePreferencesMutation.Data.self
      ] }

      /// Execute the Save my appearance preferences operation
      var executeSaveAppearancePreferences: ExecuteSaveAppearancePreferences? { __data["executeSaveAppearancePreferences"] }

      /// ExecuteSaveAppearancePreferences
      ///
      /// Parent Type: `ExecuteSaveAppearancePreferencesPayload`
      nonisolated struct ExecuteSaveAppearancePreferences: ExecutionAPI.SelectionSet {
        let __data: DataDict
        init(_dataDict: DataDict) { __data = _dataDict }

        static var __parentType: any ApolloAPI.ParentType { ExecutionAPI.Objects.ExecuteSaveAppearancePreferencesPayload }
        static var __selections: [ApolloAPI.Selection] { [
          .field("__typename", String.self),
          .field("execution", Execution.self),
          .field("result", Result?.self),
        ] }
        static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
          SaveAppearancePreferencesMutation.Data.ExecuteSaveAppearancePreferences.self
        ] }

        /// Execution row. Use execution.id to subscribe on operationSaveAppearancePreferencesExecution.
        var execution: Execution { __data["execution"] }
        /// Typed result; populated on SYNC completion, null on ASYNC dispatch.
        var result: Result? { __data["result"] }

        /// ExecuteSaveAppearancePreferences.Execution
        ///
        /// Parent Type: `OperationExecution`
        nonisolated struct Execution: ExecutionAPI.SelectionSet {
          let __data: DataDict
          init(_dataDict: DataDict) { __data = _dataDict }

          static var __parentType: any ApolloAPI.ParentType { ExecutionAPI.Objects.OperationExecution }
          static var __selections: [ApolloAPI.Selection] { [
            .field("__typename", String.self),
            .field("id", String.self),
            .field("status", GraphQLEnum<ExecutionAPI.OperationExecutionStatus>.self),
            .field("error", String?.self),
          ] }
          static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
            SaveAppearancePreferencesMutation.Data.ExecuteSaveAppearancePreferences.Execution.self
          ] }

          var id: String { __data["id"] }
          var status: GraphQLEnum<ExecutionAPI.OperationExecutionStatus> { __data["status"] }
          var error: String? { __data["error"] }
        }

        /// ExecuteSaveAppearancePreferences.Result
        ///
        /// Parent Type: `SaveAppearancePreferencesOutput`
        nonisolated struct Result: ExecutionAPI.SelectionSet {
          let __data: DataDict
          init(_dataDict: DataDict) { __data = _dataDict }

          static var __parentType: any ApolloAPI.ParentType { ExecutionAPI.Objects.SaveAppearancePreferencesOutput }
          static var __selections: [ApolloAPI.Selection] { [
            .field("__typename", String.self),
            .field("ok", Bool?.self),
          ] }
          static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
            SaveAppearancePreferencesMutation.Data.ExecuteSaveAppearancePreferences.Result.self
          ] }

          var ok: Bool? { __data["ok"] }
        }
      }
    }
  }

}