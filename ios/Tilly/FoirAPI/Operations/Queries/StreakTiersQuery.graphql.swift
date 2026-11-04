// @generated
// This file was automatically generated and should not be edited.

@_exported import ApolloAPI
@_spi(Execution) @_spi(Unsafe) import ApolloAPI

extension FoirAPI {
  nonisolated struct StreakTiersQuery: GraphQLQuery {
    static let operationName: String = "StreakTiers"
    static let operationDocument: ApolloAPI.OperationDocument = .init(
      definition: .init(
        #"query StreakTiers($after: String, $locale: String) { streakTiers( orderBy: [{ days: ASC }] first: 100 after: $after locale: $locale ) { __typename pageInfo { __typename ...More } edges { __typename node { __typename _id days name symbol stylePrompt animated } } } }"#,
        fragments: [More.self]
      ))

    public var after: GraphQLNullable<String>
    public var locale: GraphQLNullable<String>

    public init(
      after: GraphQLNullable<String>,
      locale: GraphQLNullable<String>
    ) {
      self.after = after
      self.locale = locale
    }

    @_spi(Unsafe) public var __variables: Variables? { [
      "after": after,
      "locale": locale
    ] }

    nonisolated struct Data: FoirAPI.SelectionSet {
      let __data: DataDict
      init(_dataDict: DataDict) { __data = _dataDict }

      static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.Query }
      static var __selections: [ApolloAPI.Selection] { [
        .field("streakTiers", StreakTiers.self, arguments: [
          "orderBy": [["days": "ASC"]],
          "first": 100,
          "after": .variable("after"),
          "locale": .variable("locale")
        ]),
      ] }
      static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
        StreakTiersQuery.Data.self
      ] }

      /// List Streak tier records
      var streakTiers: StreakTiers { __data["streakTiers"] }

      /// StreakTiers
      ///
      /// Parent Type: `StreakTierConnection`
      nonisolated struct StreakTiers: FoirAPI.SelectionSet {
        let __data: DataDict
        init(_dataDict: DataDict) { __data = _dataDict }

        static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.StreakTierConnection }
        static var __selections: [ApolloAPI.Selection] { [
          .field("__typename", String.self),
          .field("pageInfo", PageInfo.self),
          .field("edges", [Edge].self),
        ] }
        static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
          StreakTiersQuery.Data.StreakTiers.self
        ] }

        var pageInfo: PageInfo { __data["pageInfo"] }
        var edges: [Edge] { __data["edges"] }

        /// StreakTiers.PageInfo
        ///
        /// Parent Type: `PageInfo`
        nonisolated struct PageInfo: FoirAPI.SelectionSet {
          let __data: DataDict
          init(_dataDict: DataDict) { __data = _dataDict }

          static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.PageInfo }
          static var __selections: [ApolloAPI.Selection] { [
            .field("__typename", String.self),
            .fragment(More.self),
          ] }
          static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
            StreakTiersQuery.Data.StreakTiers.PageInfo.self,
            More.self
          ] }

          /// True when a forward fetch (after the current page's end) would yield more rows.
          var hasNextPage: Bool { __data["hasNextPage"] }
          /// Cursor for the last row in this page; null when the page is empty.
          var endCursor: String? { __data["endCursor"] }

          struct Fragments: FragmentContainer {
            let __data: DataDict
            init(_dataDict: DataDict) { __data = _dataDict }

            var more: More { _toFragment() }
          }
        }

        /// StreakTiers.Edge
        ///
        /// Parent Type: `StreakTierEdge`
        nonisolated struct Edge: FoirAPI.SelectionSet {
          let __data: DataDict
          init(_dataDict: DataDict) { __data = _dataDict }

          static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.StreakTierEdge }
          static var __selections: [ApolloAPI.Selection] { [
            .field("__typename", String.self),
            .field("node", Node.self),
          ] }
          static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
            StreakTiersQuery.Data.StreakTiers.Edge.self
          ] }

          var node: Node { __data["node"] }

          /// StreakTiers.Edge.Node
          ///
          /// Parent Type: `StreakTier`
          nonisolated struct Node: FoirAPI.SelectionSet {
            let __data: DataDict
            init(_dataDict: DataDict) { __data = _dataDict }

            static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.StreakTier }
            static var __selections: [ApolloAPI.Selection] { [
              .field("__typename", String.self),
              .field("_id", String.self),
              .field("days", Int?.self),
              .field("name", String?.self),
              .field("symbol", String?.self),
              .field("stylePrompt", String?.self),
              .field("animated", Bool?.self),
            ] }
            static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
              StreakTiersQuery.Data.StreakTiers.Edge.Node.self
            ] }

            var _id: String { __data["_id"] }
            var days: Int? { __data["days"] }
            var name: String? { __data["name"] }
            var symbol: String? { __data["symbol"] }
            var stylePrompt: String? { __data["stylePrompt"] }
            var animated: Bool? { __data["animated"] }
          }
        }
      }
    }
  }

}