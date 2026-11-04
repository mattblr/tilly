// @generated
// This file was automatically generated and should not be edited.

@_exported import ApolloAPI
@_spi(Execution) @_spi(Unsafe) import ApolloAPI

extension FoirAPI {
  nonisolated struct AddFieldNoteMutation: GraphQLMutation {
    static let operationName: String = "AddFieldNote"
    static let operationDocument: ApolloAPI.OperationDocument = .init(
      definition: .init(
        #"mutation AddFieldNote($input: TillyAddFieldNoteInput!, $key: String!) { executeAddFieldNote: executeTillyAddFieldNote( input: $input idempotencyKey: $key ) { __typename result { __typename ok id error } execution { __typename status error } } }"#
      ))

    public var input: TillyAddFieldNoteInput
    public var key: String

    public init(
      input: TillyAddFieldNoteInput,
      key: String
    ) {
      self.input = input
      self.key = key
    }

    @_spi(Unsafe) public var __variables: Variables? { [
      "input": input,
      "key": key
    ] }

    nonisolated struct Data: FoirAPI.SelectionSet {
      let __data: DataDict
      init(_dataDict: DataDict) { __data = _dataDict }

      static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.Mutation }
      static var __selections: [ApolloAPI.Selection] { [
        .field("executeTillyAddFieldNote", alias: "executeAddFieldNote", ExecuteAddFieldNote?.self, arguments: [
          "input": .variable("input"),
          "idempotencyKey": .variable("key")
        ]),
      ] }
      static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
        AddFieldNoteMutation.Data.self
      ] }

      /// Execute the Add a field note operation
      var executeAddFieldNote: ExecuteAddFieldNote? { __data["executeAddFieldNote"] }

      /// ExecuteAddFieldNote
      ///
      /// Parent Type: `ExecuteTillyAddFieldNotePayload`
      nonisolated struct ExecuteAddFieldNote: FoirAPI.SelectionSet {
        let __data: DataDict
        init(_dataDict: DataDict) { __data = _dataDict }

        static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.ExecuteTillyAddFieldNotePayload }
        static var __selections: [ApolloAPI.Selection] { [
          .field("__typename", String.self),
          .field("result", Result?.self),
          .field("execution", Execution.self),
        ] }
        static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
          AddFieldNoteMutation.Data.ExecuteAddFieldNote.self
        ] }

        /// Typed result; populated on SYNC completion, null on ASYNC dispatch.
        var result: Result? { __data["result"] }
        /// Execution row. Use execution.id to subscribe on operationTillyAddFieldNoteExecution.
        var execution: Execution { __data["execution"] }

        /// ExecuteAddFieldNote.Result
        ///
        /// Parent Type: `TillyAddFieldNoteOutput`
        nonisolated struct Result: FoirAPI.SelectionSet {
          let __data: DataDict
          init(_dataDict: DataDict) { __data = _dataDict }

          static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.TillyAddFieldNoteOutput }
          static var __selections: [ApolloAPI.Selection] { [
            .field("__typename", String.self),
            .field("ok", Bool?.self),
            .field("id", String?.self),
            .field("error", String?.self),
          ] }
          static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
            AddFieldNoteMutation.Data.ExecuteAddFieldNote.Result.self
          ] }

          var ok: Bool? { __data["ok"] }
          var id: String? { __data["id"] }
          var error: String? { __data["error"] }
        }

        /// ExecuteAddFieldNote.Execution
        ///
        /// Parent Type: `OperationExecution`
        nonisolated struct Execution: FoirAPI.SelectionSet {
          let __data: DataDict
          init(_dataDict: DataDict) { __data = _dataDict }

          static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.OperationExecution }
          static var __selections: [ApolloAPI.Selection] { [
            .field("__typename", String.self),
            .field("status", GraphQLEnum<FoirAPI.OperationExecutionStatus>.self),
            .field("error", String?.self),
          ] }
          static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
            AddFieldNoteMutation.Data.ExecuteAddFieldNote.Execution.self
          ] }

          var status: GraphQLEnum<FoirAPI.OperationExecutionStatus> { __data["status"] }
          var error: String? { __data["error"] }
        }
      }
    }
  }

}