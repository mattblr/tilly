// @generated
// This file was automatically generated and should not be edited.

@_exported import ApolloAPI
@_spi(Execution) @_spi(Unsafe) import ApolloAPI

extension FoirAPI {
  nonisolated struct ProfileCountsMutation: GraphQLMutation {
    static let operationName: String = "ProfileCounts"
    static let operationDocument: ApolloAPI.OperationDocument = .init(
      definition: .init(
        #"mutation ProfileCounts($input: ProfileCountsInput!) { executeProfileCounts(input: $input) { __typename result { __typename ok followers following cats catches error } execution { __typename status error } } }"#
      ))

    public var input: ProfileCountsInput

    public init(input: ProfileCountsInput) {
      self.input = input
    }

    @_spi(Unsafe) public var __variables: Variables? { ["input": input] }

    nonisolated struct Data: FoirAPI.SelectionSet {
      let __data: DataDict
      init(_dataDict: DataDict) { __data = _dataDict }

      static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.Mutation }
      static var __selections: [ApolloAPI.Selection] { [
        .field("executeProfileCounts", ExecuteProfileCounts?.self, arguments: ["input": .variable("input")]),
      ] }
      static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
        ProfileCountsMutation.Data.self
      ] }

      /// Execute the A user's counts operation
      var executeProfileCounts: ExecuteProfileCounts? { __data["executeProfileCounts"] }

      /// ExecuteProfileCounts
      ///
      /// Parent Type: `ExecuteProfileCountsPayload`
      nonisolated struct ExecuteProfileCounts: FoirAPI.SelectionSet {
        let __data: DataDict
        init(_dataDict: DataDict) { __data = _dataDict }

        static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.ExecuteProfileCountsPayload }
        static var __selections: [ApolloAPI.Selection] { [
          .field("__typename", String.self),
          .field("result", Result?.self),
          .field("execution", Execution.self),
        ] }
        static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
          ProfileCountsMutation.Data.ExecuteProfileCounts.self
        ] }

        /// Typed result; populated on SYNC completion, null on ASYNC dispatch.
        var result: Result? { __data["result"] }
        /// Execution row. Use execution.id to subscribe on operationProfileCountsExecution.
        var execution: Execution { __data["execution"] }

        /// ExecuteProfileCounts.Result
        ///
        /// Parent Type: `ProfileCountsOutput`
        nonisolated struct Result: FoirAPI.SelectionSet {
          let __data: DataDict
          init(_dataDict: DataDict) { __data = _dataDict }

          static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.ProfileCountsOutput }
          static var __selections: [ApolloAPI.Selection] { [
            .field("__typename", String.self),
            .field("ok", Bool?.self),
            .field("followers", Int?.self),
            .field("following", Int?.self),
            .field("cats", Int?.self),
            .field("catches", Int?.self),
            .field("error", String?.self),
          ] }
          static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
            ProfileCountsMutation.Data.ExecuteProfileCounts.Result.self
          ] }

          var ok: Bool? { __data["ok"] }
          var followers: Int? { __data["followers"] }
          var following: Int? { __data["following"] }
          var cats: Int? { __data["cats"] }
          var catches: Int? { __data["catches"] }
          var error: String? { __data["error"] }
        }

        /// ExecuteProfileCounts.Execution
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
            ProfileCountsMutation.Data.ExecuteProfileCounts.Execution.self
          ] }

          var status: GraphQLEnum<FoirAPI.OperationExecutionStatus> { __data["status"] }
          var error: String? { __data["error"] }
        }
      }
    }
  }

}