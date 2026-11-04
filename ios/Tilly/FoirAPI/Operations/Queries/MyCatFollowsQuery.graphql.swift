// @generated
// This file was automatically generated and should not be edited.

@_exported import ApolloAPI
@_spi(Execution) @_spi(Unsafe) import ApolloAPI

extension FoirAPI {
  nonisolated struct MyCatFollowsQuery: GraphQLQuery {
    static let operationName: String = "MyCatFollows"
    static let operationDocument: ApolloAPI.OperationDocument = .init(
      definition: .init(
        #"query MyCatFollows($after: String) { myCatFollows(first: 100, after: $after) { __typename pageInfo { __typename ...More } edges { __typename node { __typename catKey } } } }"#,
        fragments: [More.self]
      ))

    public var after: GraphQLNullable<String>

    public init(after: GraphQLNullable<String>) {
      self.after = after
    }

    @_spi(Unsafe) public var __variables: Variables? { ["after": after] }

    nonisolated struct Data: FoirAPI.SelectionSet {
      let __data: DataDict
      init(_dataDict: DataDict) { __data = _dataDict }

      static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.Query }
      static var __selections: [ApolloAPI.Selection] { [
        .field("myCatFollows", MyCatFollows.self, arguments: [
          "first": 100,
          "after": .variable("after")
        ]),
      ] }
      static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
        MyCatFollowsQuery.Data.self
      ] }

      /// The authenticated user's own Cat follow records.
      var myCatFollows: MyCatFollows { __data["myCatFollows"] }

      /// MyCatFollows
      ///
      /// Parent Type: `CatFollowConnection`
      nonisolated struct MyCatFollows: FoirAPI.SelectionSet {
        let __data: DataDict
        init(_dataDict: DataDict) { __data = _dataDict }

        static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.CatFollowConnection }
        static var __selections: [ApolloAPI.Selection] { [
          .field("__typename", String.self),
          .field("pageInfo", PageInfo.self),
          .field("edges", [Edge].self),
        ] }
        static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
          MyCatFollowsQuery.Data.MyCatFollows.self
        ] }

        var pageInfo: PageInfo { __data["pageInfo"] }
        var edges: [Edge] { __data["edges"] }

        /// MyCatFollows.PageInfo
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
            MyCatFollowsQuery.Data.MyCatFollows.PageInfo.self,
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

        /// MyCatFollows.Edge
        ///
        /// Parent Type: `CatFollowEdge`
        nonisolated struct Edge: FoirAPI.SelectionSet {
          let __data: DataDict
          init(_dataDict: DataDict) { __data = _dataDict }

          static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.CatFollowEdge }
          static var __selections: [ApolloAPI.Selection] { [
            .field("__typename", String.self),
            .field("node", Node.self),
          ] }
          static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
            MyCatFollowsQuery.Data.MyCatFollows.Edge.self
          ] }

          var node: Node { __data["node"] }

          /// MyCatFollows.Edge.Node
          ///
          /// Parent Type: `CatFollow`
          nonisolated struct Node: FoirAPI.SelectionSet {
            let __data: DataDict
            init(_dataDict: DataDict) { __data = _dataDict }

            static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.CatFollow }
            static var __selections: [ApolloAPI.Selection] { [
              .field("__typename", String.self),
              .field("catKey", String?.self),
            ] }
            static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
              MyCatFollowsQuery.Data.MyCatFollows.Edge.Node.self
            ] }

            var catKey: String? { __data["catKey"] }
          }
        }
      }
    }
  }

}