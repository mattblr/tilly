// @generated
// This file was automatically generated and should not be edited.

@_exported import ApolloAPI
@_spi(Execution) @_spi(Unsafe) import ApolloAPI

extension SafetyAPI {
  nonisolated struct SetUserBlockMutation: GraphQLMutation {
    static let operationName: String = "SetUserBlock"
    static let operationDocument: ApolloAPI.OperationDocument = .init(
      definition: .init(
        #"mutation SetUserBlock($input: SetUserBlockInput!) { executeSetUserBlock(input: $input) { __typename result { __typename ok active } execution { __typename id status error } } }"#
      ))

    public var input: SetUserBlockInput

    public init(input: SetUserBlockInput) {
      self.input = input
    }

    @_spi(Unsafe) public var __variables: Variables? { ["input": input] }

    nonisolated struct Data: SafetyAPI.SelectionSet {
      let __data: DataDict
      init(_dataDict: DataDict) { __data = _dataDict }

      static var __parentType: any ApolloAPI.ParentType { SafetyAPI.Objects.Mutation }
      static var __selections: [ApolloAPI.Selection] { [
        .field("executeSetUserBlock", ExecuteSetUserBlock?.self, arguments: ["input": .variable("input")]),
      ] }
      static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
        SetUserBlockMutation.Data.self
      ] }

      /// Execute the Block or unblock an account operation
      var executeSetUserBlock: ExecuteSetUserBlock? { __data["executeSetUserBlock"] }

      /// ExecuteSetUserBlock
      ///
      /// Parent Type: `ExecuteSetUserBlockPayload`
      nonisolated struct ExecuteSetUserBlock: SafetyAPI.SelectionSet {
        let __data: DataDict
        init(_dataDict: DataDict) { __data = _dataDict }

        static var __parentType: any ApolloAPI.ParentType { SafetyAPI.Objects.ExecuteSetUserBlockPayload }
        static var __selections: [ApolloAPI.Selection] { [
          .field("__typename", String.self),
          .field("result", Result?.self),
          .field("execution", Execution.self),
        ] }
        static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
          SetUserBlockMutation.Data.ExecuteSetUserBlock.self
        ] }

        /// Typed result; populated on SYNC completion, null on ASYNC dispatch.
        var result: Result? { __data["result"] }
        /// Execution row. Use execution.id to subscribe on operationSetUserBlockExecution.
        var execution: Execution { __data["execution"] }

        /// ExecuteSetUserBlock.Result
        ///
        /// Parent Type: `SetUserBlockOutput`
        nonisolated struct Result: SafetyAPI.SelectionSet {
          let __data: DataDict
          init(_dataDict: DataDict) { __data = _dataDict }

          static var __parentType: any ApolloAPI.ParentType { SafetyAPI.Objects.SetUserBlockOutput }
          static var __selections: [ApolloAPI.Selection] { [
            .field("__typename", String.self),
            .field("ok", Bool?.self),
            .field("active", Bool?.self),
          ] }
          static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
            SetUserBlockMutation.Data.ExecuteSetUserBlock.Result.self
          ] }

          var ok: Bool? { __data["ok"] }
          var active: Bool? { __data["active"] }
        }

        /// ExecuteSetUserBlock.Execution
        ///
        /// Parent Type: `OperationExecution`
        nonisolated struct Execution: SafetyAPI.SelectionSet {
          let __data: DataDict
          init(_dataDict: DataDict) { __data = _dataDict }

          static var __parentType: any ApolloAPI.ParentType { SafetyAPI.Objects.OperationExecution }
          static var __selections: [ApolloAPI.Selection] { [
            .field("__typename", String.self),
            .field("id", String.self),
            .field("status", GraphQLEnum<SafetyAPI.OperationExecutionStatus>.self),
            .field("error", String?.self),
          ] }
          static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
            SetUserBlockMutation.Data.ExecuteSetUserBlock.Execution.self
          ] }

          var id: String { __data["id"] }
          var status: GraphQLEnum<SafetyAPI.OperationExecutionStatus> { __data["status"] }
          var error: String? { __data["error"] }
        }
      }
    }
  }

}