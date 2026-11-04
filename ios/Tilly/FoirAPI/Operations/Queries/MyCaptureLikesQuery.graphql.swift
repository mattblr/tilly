// @generated
// This file was automatically generated and should not be edited.

@_exported import ApolloAPI
@_spi(Execution) @_spi(Unsafe) import ApolloAPI

extension FoirAPI {
  nonisolated struct MyCaptureLikesQuery: GraphQLQuery {
    static let operationName: String = "MyCaptureLikes"
    static let operationDocument: ApolloAPI.OperationDocument = .init(
      definition: .init(
        #"query MyCaptureLikes($photoKeys: [String], $me: ID, $after: String) { captureLikes( where: { photoKey: { in: $photoKeys }, ownerId: { eq: $me } } first: 100 after: $after ) { __typename pageInfo { __typename ...More } edges { __typename node { __typename photoKey } } } }"#,
        fragments: [More.self]
      ))

    public var photoKeys: GraphQLNullable<[String?]>
    public var me: GraphQLNullable<ID>
    public var after: GraphQLNullable<String>

    public init(
      photoKeys: GraphQLNullable<[String?]>,
      me: GraphQLNullable<ID>,
      after: GraphQLNullable<String>
    ) {
      self.photoKeys = photoKeys
      self.me = me
      self.after = after
    }

    @_spi(Unsafe) public var __variables: Variables? { [
      "photoKeys": photoKeys,
      "me": me,
      "after": after
    ] }

    nonisolated struct Data: FoirAPI.SelectionSet {
      let __data: DataDict
      init(_dataDict: DataDict) { __data = _dataDict }

      static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.Query }
      static var __selections: [ApolloAPI.Selection] { [
        .field("captureLikes", CaptureLikes.self, arguments: [
          "where": [
            "photoKey": ["in": .variable("photoKeys")],
            "ownerId": ["eq": .variable("me")]
          ],
          "first": 100,
          "after": .variable("after")
        ]),
      ] }
      static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
        MyCaptureLikesQuery.Data.self
      ] }

      /// List Capture like records
      var captureLikes: CaptureLikes { __data["captureLikes"] }

      /// CaptureLikes
      ///
      /// Parent Type: `CaptureLikeConnection`
      nonisolated struct CaptureLikes: FoirAPI.SelectionSet {
        let __data: DataDict
        init(_dataDict: DataDict) { __data = _dataDict }

        static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.CaptureLikeConnection }
        static var __selections: [ApolloAPI.Selection] { [
          .field("__typename", String.self),
          .field("pageInfo", PageInfo.self),
          .field("edges", [Edge].self),
        ] }
        static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
          MyCaptureLikesQuery.Data.CaptureLikes.self
        ] }

        var pageInfo: PageInfo { __data["pageInfo"] }
        var edges: [Edge] { __data["edges"] }

        /// CaptureLikes.PageInfo
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
            MyCaptureLikesQuery.Data.CaptureLikes.PageInfo.self,
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

        /// CaptureLikes.Edge
        ///
        /// Parent Type: `CaptureLikeEdge`
        nonisolated struct Edge: FoirAPI.SelectionSet {
          let __data: DataDict
          init(_dataDict: DataDict) { __data = _dataDict }

          static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.CaptureLikeEdge }
          static var __selections: [ApolloAPI.Selection] { [
            .field("__typename", String.self),
            .field("node", Node.self),
          ] }
          static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
            MyCaptureLikesQuery.Data.CaptureLikes.Edge.self
          ] }

          var node: Node { __data["node"] }

          /// CaptureLikes.Edge.Node
          ///
          /// Parent Type: `CaptureLike`
          nonisolated struct Node: FoirAPI.SelectionSet {
            let __data: DataDict
            init(_dataDict: DataDict) { __data = _dataDict }

            static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.CaptureLike }
            static var __selections: [ApolloAPI.Selection] { [
              .field("__typename", String.self),
              .field("photoKey", String?.self),
            ] }
            static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
              MyCaptureLikesQuery.Data.CaptureLikes.Edge.Node.self
            ] }

            var photoKey: String? { __data["photoKey"] }
          }
        }
      }
    }
  }

}