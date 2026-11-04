// @generated
// This file was automatically generated and should not be edited.

@_exported import ApolloAPI
@_spi(Execution) @_spi(Unsafe) import ApolloAPI

extension FoirAPI {
  nonisolated struct CanonicalPhotosQuery: GraphQLQuery {
    static let operationName: String = "CanonicalPhotos"
    static let operationDocument: ApolloAPI.OperationDocument = .init(
      definition: .init(
        #"query CanonicalPhotos($keys: [ID], $after: String) { capturePhotos( where: { id: { in: $keys }, state: { eq: "ready" } } first: 100 after: $after ) { __typename pageInfo { __typename ...More } edges { __typename node { __typename ...CanonicalMedia } } } }"#,
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
        .field("capturePhotos", CapturePhotos.self, arguments: [
          "where": [
            "id": ["in": .variable("keys")],
            "state": ["eq": "ready"]
          ],
          "first": 100,
          "after": .variable("after")
        ]),
      ] }
      static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
        CanonicalPhotosQuery.Data.self
      ] }

      /// List Capture photo records
      var capturePhotos: CapturePhotos { __data["capturePhotos"] }

      /// CapturePhotos
      ///
      /// Parent Type: `CapturePhotoConnection`
      nonisolated struct CapturePhotos: FoirAPI.SelectionSet {
        let __data: DataDict
        init(_dataDict: DataDict) { __data = _dataDict }

        static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.CapturePhotoConnection }
        static var __selections: [ApolloAPI.Selection] { [
          .field("__typename", String.self),
          .field("pageInfo", PageInfo.self),
          .field("edges", [Edge].self),
        ] }
        static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
          CanonicalPhotosQuery.Data.CapturePhotos.self
        ] }

        var pageInfo: PageInfo { __data["pageInfo"] }
        var edges: [Edge] { __data["edges"] }

        /// CapturePhotos.PageInfo
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
            CanonicalPhotosQuery.Data.CapturePhotos.PageInfo.self,
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

        /// CapturePhotos.Edge
        ///
        /// Parent Type: `CapturePhotoEdge`
        nonisolated struct Edge: FoirAPI.SelectionSet {
          let __data: DataDict
          init(_dataDict: DataDict) { __data = _dataDict }

          static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.CapturePhotoEdge }
          static var __selections: [ApolloAPI.Selection] { [
            .field("__typename", String.self),
            .field("node", Node.self),
          ] }
          static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
            CanonicalPhotosQuery.Data.CapturePhotos.Edge.self
          ] }

          var node: Node { __data["node"] }

          /// CapturePhotos.Edge.Node
          ///
          /// Parent Type: `CapturePhoto`
          nonisolated struct Node: FoirAPI.SelectionSet {
            let __data: DataDict
            init(_dataDict: DataDict) { __data = _dataDict }

            static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.CapturePhoto }
            static var __selections: [ApolloAPI.Selection] { [
              .field("__typename", String.self),
              .fragment(CanonicalMedia.self),
            ] }
            static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
              CanonicalPhotosQuery.Data.CapturePhotos.Edge.Node.self,
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