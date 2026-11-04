// @generated
// This file was automatically generated and should not be edited.

@_exported import ApolloAPI
@_spi(Execution) @_spi(Unsafe) import ApolloAPI

extension ChallengeAPI {
  nonisolated struct OwnChallengeAwardsQuery: GraphQLQuery {
    static let operationName: String = "OwnChallengeAwards"
    static let operationDocument: ApolloAPI.OperationDocument = .init(
      definition: .init(
        #"query OwnChallengeAwards($after: String) { myChallengeAwards(first: 100, after: $after) { __typename edges { __typename node { __typename _id _ownerId challengeKey challengeVersion title icon progress targetCount active earnedAt } } pageInfo { __typename hasNextPage endCursor } } }"#
      ))

    public var after: GraphQLNullable<String>

    public init(after: GraphQLNullable<String>) {
      self.after = after
    }

    @_spi(Unsafe) public var __variables: Variables? { ["after": after] }

    nonisolated struct Data: ChallengeAPI.SelectionSet {
      let __data: DataDict
      init(_dataDict: DataDict) { __data = _dataDict }

      static var __parentType: any ApolloAPI.ParentType { ChallengeAPI.Objects.Query }
      static var __selections: [ApolloAPI.Selection] { [
        .field("myChallengeAwards", MyChallengeAwards.self, arguments: [
          "first": 100,
          "after": .variable("after")
        ]),
      ] }
      static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
        OwnChallengeAwardsQuery.Data.self
      ] }

      /// The authenticated user's own Private earned challenge badge records.
      var myChallengeAwards: MyChallengeAwards { __data["myChallengeAwards"] }

      /// MyChallengeAwards
      ///
      /// Parent Type: `ChallengeAwardConnection`
      nonisolated struct MyChallengeAwards: ChallengeAPI.SelectionSet {
        let __data: DataDict
        init(_dataDict: DataDict) { __data = _dataDict }

        static var __parentType: any ApolloAPI.ParentType { ChallengeAPI.Objects.ChallengeAwardConnection }
        static var __selections: [ApolloAPI.Selection] { [
          .field("__typename", String.self),
          .field("edges", [Edge].self),
          .field("pageInfo", PageInfo.self),
        ] }
        static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
          OwnChallengeAwardsQuery.Data.MyChallengeAwards.self
        ] }

        var edges: [Edge] { __data["edges"] }
        var pageInfo: PageInfo { __data["pageInfo"] }

        /// MyChallengeAwards.Edge
        ///
        /// Parent Type: `ChallengeAwardEdge`
        nonisolated struct Edge: ChallengeAPI.SelectionSet {
          let __data: DataDict
          init(_dataDict: DataDict) { __data = _dataDict }

          static var __parentType: any ApolloAPI.ParentType { ChallengeAPI.Objects.ChallengeAwardEdge }
          static var __selections: [ApolloAPI.Selection] { [
            .field("__typename", String.self),
            .field("node", Node.self),
          ] }
          static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
            OwnChallengeAwardsQuery.Data.MyChallengeAwards.Edge.self
          ] }

          var node: Node { __data["node"] }

          /// MyChallengeAwards.Edge.Node
          ///
          /// Parent Type: `ChallengeAward`
          nonisolated struct Node: ChallengeAPI.SelectionSet {
            let __data: DataDict
            init(_dataDict: DataDict) { __data = _dataDict }

            static var __parentType: any ApolloAPI.ParentType { ChallengeAPI.Objects.ChallengeAward }
            static var __selections: [ApolloAPI.Selection] { [
              .field("__typename", String.self),
              .field("_id", String.self),
              .field("_ownerId", String?.self),
              .field("challengeKey", String?.self),
              .field("challengeVersion", String?.self),
              .field("title", String?.self),
              .field("icon", String?.self),
              .field("progress", Int?.self),
              .field("targetCount", Int?.self),
              .field("active", Bool?.self),
              .field("earnedAt", ChallengeAPI.DateTime?.self),
            ] }
            static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
              OwnChallengeAwardsQuery.Data.MyChallengeAwards.Edge.Node.self
            ] }

            var _id: String { __data["_id"] }
            var _ownerId: String? { __data["_ownerId"] }
            var challengeKey: String? { __data["challengeKey"] }
            var challengeVersion: String? { __data["challengeVersion"] }
            var title: String? { __data["title"] }
            var icon: String? { __data["icon"] }
            var progress: Int? { __data["progress"] }
            var targetCount: Int? { __data["targetCount"] }
            var active: Bool? { __data["active"] }
            var earnedAt: ChallengeAPI.DateTime? { __data["earnedAt"] }
          }
        }

        /// MyChallengeAwards.PageInfo
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
            OwnChallengeAwardsQuery.Data.MyChallengeAwards.PageInfo.self
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