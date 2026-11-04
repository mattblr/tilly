// @generated
// This file was automatically generated and should not be edited.

@_exported import ApolloAPI
@_spi(Execution) @_spi(Unsafe) import ApolloAPI

extension ExecutionAPI {
  nonisolated struct SaveCatchRunMutation: GraphQLMutation {
    static let operationName: String = "SaveCatchRun"
    static let operationDocument: ApolloAPI.OperationDocument = .init(
      definition: .init(
        #"mutation SaveCatchRun($input: TillySaveCatchInput!, $key: String!) { executeSaveCatch: executeTillySaveCatch( input: $input mode: ASYNC idempotencyKey: $key ) { __typename execution { __typename id operationKey status error result } } }"#
      ))

    public var input: TillySaveCatchInput
    public var key: String

    public init(
      input: TillySaveCatchInput,
      key: String
    ) {
      self.input = input
      self.key = key
    }

    @_spi(Unsafe) public var __variables: Variables? { [
      "input": input,
      "key": key
    ] }

    nonisolated struct Data: ExecutionAPI.SelectionSet {
      let __data: DataDict
      init(_dataDict: DataDict) { __data = _dataDict }

      static var __parentType: any ApolloAPI.ParentType { ExecutionAPI.Objects.Mutation }
      static var __selections: [ApolloAPI.Selection] { [
        .field("executeTillySaveCatch", alias: "executeSaveCatch", ExecuteSaveCatch?.self, arguments: [
          "input": .variable("input"),
          "mode": "ASYNC",
          "idempotencyKey": .variable("key")
        ]),
      ] }
      static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
        SaveCatchRunMutation.Data.self
      ] }

      /// Execute the Save a catch operation
      var executeSaveCatch: ExecuteSaveCatch? { __data["executeSaveCatch"] }

      /// ExecuteSaveCatch
      ///
      /// Parent Type: `ExecuteTillySaveCatchPayload`
      nonisolated struct ExecuteSaveCatch: ExecutionAPI.SelectionSet {
        let __data: DataDict
        init(_dataDict: DataDict) { __data = _dataDict }

        static var __parentType: any ApolloAPI.ParentType { ExecutionAPI.Objects.ExecuteTillySaveCatchPayload }
        static var __selections: [ApolloAPI.Selection] { [
          .field("__typename", String.self),
          .field("execution", Execution.self),
        ] }
        static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
          SaveCatchRunMutation.Data.ExecuteSaveCatch.self
        ] }

        /// Execution row. Use execution.id to subscribe on operationTillySaveCatchExecution.
        var execution: Execution { __data["execution"] }

        /// ExecuteSaveCatch.Execution
        ///
        /// Parent Type: `OperationExecution`
        nonisolated struct Execution: ExecutionAPI.SelectionSet {
          let __data: DataDict
          init(_dataDict: DataDict) { __data = _dataDict }

          static var __parentType: any ApolloAPI.ParentType { ExecutionAPI.Objects.OperationExecution }
          static var __selections: [ApolloAPI.Selection] { [
            .field("__typename", String.self),
            .field("id", String.self),
            .field("operationKey", String.self),
            .field("status", GraphQLEnum<ExecutionAPI.OperationExecutionStatus>.self),
            .field("error", String?.self),
            .field("result", ExecutionAPI.JSON?.self),
          ] }
          static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
            SaveCatchRunMutation.Data.ExecuteSaveCatch.Execution.self
          ] }

          var id: String { __data["id"] }
          var operationKey: String { __data["operationKey"] }
          var status: GraphQLEnum<ExecutionAPI.OperationExecutionStatus> { __data["status"] }
          var error: String? { __data["error"] }
          var result: ExecutionAPI.JSON? { __data["result"] }
        }
      }
    }
  }

}