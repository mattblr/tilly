// @generated
// This file was automatically generated and should not be edited.

@_exported import ApolloAPI
@_spi(Execution) @_spi(Unsafe) import ApolloAPI

extension FoirAPI {
  nonisolated struct MatchingCatTagsQuery: GraphQLQuery {
    static let operationName: String = "MatchingCatTags"
    static let operationDocument: ApolloAPI.OperationDocument = .init(
      definition: .init(
        #"query MatchingCatTags($keys: [ID], $after: String) { captureCatTags( where: { id: { in: $keys }, active: { eq: true } } first: 100 after: $after ) { __typename pageInfo { __typename ...More } edges { __typename node { __typename _id _ownerId photoKey catKey revision vector vectorModel cat { __typename _id name } capture { __typename ...CanonicalMedia } } } } }"#,
        fragments: [CanonicalMedia.self, More.self, PhotoThumb.self]
      ))

    public var keys: GraphQLNullable<[ID?]>
    public var after: GraphQLNullable<String>

    public init(
      keys: GraphQLNullable<[ID?]>,
      after: GraphQLNullable<String>
    ) {
      self.keys = keys
      self.after = after
    }

    @_spi(Unsafe) public var __variables: Variables? { [
      "keys": keys,
      "after": after
    ] }

    nonisolated struct Data: FoirAPI.SelectionSet {
      let __data: DataDict
      init(_dataDict: DataDict) { __data = _dataDict }

      static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.Query }
      static var __selections: [ApolloAPI.Selection] { [
        .field("captureCatTags", CaptureCatTags.self, arguments: [
          "where": [
            "id": ["in": .variable("keys")],
            "active": ["eq": true]
          ],
          "first": 100,
          "after": .variable("after")
        ]),
      ] }
      static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
        MatchingCatTagsQuery.Data.self
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
          .field("pageInfo", PageInfo.self),
          .field("edges", [Edge].self),
        ] }
        static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
          MatchingCatTagsQuery.Data.CaptureCatTags.self
        ] }

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
            MatchingCatTagsQuery.Data.CaptureCatTags.PageInfo.self,
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
            MatchingCatTagsQuery.Data.CaptureCatTags.Edge.self
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
              .field("photoKey", String?.self),
              .field("catKey", String?.self),
              .field("revision", String?.self),
              .field("vector", FoirAPI.JSON?.self),
              .field("vectorModel", String?.self),
              .field("cat", Cat?.self),
              .field("capture", Capture?.self),
            ] }
            static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
              MatchingCatTagsQuery.Data.CaptureCatTags.Edge.Node.self
            ] }

            var _id: String { __data["_id"] }
            var _ownerId: String? { __data["_ownerId"] }
            var photoKey: String? { __data["photoKey"] }
            var catKey: String? { __data["catKey"] }
            var revision: String? { __data["revision"] }
            var vector: FoirAPI.JSON? { __data["vector"] }
            var vectorModel: String? { __data["vectorModel"] }
            var cat: Cat? { __data["cat"] }
            var capture: Capture? { __data["capture"] }

            /// CaptureCatTags.Edge.Node.Cat
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
                MatchingCatTagsQuery.Data.CaptureCatTags.Edge.Node.Cat.self
              ] }

              var _id: String { __data["_id"] }
              var name: String? { __data["name"] }
            }

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
                MatchingCatTagsQuery.Data.CaptureCatTags.Edge.Node.Capture.self,
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