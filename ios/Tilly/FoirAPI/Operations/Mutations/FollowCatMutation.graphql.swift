// @generated
// This file was automatically generated and should not be edited.

@_exported import ApolloAPI
@_spi(Execution) @_spi(Unsafe) import ApolloAPI

extension FoirAPI {
  nonisolated struct FollowCatMutation: GraphQLMutation {
    static let operationName: String = "FollowCat"
    static let operationDocument: ApolloAPI.OperationDocument = .init(
      definition: .init(
        #"mutation FollowCat($input: FollowCatInput!, $key: String) { executeFollowCat(input: $input, concurrencyKey: $key) { __typename result { __typename ok active error } execution { __typename status error } } }"#
      ))

    public var input: FollowCatInput
    public var key: GraphQLNullable<String>

    public init(
      input: FollowCatInput,
      key: GraphQLNullable<String>
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
        .field("executeFollowCat", ExecuteFollowCat?.self, arguments: [
          "input": .variable("input"),
          "concurrencyKey": .variable("key")
        ]),
      ] }
      static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
        FollowCatMutation.Data.self
      ] }

      /// Execute the Follow a cat operation
      var executeFollowCat: ExecuteFollowCat? { __data["executeFollowCat"] }

      /// ExecuteFollowCat
      ///
      /// Parent Type: `ExecuteFollowCatPayload`
      nonisolated struct ExecuteFollowCat: FoirAPI.SelectionSet {
        let __data: DataDict
        init(_dataDict: DataDict) { __data = _dataDict }

        static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.ExecuteFollowCatPayload }
        static var __selections: [ApolloAPI.Selection] { [
          .field("__typename", String.self),
          .field("result", Result?.self),
          .field("execution", Execution.self),
        ] }
        static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
          FollowCatMutation.Data.ExecuteFollowCat.self
        ] }

        /// Typed result; populated on SYNC completion, null on ASYNC dispatch.
        var result: Result? { __data["result"] }
        /// Execution row. Use execution.id to subscribe on operationFollowCatExecution.
        var execution: Execution { __data["execution"] }

        /// ExecuteFollowCat.Result
        ///
        /// Parent Type: `FollowCatOutput`
        nonisolated struct Result: FoirAPI.SelectionSet {
          let __data: DataDict
          init(_dataDict: DataDict) { __data = _dataDict }

          static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.FollowCatOutput }
          static var __selections: [ApolloAPI.Selection] { [
            .field("__typename", String.self),
            .field("ok", Bool?.self),
            .field("active", Bool?.self),
            .field("error", String?.self),
          ] }
          static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
            FollowCatMutation.Data.ExecuteFollowCat.Result.self
          ] }

          var ok: Bool? { __data["ok"] }
          var active: Bool? { __data["active"] }
          var error: String? { __data["error"] }
        }

        /// ExecuteFollowCat.Execution
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
            FollowCatMutation.Data.ExecuteFollowCat.Execution.self
          ] }

          var status: GraphQLEnum<FoirAPI.OperationExecutionStatus> { __data["status"] }
          var error: String? { __data["error"] }
        }
      }
    }
  }

}