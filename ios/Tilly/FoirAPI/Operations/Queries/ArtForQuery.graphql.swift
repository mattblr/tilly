// @generated
// This file was automatically generated and should not be edited.

@_exported import ApolloAPI
@_spi(Execution) @_spi(Unsafe) import ApolloAPI

extension FoirAPI {
  nonisolated struct ArtForQuery: GraphQLQuery {
    static let operationName: String = "ArtFor"
    static let operationDocument: ApolloAPI.OperationDocument = .init(
      definition: .init(
        #"query ArtFor($photoKeys: [String], $after: String) { catchArts(where: { photoKey: { in: $photoKeys } }, first: 100, after: $after) { __typename pageInfo { __typename ...More } edges { __typename node { __typename _ownerId photoKey status style art { __typename ...PhotoThumb } } } } }"#,
        fragments: [More.self, PhotoThumb.self]
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
        .field("catchArts", CatchArts.self, arguments: [
          "where": ["photoKey": ["in": .variable("photoKeys")]],
          "first": 100,
          "after": .variable("after")
        ]),
      ] }
      static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
        ArtForQuery.Data.self
      ] }

      /// List Catch art records
      var catchArts: CatchArts { __data["catchArts"] }

      /// CatchArts
      ///
      /// Parent Type: `CatchArtConnection`
      nonisolated struct CatchArts: FoirAPI.SelectionSet {
        let __data: DataDict
        init(_dataDict: DataDict) { __data = _dataDict }

        static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.CatchArtConnection }
        static var __selections: [ApolloAPI.Selection] { [
          .field("__typename", String.self),
          .field("pageInfo", PageInfo.self),
          .field("edges", [Edge].self),
        ] }
        static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
          ArtForQuery.Data.CatchArts.self
        ] }

        var pageInfo: PageInfo { __data["pageInfo"] }
        var edges: [Edge] { __data["edges"] }

        /// CatchArts.PageInfo
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
            ArtForQuery.Data.CatchArts.PageInfo.self,
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

        /// CatchArts.Edge
        ///
        /// Parent Type: `CatchArtEdge`
        nonisolated struct Edge: FoirAPI.SelectionSet {
          let __data: DataDict
          init(_dataDict: DataDict) { __data = _dataDict }

          static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.CatchArtEdge }
          static var __selections: [ApolloAPI.Selection] { [
            .field("__typename", String.self),
            .field("node", Node.self),
          ] }
          static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
            ArtForQuery.Data.CatchArts.Edge.self
          ] }

          var node: Node { __data["node"] }

          /// CatchArts.Edge.Node
          ///
          /// Parent Type: `CatchArt`
          nonisolated struct Node: FoirAPI.SelectionSet {
            let __data: DataDict
            init(_dataDict: DataDict) { __data = _dataDict }

            static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.CatchArt }
            static var __selections: [ApolloAPI.Selection] { [
              .field("__typename", String.self),
              .field("_ownerId", String?.self),
              .field("photoKey", String?.self),
              .field("status", String?.self),
              .field("style", String?.self),
              .field("art", Art?.self),
            ] }
            static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
              ArtForQuery.Data.CatchArts.Edge.Node.self
            ] }

            var _ownerId: String? { __data["_ownerId"] }
            var photoKey: String? { __data["photoKey"] }
            var status: String? { __data["status"] }
            var style: String? { __data["style"] }
            var art: Art? { __data["art"] }

            /// CatchArts.Edge.Node.Art
            ///
            /// Parent Type: `Image`
            nonisolated struct Art: FoirAPI.SelectionSet {
              let __data: DataDict
              init(_dataDict: DataDict) { __data = _dataDict }

              static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.Image }
              static var __selections: [ApolloAPI.Selection] { [
                .field("__typename", String.self),
                .fragment(PhotoThumb.self),
              ] }
              static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
                ArtForQuery.Data.CatchArts.Edge.Node.Art.self,
                PhotoThumb.self
              ] }

              var url: String? { __data["url"] }
              var blurhash: String? { __data["blurhash"] }
              var width: Int? { __data["width"] }
              var height: Int? { __data["height"] }
              /// WebP tier set (universal support). Pair with `avif` in a <picture>.
              var webp: Webp? { __data["webp"] }

              struct Fragments: FragmentContainer {
                let __data: DataDict
                init(_dataDict: DataDict) { __data = _dataDict }

                var photoThumb: PhotoThumb { _toFragment() }
              }

              typealias Webp = PhotoThumb.Webp
            }
          }
        }
      }
    }
  }

}