// @generated
// This file was automatically generated and should not be edited.

@_exported import ApolloAPI
@_spi(Execution) @_spi(Unsafe) import ApolloAPI

extension FoirAPI {
  nonisolated struct TidyFollowersMutation: GraphQLMutation {
    static let operationName: String = "TidyFollowers"
    static let operationDocument: ApolloAPI.OperationDocument = .init(
      definition: .init(
        #"mutation TidyFollowers { executeTidyFollowers(input: {  }, mode: ASYNC, concurrencyKey: "tidy-followers") { __typename execution { __typename status error } } }"#
      ))

    public init() {}

    nonisolated struct Data: FoirAPI.SelectionSet {
      let __data: DataDict
      init(_dataDict: DataDict) { __data = _dataDict }

      static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.Mutation }
      static var __selections: [ApolloAPI.Selection] { [
        .field("executeTidyFollowers", ExecuteTidyFollowers?.self, arguments: [
          "input": [],
          "mode": "ASYNC",
          "concurrencyKey": "tidy-followers"
        ]),
      ] }
      static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
        TidyFollowersMutation.Data.self
      ] }

      /// Execute the Tidy my followers operation
      var executeTidyFollowers: ExecuteTidyFollowers? { __data["executeTidyFollowers"] }

      /// ExecuteTidyFollowers
      ///
      /// Parent Type: `ExecuteTidyFollowersPayload`
      nonisolated struct ExecuteTidyFollowers: FoirAPI.SelectionSet {
        let __data: DataDict
        init(_dataDict: DataDict) { __data = _dataDict }

        static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.ExecuteTidyFollowersPayload }
        static var __selections: [ApolloAPI.Selection] { [
          .field("__typename", String.self),
          .field("execution", Execution.self),
        ] }
        static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
          TidyFollowersMutation.Data.ExecuteTidyFollowers.self
        ] }

        /// Execution row. Use execution.id to subscribe on operationTidyFollowersExecution.
        var execution: Execution { __data["execution"] }

        /// ExecuteTidyFollowers.Execution
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
            TidyFollowersMutation.Data.ExecuteTidyFollowers.Execution.self
          ] }

          var status: GraphQLEnum<FoirAPI.OperationExecutionStatus> { __data["status"] }
          var error: String? { __data["error"] }
        }
      }
    }
  }

}