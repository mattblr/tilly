// @generated
// This file was automatically generated and should not be edited.

@_exported import ApolloAPI
@_spi(Execution) @_spi(Unsafe) import ApolloAPI

extension FoirAPI {
  nonisolated struct MyEditableCaptureTagsQuery: GraphQLQuery {
    static let operationName: String = "MyEditableCaptureTags"
    static let operationDocument: ApolloAPI.OperationDocument = .init(
      definition: .init(
        #"query MyEditableCaptureTags($photo: String, $revision: String, $after: String) { myCaptureCatTags( where: { photoKey: { eq: $photo }, revision: { eq: $revision }, active: { eq: true } } orderBy: [{ positionIndex: ASC }] first: 100 after: $after ) { __typename pageInfo { __typename ...More } edges { __typename node { __typename _id tagKey catKey position bounds vector vectorModel cat { __typename _id name } } } } }"#,
        fragments: [More.self]
      ))

    public var photo: GraphQLNullable<String>
    public var revision: GraphQLNullable<String>
    public var after: GraphQLNullable<String>

    public init(
      photo: GraphQLNullable<String>,
      revision: GraphQLNullable<String>,
      after: GraphQLNullable<String>
    ) {
      self.photo = photo
      self.revision = revision
      self.after = after
    }

    @_spi(Unsafe) public var __variables: Variables? { [
      "photo": photo,
      "revision": revision,
      "after": after
    ] }

    nonisolated struct Data: FoirAPI.SelectionSet {
      let __data: DataDict
      init(_dataDict: DataDict) { __data = _dataDict }

      static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.Query }
      static var __selections: [ApolloAPI.Selection] { [
        .field("myCaptureCatTags", MyCaptureCatTags.self, arguments: [
          "where": [
            "photoKey": ["eq": .variable("photo")],
            "revision": ["eq": .variable("revision")],
            "active": ["eq": true]
          ],
          "orderBy": [["positionIndex": "ASC"]],
          "first": 100,
          "after": .variable("after")
        ]),
      ] }
      static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
        MyEditableCaptureTagsQuery.Data.self
      ] }

      /// The authenticated user's own Capture cat tag records.
      var myCaptureCatTags: MyCaptureCatTags { __data["myCaptureCatTags"] }

      /// MyCaptureCatTags
      ///
      /// Parent Type: `CaptureCatTagConnection`
      nonisolated struct MyCaptureCatTags: FoirAPI.SelectionSet {
        let __data: DataDict
        init(_dataDict: DataDict) { __data = _dataDict }

        static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.CaptureCatTagConnection }
        static var __selections: [ApolloAPI.Selection] { [
          .field("__typename", String.self),
          .field("pageInfo", PageInfo.self),
          .field("edges", [Edge].self),
        ] }
        static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
          MyEditableCaptureTagsQuery.Data.MyCaptureCatTags.self
        ] }

        var pageInfo: PageInfo { __data["pageInfo"] }
        var edges: [Edge] { __data["edges"] }

        /// MyCaptureCatTags.PageInfo
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
            MyEditableCaptureTagsQuery.Data.MyCaptureCatTags.PageInfo.self,
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

        /// MyCaptureCatTags.Edge
        ///
        /// Parent Type: `CaptureCatTagEdge`
        nonisolated struct Edge: FoirAPI.SelectionSet {
          let __data: DataDict
          init(_dataDict: DataDict) { __data = _dataDict }

          static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.CaptureCatTagEdge }
          static var __selections: [ApolloAPI.Selection] { [
            .field("__typename", String.self),
            .field("node", Node.self),
          ] }
          static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
            MyEditableCaptureTagsQuery.Data.MyCaptureCatTags.Edge.self
          ] }

          var node: Node { __data["node"] }

          /// MyCaptureCatTags.Edge.Node
          ///
          /// Parent Type: `CaptureCatTag`
          nonisolated struct Node: FoirAPI.SelectionSet {
            let __data: DataDict
            init(_dataDict: DataDict) { __data = _dataDict }

            static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.CaptureCatTag }
            static var __selections: [ApolloAPI.Selection] { [
              .field("__typename", String.self),
              .field("_id", String.self),
              .field("tagKey", String?.self),
              .field("catKey", String?.self),
              .field("position", FoirAPI.JSON?.self),
              .field("bounds", FoirAPI.JSON?.self),
              .field("vector", FoirAPI.JSON?.self),
              .field("vectorModel", String?.self),
              .field("cat", Cat?.self),
            ] }
            static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
              MyEditableCaptureTagsQuery.Data.MyCaptureCatTags.Edge.Node.self
            ] }

            var _id: String { __data["_id"] }
            var tagKey: String? { __data["tagKey"] }
            var catKey: String? { __data["catKey"] }
            var position: FoirAPI.JSON? { __data["position"] }
            var bounds: FoirAPI.JSON? { __data["bounds"] }
            var vector: FoirAPI.JSON? { __data["vector"] }
            var vectorModel: String? { __data["vectorModel"] }
            var cat: Cat? { __data["cat"] }

            /// MyCaptureCatTags.Edge.Node.Cat
            ///
            /// Parent Type: `Cat`
            nonisolated struct Cat: FoirAPI.SelectionSet {
              let __data: DataDict
              init(_dataDict: DataDict) { __data = _dataDict }

              static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.Cat }
              static var __selections: [ApolloAPI.Selection] { [
                .field("__typename", String.self),
                .field("_id", String.self),
                .field("name", String?.self),
              ] }
              static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
                MyEditableCaptureTagsQuery.Data.MyCaptureCatTags.Edge.Node.Cat.self
              ] }

              var _id: String { __data["_id"] }
              var name: String? { __data["name"] }
            }
          }
        }
      }
    }
  }

}