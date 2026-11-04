// @generated
// This file was automatically generated and should not be edited.

@_exported import ApolloAPI
@_spi(Execution) @_spi(Unsafe) import ApolloAPI

extension FoirAPI {
  nonisolated struct FollowUserMutation: GraphQLMutation {
    static let operationName: String = "FollowUser"
    static let operationDocument: ApolloAPI.OperationDocument = .init(
      definition: .init(
        #"mutation FollowUser($input: FollowUserInput!, $key: String) { executeFollowUser(input: $input, concurrencyKey: $key) { __typename result { __typename ok active status error } execution { __typename status error } } }"#
      ))

    public var input: FollowUserInput
    public var key: GraphQLNullable<String>

    public init(
      input: FollowUserInput,
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
        .field("executeFollowUser", ExecuteFollowUser?.self, arguments: [
          "input": .variable("input"),
          "concurrencyKey": .variable("key")
        ]),
      ] }
      static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
        FollowUserMutation.Data.self
      ] }

      /// Execute the Follow a user operation
      var executeFollowUser: ExecuteFollowUser? { __data["executeFollowUser"] }

      /// ExecuteFollowUser
      ///
      /// Parent Type: `ExecuteFollowUserPayload`
      nonisolated struct ExecuteFollowUser: FoirAPI.SelectionSet {
        let __data: DataDict
        init(_dataDict: DataDict) { __data = _dataDict }

        static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.ExecuteFollowUserPayload }
        static var __selections: [ApolloAPI.Selection] { [
          .field("__typename", String.self),
          .field("result", Result?.self),
          .field("execution", Execution.self),
        ] }
        static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
          FollowUserMutation.Data.ExecuteFollowUser.self
        ] }

        /// Typed result; populated on SYNC completion, null on ASYNC dispatch.
        var result: Result? { __data["result"] }
        /// Execution row. Use execution.id to subscribe on operationFollowUserExecution.
        var execution: Execution { __data["execution"] }

        /// ExecuteFollowUser.Result
        ///
        /// Parent Type: `FollowUserOutput`
        nonisolated struct Result: FoirAPI.SelectionSet {
          let __data: DataDict
          init(_dataDict: DataDict) { __data = _dataDict }

          static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.FollowUserOutput }
          static var __selections: [ApolloAPI.Selection] { [
            .field("__typename", String.self),
            .field("ok", Bool?.self),
            .field("active", Bool?.self),
            .field("status", String?.self),
            .field("error", String?.self),
          ] }
          static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
            FollowUserMutation.Data.ExecuteFollowUser.Result.self
          ] }

          var ok: Bool? { __data["ok"] }
          var active: Bool? { __data["active"] }
          var status: String? { __data["status"] }
          var error: String? { __data["error"] }
        }

        /// ExecuteFollowUser.Execution
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
            FollowUserMutation.Data.ExecuteFollowUser.Execution.self
          ] }

          var status: GraphQLEnum<FoirAPI.OperationExecutionStatus> { __data["status"] }
          var error: String? { __data["error"] }
        }
      }
    }
  }

}