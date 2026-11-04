// @generated
// This file was automatically generated and should not be edited.

@_exported import ApolloAPI
@_spi(Execution) @_spi(Unsafe) import ApolloAPI

extension ExecutionAPI {
  nonisolated struct FinalizeCaptureMutation: GraphQLMutation {
    static let operationName: String = "FinalizeCapture"
    static let operationDocument: ApolloAPI.OperationDocument = .init(
      definition: .init(
        #"mutation FinalizeCapture($input: FinalizeCaptureInput!, $key: String!) { executeFinalizeCapture(input: $input, mode: SYNC, idempotencyKey: $key) { __typename execution { __typename id status error } result { __typename ok } } }"#
      ))

    public var input: FinalizeCaptureInput
    public var key: String

    public init(
      input: FinalizeCaptureInput,
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
        .field("executeFinalizeCapture", ExecuteFinalizeCapture?.self, arguments: [
          "input": .variable("input"),
          "mode": "SYNC",
          "idempotencyKey": .variable("key")
        ]),
      ] }
      static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
        FinalizeCaptureMutation.Data.self
      ] }

      /// Execute the Finish a saved capture after its note or skip operation
      var executeFinalizeCapture: ExecuteFinalizeCapture? { __data["executeFinalizeCapture"] }

      /// ExecuteFinalizeCapture
      ///
      /// Parent Type: `ExecuteFinalizeCapturePayload`
      nonisolated struct ExecuteFinalizeCapture: ExecutionAPI.SelectionSet {
        let __data: DataDict
        init(_dataDict: DataDict) { __data = _dataDict }

        static var __parentType: any ApolloAPI.ParentType { ExecutionAPI.Objects.ExecuteFinalizeCapturePayload }
        static var __selections: [ApolloAPI.Selection] { [
          .field("__typename", String.self),
          .field("execution", Execution.self),
          .field("result", Result?.self),
        ] }
        static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
          FinalizeCaptureMutation.Data.ExecuteFinalizeCapture.self
        ] }

        /// Execution row. Use execution.id to subscribe on operationFinalizeCaptureExecution.
        var execution: Execution { __data["execution"] }
        /// Typed result; populated on SYNC completion, null on ASYNC dispatch.
        var result: Result? { __data["result"] }

        /// ExecuteFinalizeCapture.Execution
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
            FinalizeCaptureMutation.Data.ExecuteFinalizeCapture.Execution.self
          ] }

          var id: String { __data["id"] }
          var status: GraphQLEnum<ExecutionAPI.OperationExecutionStatus> { __data["status"] }
          var error: String? { __data["error"] }
        }

        /// ExecuteFinalizeCapture.Result
        ///
        /// Parent Type: `FinalizeCaptureOutput`
        nonisolated struct Result: ExecutionAPI.SelectionSet {
          let __data: DataDict
          init(_dataDict: DataDict) { __data = _dataDict }

          static var __parentType: any ApolloAPI.ParentType { ExecutionAPI.Objects.FinalizeCaptureOutput }
          static var __selections: [ApolloAPI.Selection] { [
            .field("__typename", String.self),
            .field("ok", Bool?.self),
          ] }
          static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
            FinalizeCaptureMutation.Data.ExecuteFinalizeCapture.Result.self
          ] }

          var ok: Bool? { __data["ok"] }
        }
      }
    }
  }

}