// @generated
// This file was automatically generated and should not be edited.

@_exported import ApolloAPI
@_spi(Execution) @_spi(Unsafe) import ApolloAPI

extension FoirAPI {
  nonisolated struct PostsForCapturesQuery: GraphQLQuery {
    static let operationName: String = "PostsForCaptures"
    static let operationDocument: ApolloAPI.OperationDocument = .init(
      definition: .init(
        #"query PostsForCaptures($photoKeys: [String], $after: String) { capturePosts( where: { photoKey: { in: $photoKeys } } orderBy: [{ createdAt: ASC }] first: 100 after: $after ) { __typename pageInfo { __typename ...More } edges { __typename node { __typename ...Post } } } }"#,
        fragments: [More.self, Post.self]
      ))

    public var photoKeys: GraphQLNullable<[String?]>
    public var after: GraphQLNullable<String>

    public init(
      photoKeys: GraphQLNullable<[String?]>,
      after: GraphQLNullable<String>
    ) {
      self.photoKeys = photoKeys
      self.after = after
    }

    @_spi(Unsafe) public var __variables: Variables? { [
      "photoKeys": photoKeys,
      "after": after
    ] }

    nonisolated struct Data: FoirAPI.SelectionSet {
      let __data: DataDict
      init(_dataDict: DataDict) { __data = _dataDict }

      static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.Query }
      static var __selections: [ApolloAPI.Selection] { [
        .field("capturePosts", CapturePosts.self, arguments: [
          "where": ["photoKey": ["in": .variable("photoKeys")]],
          "orderBy": [["createdAt": "ASC"]],
          "first": 100,
          "after": .variable("after")
        ]),
      ] }
      static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
        PostsForCapturesQuery.Data.self
      ] }

      /// List Capture post records
      var capturePosts: CapturePosts { __data["capturePosts"] }

      /// CapturePosts
      ///
      /// Parent Type: `CapturePostConnection`
      nonisolated struct CapturePosts: FoirAPI.SelectionSet {
        let __data: DataDict
        init(_dataDict: DataDict) { __data = _dataDict }

        static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.CapturePostConnection }
        static var __selections: [ApolloAPI.Selection] { [
          .field("__typename", String.self),
          .field("pageInfo", PageInfo.self),
          .field("edges", [Edge].self),
        ] }
        static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
          PostsForCapturesQuery.Data.CapturePosts.self
        ] }

        var pageInfo: PageInfo { __data["pageInfo"] }
        var edges: [Edge] { __data["edges"] }

        /// CapturePosts.PageInfo
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
            PostsForCapturesQuery.Data.CapturePosts.PageInfo.self,
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

        /// CapturePosts.Edge
        ///
        /// Parent Type: `CapturePostEdge`
        nonisolated struct Edge: FoirAPI.SelectionSet {
          let __data: DataDict
          init(_dataDict: DataDict) { __data = _dataDict }

          static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.CapturePostEdge }
          static var __selections: [ApolloAPI.Selection] { [
            .field("__typename", String.self),
            .field("node", Node.self),
          ] }
          static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
            PostsForCapturesQuery.Data.CapturePosts.Edge.self
          ] }

          var node: Node { __data["node"] }

          /// CapturePosts.Edge.Node
          ///
          /// Parent Type: `CapturePost`
          nonisolated struct Node: FoirAPI.SelectionSet {
            let __data: DataDict
            init(_dataDict: DataDict) { __data = _dataDict }

            static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.CapturePost }
            static var __selections: [ApolloAPI.Selection] { [
              .field("__typename", String.self),
              .fragment(Post.self),
            ] }
            static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
              PostsForCapturesQuery.Data.CapturePosts.Edge.Node.self,
              Post.self
            ] }

            var _id: String { __data["_id"] }
            var _createdAt: FoirAPI.DateTime { __data["_createdAt"] }
            var postedAt: FoirAPI.DateTime? { __data["postedAt"] }
            var _ownerId: String? { __data["_ownerId"] }
            var catKey: String? { __data["catKey"] }
            var cat: Cat? { __data["cat"] }
            var photoKey: String? { __data["photoKey"] }
            var area: Area? { __data["area"] }
            var audience: String? { __data["audience"] }
            var note: String? { __data["note"] }
            var reshareOf: String? { __data["reshareOf"] }
            var comment: String? { __data["comment"] }

            struct Fragments: FragmentContainer {
              let __data: DataDict
              init(_dataDict: DataDict) { __data = _dataDict }

              var post: Post { _toFragment() }
            }

            typealias Cat = Post.Cat

            typealias Area = Post.Area
          }
        }
      }
    }
  }

}