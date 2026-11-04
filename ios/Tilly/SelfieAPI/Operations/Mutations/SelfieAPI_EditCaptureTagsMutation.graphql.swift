// @generated
// This file was automatically generated and should not be edited.

@_exported import ApolloAPI
@_spi(Execution) @_spi(Unsafe) import ApolloAPI

extension SelfieAPI {
  nonisolated struct EditCaptureTagsMutation: GraphQLMutation {
    static let operationName: String = "EditCaptureTags"
    static let operationDocument: ApolloAPI.OperationDocument = .init(
      definition: .init(
        #"mutation EditCaptureTags($input: TillyUpdateCaptureTagsInput!, $key: String!) { executeUpdateCaptureTags: executeTillyUpdateCaptureTags( input: $input idempotencyKey: $key ) { __typename result { __typename ok error captureId revision cats } execution { __typename status error } } }"#
      ))

    public var input: TillyUpdateCaptureTagsInput
    public var key: String

    public init(
      input: TillyUpdateCaptureTagsInput,
      key: String
    ) {
      self.input = input
      self.key = key
    }

    @_spi(Unsafe) public var __variables: Variables? { [
      "input": input,
      "key": key
    ] }

    nonisolated struct Data: SelfieAPI.SelectionSet {
      let __data: DataDict
      init(_dataDict: DataDict) { __data = _dataDict }

      static var __parentType: any ApolloAPI.ParentType { SelfieAPI.Objects.Mutation }
      static var __selections: [ApolloAPI.Selection] { [
        .field("executeTillyUpdateCaptureTags", alias: "executeUpdateCaptureTags", ExecuteUpdateCaptureTags?.self, arguments: [
          "input": .variable("input"),
          "idempotencyKey": .variable("key")
        ]),
      ] }
      static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
        EditCaptureTagsMutation.Data.self
      ] }

      /// Execute the Edit my capture’s cats operation
      var executeUpdateCaptureTags: ExecuteUpdateCaptureTags? { __data["executeUpdateCaptureTags"] }

      /// ExecuteUpdateCaptureTags
      ///
      /// Parent Type: `ExecuteTillyUpdateCaptureTagsPayload`
      nonisolated struct ExecuteUpdateCaptureTags: SelfieAPI.SelectionSet {
        let __data: DataDict
        init(_dataDict: DataDict) { __data = _dataDict }

        static var __parentType: any ApolloAPI.ParentType { SelfieAPI.Objects.ExecuteTillyUpdateCaptureTagsPayload }
        static var __selections: [ApolloAPI.Selection] { [
          .field("__typename", String.self),
          .field("result", Result?.self),
          .field("execution", Execution.self),
        ] }
        static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
          EditCaptureTagsMutation.Data.ExecuteUpdateCaptureTags.self
        ] }

        /// Typed result; populated on SYNC completion, null on ASYNC dispatch.
        var result: Result? { __data["result"] }
        /// Execution row. Use execution.id to subscribe on operationTillyUpdateCaptureTagsExecution.
        var execution: Execution { __data["execution"] }

        /// ExecuteUpdateCaptureTags.Result
        ///
        /// Parent Type: `TillyUpdateCaptureTagsOutput`
        nonisolated struct Result: SelfieAPI.SelectionSet {
          let __data: DataDict
          init(_dataDict: DataDict) { __data = _dataDict }

          static var __parentType: any ApolloAPI.ParentType { SelfieAPI.Objects.TillyUpdateCaptureTagsOutput }
          static var __selections: [ApolloAPI.Selection] { [
            .field("__typename", String.self),
            .field("ok", Bool?.self),
            .field("error", String?.self),
            .field("captureId", String?.self),
            .field("revision", String?.self),
            .field("cats", [SelfieAPI.JSON]?.self),
          ] }
          static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
            EditCaptureTagsMutation.Data.ExecuteUpdateCaptureTags.Result.self
          ] }

          var ok: Bool? { __data["ok"] }
          var error: String? { __data["error"] }
          var captureId: String? { __data["captureId"] }
          var revision: String? { __data["revision"] }
          var cats: [SelfieAPI.JSON]? { __data["cats"] }
        }

        /// ExecuteUpdateCaptureTags.Execution
        ///
        /// Parent Type: `OperationExecution`
        nonisolated struct Execution: SelfieAPI.SelectionSet {
          let __data: DataDict
          init(_dataDict: DataDict) { __data = _dataDict }

          static var __parentType: any ApolloAPI.ParentType { SelfieAPI.Objects.OperationExecution }
          static var __selections: [ApolloAPI.Selection] { [
            .field("__typename", String.self),
            .field("status", GraphQLEnum<SelfieAPI.OperationExecutionStatus>.self),
            .field("error", String?.self),
          ] }
          static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
            EditCaptureTagsMutation.Data.ExecuteUpdateCaptureTags.Execution.self
          ] }

          var status: GraphQLEnum<SelfieAPI.OperationExecutionStatus> { __data["status"] }
          var error: String? { __data["error"] }
        }
      }
    }
  }

}