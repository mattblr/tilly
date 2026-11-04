// @generated
// This file was automatically generated and should not be edited.

@_exported import ApolloAPI
@_spi(Execution) @_spi(Unsafe) import ApolloAPI

extension ExecutionAPI {
  nonisolated struct ShareCaptureRunMutation: GraphQLMutation {
    static let operationName: String = "ShareCaptureRun"
    static let operationDocument: ApolloAPI.OperationDocument = .init(
      definition: .init(
        #"mutation ShareCaptureRun($input: TillyShareCaptureInput!, $key: String!) { executeShareCapture: executeTillyShareCapture( input: $input mode: ASYNC idempotencyKey: $key ) { __typename execution { __typename id operationKey status error result } } }"#
      ))

    public var input: TillyShareCaptureInput
    public var key: String

    public init(
      input: TillyShareCaptureInput,
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
        .field("executeTillyShareCapture", alias: "executeShareCapture", ExecuteShareCapture?.self, arguments: [
          "input": .variable("input"),
          "mode": "ASYNC",
          "idempotencyKey": .variable("key")
        ]),
      ] }
      static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
        ShareCaptureRunMutation.Data.self
      ] }

      /// Execute the Share a capture operation
      var executeShareCapture: ExecuteShareCapture? { __data["executeShareCapture"] }

      /// ExecuteShareCapture
      ///
      /// Parent Type: `ExecuteTillyShareCapturePayload`
      nonisolated struct ExecuteShareCapture: ExecutionAPI.SelectionSet {
        let __data: DataDict
        init(_dataDict: DataDict) { __data = _dataDict }

        static var __parentType: any ApolloAPI.ParentType { ExecutionAPI.Objects.ExecuteTillyShareCapturePayload }
        static var __selections: [ApolloAPI.Selection] { [
          .field("__typename", String.self),
          .field("execution", Execution.self),
        ] }
        static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
          ShareCaptureRunMutation.Data.ExecuteShareCapture.self
        ] }

        /// Execution row. Use execution.id to subscribe on operationTillyShareCaptureExecution.
        var execution: Execution { __data["execution"] }

        /// ExecuteShareCapture.Execution
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
            ShareCaptureRunMutation.Data.ExecuteShareCapture.Execution.self
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