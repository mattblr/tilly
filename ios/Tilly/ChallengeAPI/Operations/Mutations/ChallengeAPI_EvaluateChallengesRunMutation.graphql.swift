// @generated
// This file was automatically generated and should not be edited.

@_exported import ApolloAPI
@_spi(Execution) @_spi(Unsafe) import ApolloAPI

extension ChallengeAPI {
  nonisolated struct EvaluateChallengesRunMutation: GraphQLMutation {
    static let operationName: String = "EvaluateChallengesRun"
    static let operationDocument: ApolloAPI.OperationDocument = .init(
      definition: .init(
        #"mutation EvaluateChallengesRun($input: TillyEvaluateChallengesInput!, $key: String!) { executeEvaluateChallenges: executeTillyEvaluateChallenges( input: $input mode: ASYNC idempotencyKey: $key ) { __typename execution { __typename id operationKey status error result } } }"#
      ))

    public var input: TillyEvaluateChallengesInput
    public var key: String

    public init(
      input: TillyEvaluateChallengesInput,
      key: String
    ) {
      self.input = input
      self.key = key
    }

    @_spi(Unsafe) public var __variables: Variables? { [
      "input": input,
      "key": key
    ] }

    nonisolated struct Data: ChallengeAPI.SelectionSet {
      let __data: DataDict
      init(_dataDict: DataDict) { __data = _dataDict }

      static var __parentType: any ApolloAPI.ParentType { ChallengeAPI.Objects.Mutation }
      static var __selections: [ApolloAPI.Selection] { [
        .field("executeTillyEvaluateChallenges", alias: "executeEvaluateChallenges", ExecuteEvaluateChallenges?.self, arguments: [
          "input": .variable("input"),
          "mode": "ASYNC",
          "idempotencyKey": .variable("key")
        ]),
      ] }
      static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
        EvaluateChallengesRunMutation.Data.self
      ] }

      /// Execute the Evaluate photo challenges operation
      var executeEvaluateChallenges: ExecuteEvaluateChallenges? { __data["executeEvaluateChallenges"] }

      /// ExecuteEvaluateChallenges
      ///
      /// Parent Type: `ExecuteTillyEvaluateChallengesPayload`
      nonisolated struct ExecuteEvaluateChallenges: ChallengeAPI.SelectionSet {
        let __data: DataDict
        init(_dataDict: DataDict) { __data = _dataDict }

        static var __parentType: any ApolloAPI.ParentType { ChallengeAPI.Objects.ExecuteTillyEvaluateChallengesPayload }
        static var __selections: [ApolloAPI.Selection] { [
          .field("__typename", String.self),
          .field("execution", Execution.self),
        ] }
        static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
          EvaluateChallengesRunMutation.Data.ExecuteEvaluateChallenges.self
        ] }

        /// Execution row. Use execution.id to subscribe on operationTillyEvaluateChallengesExecution.
        var execution: Execution { __data["execution"] }

        /// ExecuteEvaluateChallenges.Execution
        ///
        /// Parent Type: `OperationExecution`
        nonisolated struct Execution: ChallengeAPI.SelectionSet {
          let __data: DataDict
          init(_dataDict: DataDict) { __data = _dataDict }

          static var __parentType: any ApolloAPI.ParentType { ChallengeAPI.Objects.OperationExecution }
          static var __selections: [ApolloAPI.Selection] { [
            .field("__typename", String.self),
            .field("id", String.self),
            .field("operationKey", String.self),
            .field("status", GraphQLEnum<ChallengeAPI.OperationExecutionStatus>.self),
            .field("error", String?.self),
            .field("result", ChallengeAPI.JSON?.self),
          ] }
          static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
            EvaluateChallengesRunMutation.Data.ExecuteEvaluateChallenges.Execution.self
          ] }

          var id: String { __data["id"] }
          var operationKey: String { __data["operationKey"] }
          var status: GraphQLEnum<ChallengeAPI.OperationExecutionStatus> { __data["status"] }
          var error: String? { __data["error"] }
          var result: ChallengeAPI.JSON? { __data["result"] }
        }
      }
    }
  }

}