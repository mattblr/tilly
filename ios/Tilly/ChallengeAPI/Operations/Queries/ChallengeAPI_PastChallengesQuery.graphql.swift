// @generated
// This file was automatically generated and should not be edited.

@_exported import ApolloAPI
@_spi(Execution) @_spi(Unsafe) import ApolloAPI

extension ChallengeAPI {
  nonisolated struct PastChallengesQuery: GraphQLQuery {
    static let operationName: String = "PastChallenges"
    static let operationDocument: ApolloAPI.OperationDocument = .init(
      definition: .init(
        #"query PastChallenges($now: DateTime, $after: String) { photoChallenges( first: 20 after: $after orderBy: [{ createdAt: DESC }] where: { endsAt: { lt: $now }, enabled: { eq: true } } ) { __typename edges { __typename node { __typename _naturalKey title description badge { __typename url } enabled startsAt endsAt criteriaVersion targetCount } } pageInfo { __typename hasNextPage endCursor } } }"#
      ))

    public var now: GraphQLNullable<DateTime>
    public var after: GraphQLNullable<String>

    public init(
      now: GraphQLNullable<DateTime>,
      after: GraphQLNullable<String>
    ) {
      self.now = now
      self.after = after
    }

    @_spi(Unsafe) public var __variables: Variables? { [
      "now": now,
      "after": after
    ] }

    nonisolated struct Data: ChallengeAPI.SelectionSet {
      let __data: DataDict
      init(_dataDict: DataDict) { __data = _dataDict }

      static var __parentType: any ApolloAPI.ParentType { ChallengeAPI.Objects.Query }
      static var __selections: [ApolloAPI.Selection] { [
        .field("photoChallenges", PhotoChallenges.self, arguments: [
          "first": 20,
          "after": .variable("after"),
          "orderBy": [["createdAt": "DESC"]],
          "where": [
            "endsAt": ["lt": .variable("now")],
            "enabled": ["eq": true]
          ]
        ]),
      ] }
      static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
        PastChallengesQuery.Data.self
      ] }

      /// List Photo challenge records
      var photoChallenges: PhotoChallenges { __data["photoChallenges"] }

      /// PhotoChallenges
      ///
      /// Parent Type: `PhotoChallengeConnection`
      nonisolated struct PhotoChallenges: ChallengeAPI.SelectionSet {
        let __data: DataDict
        init(_dataDict: DataDict) { __data = _dataDict }

        static var __parentType: any ApolloAPI.ParentType { ChallengeAPI.Objects.PhotoChallengeConnection }
        static var __selections: [ApolloAPI.Selection] { [
          .field("__typename", String.self),
          .field("edges", [Edge].self),
          .field("pageInfo", PageInfo.self),
        ] }
        static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
          PastChallengesQuery.Data.PhotoChallenges.self
        ] }

        var edges: [Edge] { __data["edges"] }
        var pageInfo: PageInfo { __data["pageInfo"] }

        /// PhotoChallenges.Edge
        ///
        /// Parent Type: `PhotoChallengeEdge`
        nonisolated struct Edge: ChallengeAPI.SelectionSet {
          let __data: DataDict
          init(_dataDict: DataDict) { __data = _dataDict }

          static var __parentType: any ApolloAPI.ParentType { ChallengeAPI.Objects.PhotoChallengeEdge }
          static var __selections: [ApolloAPI.Selection] { [
            .field("__typename", String.self),
            .field("node", Node.self),
          ] }
          static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
            PastChallengesQuery.Data.PhotoChallenges.Edge.self
          ] }

          var node: Node { __data["node"] }

          /// PhotoChallenges.Edge.Node
          ///
          /// Parent Type: `PhotoChallenge`
          nonisolated struct Node: ChallengeAPI.SelectionSet {
            let __data: DataDict
            init(_dataDict: DataDict) { __data = _dataDict }

            static var __parentType: any ApolloAPI.ParentType { ChallengeAPI.Objects.PhotoChallenge }
            static var __selections: [ApolloAPI.Selection] { [
              .field("__typename", String.self),
              .field("_naturalKey", String?.self),
              .field("title", String?.self),
              .field("description", String?.self),
              .field("badge", Badge?.self),
              .field("enabled", Bool?.self),
              .field("startsAt", ChallengeAPI.DateTime?.self),
              .field("endsAt", ChallengeAPI.DateTime?.self),
              .field("criteriaVersion", String?.self),
              .field("targetCount", Int?.self),
            ] }
            static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
              PastChallengesQuery.Data.PhotoChallenges.Edge.Node.self
            ] }

            var _naturalKey: String? { __data["_naturalKey"] }
            var title: String? { __data["title"] }
            var description: String? { __data["description"] }
            var badge: Badge? { __data["badge"] }
            var enabled: Bool? { __data["enabled"] }
            var startsAt: ChallengeAPI.DateTime? { __data["startsAt"] }
            var endsAt: ChallengeAPI.DateTime? { __data["endsAt"] }
            var criteriaVersion: String? { __data["criteriaVersion"] }
            var targetCount: Int? { __data["targetCount"] }

            /// PhotoChallenges.Edge.Node.Badge
            ///
            /// Parent Type: `Image`
            nonisolated struct Badge: ChallengeAPI.SelectionSet {
              let __data: DataDict
              init(_dataDict: DataDict) { __data = _dataDict }

              static var __parentType: any ApolloAPI.ParentType { ChallengeAPI.Objects.Image }
              static var __selections: [ApolloAPI.Selection] { [
                .field("__typename", String.self),
                .field("url", String?.self),
              ] }
              static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
                PastChallengesQuery.Data.PhotoChallenges.Edge.Node.Badge.self
              ] }

              var url: String? { __data["url"] }
            }
          }
        }

        /// PhotoChallenges.PageInfo
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
            PastChallengesQuery.Data.PhotoChallenges.PageInfo.self
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