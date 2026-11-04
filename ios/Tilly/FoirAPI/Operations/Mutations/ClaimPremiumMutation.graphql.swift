// @generated
// This file was automatically generated and should not be edited.

@_exported import ApolloAPI
@_spi(Execution) @_spi(Unsafe) import ApolloAPI

extension FoirAPI {
  nonisolated struct ClaimPremiumMutation: GraphQLMutation {
    static let operationName: String = "ClaimPremium"
    static let operationDocument: ApolloAPI.OperationDocument = .init(
      definition: .init(
        #"mutation ClaimPremium { executeTillyClaimPremium { __typename result { __typename ok active error } execution { __typename id status error } } }"#
      ))

    public init() {}

    nonisolated struct Data: FoirAPI.SelectionSet {
      let __data: DataDict
      init(_dataDict: DataDict) { __data = _dataDict }

      static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.Mutation }
      static var __selections: [ApolloAPI.Selection] { [
        .field("executeTillyClaimPremium", ExecuteTillyClaimPremium?.self),
      ] }
      static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
        ClaimPremiumMutation.Data.self
      ] }

      /// Execute the Claim Premium operation
      var executeTillyClaimPremium: ExecuteTillyClaimPremium? { __data["executeTillyClaimPremium"] }

      /// ExecuteTillyClaimPremium
      ///
      /// Parent Type: `ExecuteTillyClaimPremiumPayload`
      nonisolated struct ExecuteTillyClaimPremium: FoirAPI.SelectionSet {
        let __data: DataDict
        init(_dataDict: DataDict) { __data = _dataDict }

        static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.ExecuteTillyClaimPremiumPayload }
        static var __selections: [ApolloAPI.Selection] { [
          .field("__typename", String.self),
          .field("result", Result?.self),
          .field("execution", Execution.self),
        ] }
        static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
          ClaimPremiumMutation.Data.ExecuteTillyClaimPremium.self
        ] }

        /// Typed result; populated on SYNC completion, null on ASYNC dispatch.
        var result: Result? { __data["result"] }
        /// Execution row. Use execution.id to subscribe on operationTillyClaimPremiumExecution.
        var execution: Execution { __data["execution"] }

        /// ExecuteTillyClaimPremium.Result
        ///
        /// Parent Type: `TillyClaimPremiumOutput`
        nonisolated struct Result: FoirAPI.SelectionSet {
          let __data: DataDict
          init(_dataDict: DataDict) { __data = _dataDict }

          static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.TillyClaimPremiumOutput }
          static var __selections: [ApolloAPI.Selection] { [
            .field("__typename", String.self),
            .field("ok", Bool?.self),
            .field("active", Bool?.self),
            .field("error", String?.self),
          ] }
          static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
            ClaimPremiumMutation.Data.ExecuteTillyClaimPremium.Result.self
          ] }

          var ok: Bool? { __data["ok"] }
          var active: Bool? { __data["active"] }
          var error: String? { __data["error"] }
        }

        /// ExecuteTillyClaimPremium.Execution
        ///
        /// Parent Type: `OperationExecution`
        nonisolated struct Execution: FoirAPI.SelectionSet {
          let __data: DataDict
          init(_dataDict: DataDict) { __data = _dataDict }

          static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.OperationExecution }
          static var __selections: [ApolloAPI.Selection] { [
            .field("__typename", String.self),
            .field("id", String.self),
            .field("status", GraphQLEnum<FoirAPI.OperationExecutionStatus>.self),
            .field("error", String?.self),
          ] }
          static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
            ClaimPremiumMutation.Data.ExecuteTillyClaimPremium.Execution.self
          ] }

          var id: String { __data["id"] }
          var status: GraphQLEnum<FoirAPI.OperationExecutionStatus> { __data["status"] }
          var error: String? { __data["error"] }
        }
      }
    }
  }

}