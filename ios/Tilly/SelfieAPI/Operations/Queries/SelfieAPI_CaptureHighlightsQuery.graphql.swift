// @generated
// This file was automatically generated and should not be edited.

@_exported import ApolloAPI
@_spi(Execution) @_spi(Unsafe) import ApolloAPI

extension SelfieAPI {
  nonisolated struct CaptureHighlightsQuery: GraphQLQuery {
    static let operationName: String = "CaptureHighlights"
    static let operationDocument: ApolloAPI.OperationDocument = .init(
      definition: .init(
        #"query CaptureHighlights($ids: [ID], $after: String) { capturePhotos( first: 100 after: $after where: { id: { in: $ids }, state: { eq: "ready" } } ) { __typename edges { __typename node { __typename _id challengeHighlights } } pageInfo { __typename hasNextPage endCursor } } }"#
      ))

    public var ids: GraphQLNullable<[ID?]>
    public var after: GraphQLNullable<String>

    public init(
      ids: GraphQLNullable<[ID?]>,
      after: GraphQLNullable<String>
    ) {
      self.ids = ids
      self.after = after
    }

    @_spi(Unsafe) public var __variables: Variables? { [
      "ids": ids,
      "after": after
    ] }

    nonisolated struct Data: SelfieAPI.SelectionSet {
      let __data: DataDict
      init(_dataDict: DataDict) { __data = _dataDict }

      static var __parentType: any ApolloAPI.ParentType { SelfieAPI.Objects.Query }
      static var __selections: [ApolloAPI.Selection] { [
        .field("capturePhotos", CapturePhotos.self, arguments: [
          "first": 100,
          "after": .variable("after"),
          "where": [
            "id": ["in": .variable("ids")],
            "state": ["eq": "ready"]
          ]
        ]),
      ] }
      static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
        CaptureHighlightsQuery.Data.self
      ] }

      /// List Capture photo records
      var capturePhotos: CapturePhotos { __data["capturePhotos"] }

      /// CapturePhotos
      ///
      /// Parent Type: `CapturePhotoConnection`
      nonisolated struct CapturePhotos: SelfieAPI.SelectionSet {
        let __data: DataDict
        init(_dataDict: DataDict) { __data = _dataDict }

        static var __parentType: any ApolloAPI.ParentType { SelfieAPI.Objects.CapturePhotoConnection }
        static var __selections: [ApolloAPI.Selection] { [
          .field("__typename", String.self),
          .field("edges", [Edge].self),
          .field("pageInfo", PageInfo.self),
        ] }
        static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
          CaptureHighlightsQuery.Data.CapturePhotos.self
        ] }

        var edges: [Edge] { __data["edges"] }
        var pageInfo: PageInfo { __data["pageInfo"] }

        /// CapturePhotos.Edge
        ///
        /// Parent Type: `CapturePhotoEdge`
        nonisolated struct Edge: SelfieAPI.SelectionSet {
          let __data: DataDict
          init(_dataDict: DataDict) { __data = _dataDict }

          static var __parentType: any ApolloAPI.ParentType { SelfieAPI.Objects.CapturePhotoEdge }
          static var __selections: [ApolloAPI.Selection] { [
            .field("__typename", String.self),
            .field("node", Node.self),
          ] }
          static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
            CaptureHighlightsQuery.Data.CapturePhotos.Edge.self
          ] }

          var node: Node { __data["node"] }

          /// CapturePhotos.Edge.Node
          ///
          /// Parent Type: `CapturePhoto`
          nonisolated struct Node: SelfieAPI.SelectionSet {
            let __data: DataDict
            init(_dataDict: DataDict) { __data = _dataDict }

            static var __parentType: any ApolloAPI.ParentType { SelfieAPI.Objects.CapturePhoto }
            static var __selections: [ApolloAPI.Selection] { [
              .field("__typename", String.self),
              .field("_id", String.self),
              .field("challengeHighlights", SelfieAPI.JSON?.self),
            ] }
            static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
              CaptureHighlightsQuery.Data.CapturePhotos.Edge.Node.self
            ] }

            var _id: String { __data["_id"] }
            var challengeHighlights: SelfieAPI.JSON? { __data["challengeHighlights"] }
          }
        }

        /// CapturePhotos.PageInfo
        ///
        /// Parent Type: `PageInfo`
        nonisolated struct PageInfo: SelfieAPI.SelectionSet {
          let __data: DataDict
          init(_dataDict: DataDict) { __data = _dataDict }

          static var __parentType: any ApolloAPI.ParentType { SelfieAPI.Objects.PageInfo }
          static var __selections: [ApolloAPI.Selection] { [
            .field("__typename", String.self),
            .field("hasNextPage", Bool.self),
            .field("endCursor", String?.self),
          ] }
          static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
            CaptureHighlightsQuery.Data.CapturePhotos.PageInfo.self
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