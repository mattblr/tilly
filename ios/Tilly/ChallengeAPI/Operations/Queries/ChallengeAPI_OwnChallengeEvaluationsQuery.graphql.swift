// @generated
// This file was automatically generated and should not be edited.

@_exported import ApolloAPI
@_spi(Execution) @_spi(Unsafe) import ApolloAPI

extension ChallengeAPI {
  nonisolated struct OwnChallengeEvaluationsQuery: GraphQLQuery {
    static let operationName: String = "OwnChallengeEvaluations"
    static let operationDocument: ApolloAPI.OperationDocument = .init(
      definition: .init(
        #"query OwnChallengeEvaluations($captureId: String, $after: String) { myChallengeEvaluations( first: 100 after: $after where: { captureId: { eq: $captureId } } ) { __typename edges { __typename node { __typename _id _ownerId challengeKey challengeVersion captureId status reasonCode attemptCount retryCount } } pageInfo { __typename hasNextPage endCursor } } }"#
      ))

    public var captureId: GraphQLNullable<String>
    public var after: GraphQLNullable<String>

    public init(
      captureId: GraphQLNullable<String>,
      after: GraphQLNullable<String>
    ) {
      self.captureId = captureId
      self.after = after
    }

    @_spi(Unsafe) public var __variables: Variables? { [
      "captureId": captureId,
      "after": after
    ] }

    nonisolated struct Data: ChallengeAPI.SelectionSet {
      let __data: DataDict
      init(_dataDict: DataDict) { __data = _dataDict }

      static var __parentType: any ApolloAPI.ParentType { ChallengeAPI.Objects.Query }
      static var __selections: [ApolloAPI.Selection] { [
        .field("myChallengeEvaluations", MyChallengeEvaluations.self, arguments: [
          "first": 100,
          "after": .variable("after"),
          "where": ["captureId": ["eq": .variable("captureId")]]
        ]),
      ] }
      static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
        OwnChallengeEvaluationsQuery.Data.self
      ] }

      /// The authenticated user's own Private challenge evaluation records.
      var myChallengeEvaluations: MyChallengeEvaluations { __data["myChallengeEvaluations"] }

      /// MyChallengeEvaluations
      ///
      /// Parent Type: `ChallengeEvaluationConnection`
      nonisolated struct MyChallengeEvaluations: ChallengeAPI.SelectionSet {
        let __data: DataDict
        init(_dataDict: DataDict) { __data = _dataDict }

        static var __parentType: any ApolloAPI.ParentType { ChallengeAPI.Objects.ChallengeEvaluationConnection }
        static var __selections: [ApolloAPI.Selection] { [
          .field("__typename", String.self),
          .field("edges", [Edge].self),
          .field("pageInfo", PageInfo.self),
        ] }
        static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
          OwnChallengeEvaluationsQuery.Data.MyChallengeEvaluations.self
        ] }

        var edges: [Edge] { __data["edges"] }
        var pageInfo: PageInfo { __data["pageInfo"] }

        /// MyChallengeEvaluations.Edge
        ///
        /// Parent Type: `ChallengeEvaluationEdge`
        nonisolated struct Edge: ChallengeAPI.SelectionSet {
          let __data: DataDict
          init(_dataDict: DataDict) { __data = _dataDict }

          static var __parentType: any ApolloAPI.ParentType { ChallengeAPI.Objects.ChallengeEvaluationEdge }
          static var __selections: [ApolloAPI.Selection] { [
            .field("__typename", String.self),
            .field("node", Node.self),
          ] }
          static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
            OwnChallengeEvaluationsQuery.Data.MyChallengeEvaluations.Edge.self
          ] }

          var node: Node { __data["node"] }

          /// MyChallengeEvaluations.Edge.Node
          ///
          /// Parent Type: `ChallengeEvaluation`
          nonisolated struct Node: ChallengeAPI.SelectionSet {
            let __data: DataDict
            init(_dataDict: DataDict) { __data = _dataDict }

            static var __parentType: any ApolloAPI.ParentType { ChallengeAPI.Objects.ChallengeEvaluation }
            static var __selections: [ApolloAPI.Selection] { [
              .field("__typename", String.self),
              .field("_id", String.self),
              .field("_ownerId", String?.self),
              .field("challengeKey", String?.self),
              .field("challengeVersion", String?.self),
              .field("captureId", String?.self),
              .field("status", String?.self),
              .field("reasonCode", String?.self),
              .field("attemptCount", Int?.self),
              .field("retryCount", Int?.self),
            ] }
            static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
              OwnChallengeEvaluationsQuery.Data.MyChallengeEvaluations.Edge.Node.self
            ] }

            var _id: String { __data["_id"] }
            var _ownerId: String? { __data["_ownerId"] }
            var challengeKey: String? { __data["challengeKey"] }
            var challengeVersion: String? { __data["challengeVersion"] }
            var captureId: String? { __data["captureId"] }
            var status: String? { __data["status"] }
            var reasonCode: String? { __data["reasonCode"] }
            var attemptCount: Int? { __data["attemptCount"] }
            var retryCount: Int? { __data["retryCount"] }
          }
        }

        /// MyChallengeEvaluations.PageInfo
        ///
        /// Parent Type: `PageInfo`
        nonisolated struct PageInfo: ChallengeAPI.SelectionSet {
          let __data: DataDict
          init(_dataDict: DataDict) { __data = _dataDict }

          static var __parentType: any ApolloAPI.ParentType { ChallengeAPI.Objects.PageInfo }
          static var __selections: [ApolloAPI.Selection] { [
            .field("__typename", String.self),
            .field("hasNextPage", Bool.self),
            .field("endCursor", String?.self),
          ] }
          static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
            OwnChallengeEvaluationsQuery.Data.MyChallengeEvaluations.PageInfo.self
          ] }

          /// True when a forward fetch (after the current page's end) would yield more rows.
          var hasNextPage: Bool { __data["hasNextPage"] }
          /// Cursor for the last row in this page; null when the page is empty.
          var endCursor: String? { __data["endCursor"] }
        }
      }
    }
  }

}