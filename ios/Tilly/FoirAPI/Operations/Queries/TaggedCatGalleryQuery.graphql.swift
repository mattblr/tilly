// @generated
// This file was automatically generated and should not be edited.

@_exported import ApolloAPI
@_spi(Execution) @_spi(Unsafe) import ApolloAPI

extension FoirAPI {
  nonisolated struct TaggedCatGalleryQuery: GraphQLQuery {
    static let operationName: String = "TaggedCatGallery"
    static let operationDocument: ApolloAPI.OperationDocument = .init(
      definition: .init(
        #"query TaggedCatGallery($catKey: String, $after: String) { captureCatTags( where: { catKey: { eq: $catKey }, active: { eq: true } } orderBy: [{ capturedAt: DESC }] first: 20 after: $after ) { __typename totalCount pageInfo { __typename ...More } edges { __typename node { __typename _id _ownerId revision capture { __typename ...CanonicalMedia } } } } }"#,
        fragments: [CanonicalMedia.self, More.self, PhotoThumb.self]
      ))

    public var catKey: GraphQLNullable<String>
    public var after: GraphQLNullable<String>

    public init(
      catKey: GraphQLNullable<String>,
      after: GraphQLNullable<String>
    ) {
      self.catKey = catKey
      self.after = after
    }

    @_spi(Unsafe) public var __variables: Variables? { [
      "catKey": catKey,
      "after": after
    ] }

    nonisolated struct Data: FoirAPI.SelectionSet {
      let __data: DataDict
      init(_dataDict: DataDict) { __data = _dataDict }

      static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.Query }
      static var __selections: [ApolloAPI.Selection] { [
        .field("captureCatTags", CaptureCatTags.self, arguments: [
          "where": [
            "catKey": ["eq": .variable("catKey")],
            "active": ["eq": true]
          ],
          "orderBy": [["capturedAt": "DESC"]],
          "first": 20,
          "after": .variable("after")
        ]),
      ] }
      static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
        TaggedCatGalleryQuery.Data.self
      ] }

      /// List Capture cat tag records
      var captureCatTags: CaptureCatTags { __data["captureCatTags"] }

      /// CaptureCatTags
      ///
      /// Parent Type: `CaptureCatTagConnection`
      nonisolated struct CaptureCatTags: FoirAPI.SelectionSet {
        let __data: DataDict
        init(_dataDict: DataDict) { __data = _dataDict }

        static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.CaptureCatTagConnection }
        static var __selections: [ApolloAPI.Selection] { [
          .field("__typename", String.self),
          .field("totalCount", Int.self),
          .field("pageInfo", PageInfo.self),
          .field("edges", [Edge].self),
        ] }
        static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
          TaggedCatGalleryQuery.Data.CaptureCatTags.self
        ] }

        /// Total rows matching the where clause, ignoring pagination.
        var totalCount: Int { __data["totalCount"] }
        var pageInfo: PageInfo { __data["pageInfo"] }
        var edges: [Edge] { __data["edges"] }

        /// CaptureCatTags.PageInfo
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
            TaggedCatGalleryQuery.Data.CaptureCatTags.PageInfo.self,
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

        /// CaptureCatTags.Edge
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
            TaggedCatGalleryQuery.Data.CaptureCatTags.Edge.self
          ] }

          var node: Node { __data["node"] }

          /// CaptureCatTags.Edge.Node
          ///
          /// Parent Type: `CaptureCatTag`
          nonisolated struct Node: FoirAPI.SelectionSet {
            let __data: DataDict
            init(_dataDict: DataDict) { __data = _dataDict }

            static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.CaptureCatTag }
            static var __selections: [ApolloAPI.Selection] { [
              .field("__typename", String.self),
              .field("_id", String.self),
              .field("_ownerId", String?.self),
              .field("revision", String?.self),
              .field("capture", Capture?.self),
            ] }
            static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
              TaggedCatGalleryQuery.Data.CaptureCatTags.Edge.Node.self
            ] }

            var _id: String { __data["_id"] }
            var _ownerId: String? { __data["_ownerId"] }
            var revision: String? { __data["revision"] }
            var capture: Capture? { __data["capture"] }

            /// CaptureCatTags.Edge.Node.Capture
            ///
            /// Parent Type: `CapturePhoto`
            nonisolated struct Capture: FoirAPI.SelectionSet {
              let __data: DataDict
              init(_dataDict: DataDict) { __data = _dataDict }

              static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.CapturePhoto }
              static var __selections: [ApolloAPI.Selection] { [
                .field("__typename", String.self),
                .fragment(CanonicalMedia.self),
              ] }
              static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
                TaggedCatGalleryQuery.Data.CaptureCatTags.Edge.Node.Capture.self,
                CanonicalMedia.self
              ] }

              var _id: String { __data["_id"] }
              var _ownerId: String? { __data["_ownerId"] }
              var _createdAt: FoirAPI.DateTime { __data["_createdAt"] }
              var state: String? { __data["state"] }
              var tagRevision: String? { __data["tagRevision"] }
              var catKey: String? { __data["catKey"] }
              var area: Area? { __data["area"] }
              var photo: Photo? { __data["photo"] }

              struct Fragments: FragmentContainer {
                let __data: DataDict
                init(_dataDict: DataDict) { __data = _dataDict }

                var canonicalMedia: CanonicalMedia { _toFragment() }
              }

              typealias Area = CanonicalMedia.Area

              typealias Photo = CanonicalMedia.Photo
            }
          }
        }
      }
    }
  }

}