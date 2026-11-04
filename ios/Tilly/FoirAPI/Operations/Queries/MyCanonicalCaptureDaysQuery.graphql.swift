// @generated
// This file was automatically generated and should not be edited.

@_exported import ApolloAPI
@_spi(Execution) @_spi(Unsafe) import ApolloAPI

extension FoirAPI {
  nonisolated struct MyCanonicalCaptureDaysQuery: GraphQLQuery {
    static let operationName: String = "MyCanonicalCaptureDays"
    static let operationDocument: ApolloAPI.OperationDocument = .init(
      definition: .init(
        #"query MyCanonicalCaptureDays($after: String) { myCapturePhotos( where: { state: { eq: "ready" } } orderBy: [{ createdAt: DESC }] first: 100 after: $after ) { __typename pageInfo { __typename ...More } edges { __typename node { __typename _id _createdAt } } } }"#,
        fragments: [More.self]
      ))

    public var after: GraphQLNullable<String>

    public init(after: GraphQLNullable<String>) {
      self.after = after
    }

    @_spi(Unsafe) public var __variables: Variables? { ["after": after] }

    nonisolated struct Data: FoirAPI.SelectionSet {
      let __data: DataDict
      init(_dataDict: DataDict) { __data = _dataDict }

      static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.Query }
      static var __selections: [ApolloAPI.Selection] { [
        .field("myCapturePhotos", MyCapturePhotos.self, arguments: [
          "where": ["state": ["eq": "ready"]],
          "orderBy": [["createdAt": "DESC"]],
          "first": 100,
          "after": .variable("after")
        ]),
      ] }
      static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
        MyCanonicalCaptureDaysQuery.Data.self
      ] }

      /// The authenticated user's own Capture photo records.
      var myCapturePhotos: MyCapturePhotos { __data["myCapturePhotos"] }

      /// MyCapturePhotos
      ///
      /// Parent Type: `CapturePhotoConnection`
      nonisolated struct MyCapturePhotos: FoirAPI.SelectionSet {
        let __data: DataDict
        init(_dataDict: DataDict) { __data = _dataDict }

        static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.CapturePhotoConnection }
        static var __selections: [ApolloAPI.Selection] { [
          .field("__typename", String.self),
          .field("pageInfo", PageInfo.self),
          .field("edges", [Edge].self),
        ] }
        static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
          MyCanonicalCaptureDaysQuery.Data.MyCapturePhotos.self
        ] }

        var pageInfo: PageInfo { __data["pageInfo"] }
        var edges: [Edge] { __data["edges"] }

        /// MyCapturePhotos.PageInfo
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
            MyCanonicalCaptureDaysQuery.Data.MyCapturePhotos.PageInfo.self,
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

        /// MyCapturePhotos.Edge
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
            MyCanonicalCaptureDaysQuery.Data.MyCapturePhotos.Edge.self
          ] }

          var node: Node { __data["node"] }

          /// MyCapturePhotos.Edge.Node
          ///
          /// Parent Type: `CapturePhoto`
          nonisolated struct Node: FoirAPI.SelectionSet {
            let __data: DataDict
            init(_dataDict: DataDict) { __data = _dataDict }

            static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.CapturePhoto }
            static var __selections: [ApolloAPI.Selection] { [
              .field("__typename", String.self),
              .field("_id", String.self),
              .field("_createdAt", FoirAPI.DateTime.self),
            ] }
            static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
              MyCanonicalCaptureDaysQuery.Data.MyCapturePhotos.Edge.Node.self
            ] }

            var _id: String { __data["_id"] }
            var _createdAt: FoirAPI.DateTime { __data["_createdAt"] }
          }
        }
      }
    }
  }

}