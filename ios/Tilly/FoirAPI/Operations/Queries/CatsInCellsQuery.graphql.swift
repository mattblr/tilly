// @generated
// This file was automatically generated and should not be edited.

@_exported import ApolloAPI
@_spi(Execution) @_spi(Unsafe) import ApolloAPI

extension FoirAPI {
  nonisolated struct CatsInCellsQuery: GraphQLQuery {
    static let operationName: String = "CatsInCells"
    static let operationDocument: ApolloAPI.OperationDocument = .init(
      definition: .init(
        #"query CatsInCells($where: CatWhereInput, $after: String) { cats(where: $where, first: 100, after: $after) { __typename pageInfo { __typename ...More } edges { __typename node { __typename _id } } } }"#,
        fragments: [More.self]
      ))

    public var `where`: GraphQLNullable<CatWhereInput>
    public var after: GraphQLNullable<String>

    public init(
      `where`: GraphQLNullable<CatWhereInput>,
      after: GraphQLNullable<String>
    ) {
      self.`where` = `where`
      self.after = after
    }

    @_spi(Unsafe) public var __variables: Variables? { [
      "where": `where`,
      "after": after
    ] }

    nonisolated struct Data: FoirAPI.SelectionSet {
      let __data: DataDict
      init(_dataDict: DataDict) { __data = _dataDict }

      static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.Query }
      static var __selections: [ApolloAPI.Selection] { [
        .field("cats", Cats.self, arguments: [
          "where": .variable("where"),
          "first": 100,
          "after": .variable("after")
        ]),
      ] }
      static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
        CatsInCellsQuery.Data.self
      ] }

      /// List Cat records
      var cats: Cats { __data["cats"] }

      /// Cats
      ///
      /// Parent Type: `CatConnection`
      nonisolated struct Cats: FoirAPI.SelectionSet {
        let __data: DataDict
        init(_dataDict: DataDict) { __data = _dataDict }

        static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.CatConnection }
        static var __selections: [ApolloAPI.Selection] { [
          .field("__typename", String.self),
          .field("pageInfo", PageInfo.self),
          .field("edges", [Edge].self),
        ] }
        static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
          CatsInCellsQuery.Data.Cats.self
        ] }

        var pageInfo: PageInfo { __data["pageInfo"] }
        var edges: [Edge] { __data["edges"] }

        /// Cats.PageInfo
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
            CatsInCellsQuery.Data.Cats.PageInfo.self,
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

        /// Cats.Edge
        ///
        /// Parent Type: `CatEdge`
        nonisolated struct Edge: FoirAPI.SelectionSet {
          let __data: DataDict
          init(_dataDict: DataDict) { __data = _dataDict }

          static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.CatEdge }
          static var __selections: [ApolloAPI.Selection] { [
            .field("__typename", String.self),
            .field("node", Node.self),
          ] }
          static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
            CatsInCellsQuery.Data.Cats.Edge.self
          ] }

          var node: Node { __data["node"] }

          /// Cats.Edge.Node
          ///
          /// Parent Type: `Cat`
          nonisolated struct Node: FoirAPI.SelectionSet {
            let __data: DataDict
            init(_dataDict: DataDict) { __data = _dataDict }

            static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.Cat }
            static var __selections: [ApolloAPI.Selection] { [
              .field("__typename", String.self),
              .field("_id", String.self),
            ] }
            static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
              CatsInCellsQuery.Data.Cats.Edge.Node.self
            ] }

            var _id: String { __data["_id"] }
          }
        }
      }
    }
  }

}