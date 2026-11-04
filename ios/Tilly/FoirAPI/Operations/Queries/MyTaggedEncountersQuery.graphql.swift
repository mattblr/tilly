// @generated
// This file was automatically generated and should not be edited.

@_exported import ApolloAPI
@_spi(Execution) @_spi(Unsafe) import ApolloAPI

extension FoirAPI {
  nonisolated struct MyTaggedEncountersQuery: GraphQLQuery {
    static let operationName: String = "MyTaggedEncounters"
    static let operationDocument: ApolloAPI.OperationDocument = .init(
      definition: .init(
        #"query MyTaggedEncounters($catKey: String, $after: String) { myCaptureCatTags( where: { catKey: { eq: $catKey }, active: { eq: true } } first: 100 after: $after ) { __typename pageInfo { __typename ...More } edges { __typename node { __typename _ownerId revision capture { __typename _id _ownerId state tagRevision } } } } }"#,
        fragments: [More.self]
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
        .field("myCaptureCatTags", MyCaptureCatTags.self, arguments: [
          "where": [
            "catKey": ["eq": .variable("catKey")],
            "active": ["eq": true]
          ],
          "first": 100,
          "after": .variable("after")
        ]),
      ] }
      static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
        MyTaggedEncountersQuery.Data.self
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
          MyTaggedEncountersQuery.Data.MyCaptureCatTags.self
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
            MyTaggedEncountersQuery.Data.MyCaptureCatTags.PageInfo.self,
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
            MyTaggedEncountersQuery.Data.MyCaptureCatTags.Edge.self
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
              .field("_ownerId", String?.self),
              .field("revision", String?.self),
              .field("capture", Capture?.self),
            ] }
            static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
              MyTaggedEncountersQuery.Data.MyCaptureCatTags.Edge.Node.self
            ] }

            var _ownerId: String? { __data["_ownerId"] }
            var revision: String? { __data["revision"] }
            var capture: Capture? { __data["capture"] }

            /// MyCaptureCatTags.Edge.Node.Capture
            ///
            /// Parent Type: `CapturePhoto`
            nonisolated struct Capture: FoirAPI.SelectionSet {
              let __data: DataDict
              init(_dataDict: DataDict) { __data = _dataDict }

              static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.CapturePhoto }
              static var __selections: [ApolloAPI.Selection] { [
                .field("__typename", String.self),
                .field("_id", String.self),
                .field("_ownerId", String?.self),
                .field("state", String?.self),
                .field("tagRevision", String?.self),
              ] }
              static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
                MyTaggedEncountersQuery.Data.MyCaptureCatTags.Edge.Node.Capture.self
              ] }

              var _id: String { __data["_id"] }
              var _ownerId: String? { __data["_ownerId"] }
              var state: String? { __data["state"] }
              var tagRevision: String? { __data["tagRevision"] }
            }
          }
        }
      }
    }
  }

}