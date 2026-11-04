// @generated
// This file was automatically generated and should not be edited.

@_exported import ApolloAPI
@_spi(Execution) @_spi(Unsafe) import ApolloAPI

extension FoirAPI {
  nonisolated struct NotesForCapturesQuery: GraphQLQuery {
    static let operationName: String = "NotesForCaptures"
    static let operationDocument: ApolloAPI.OperationDocument = .init(
      definition: .init(
        #"query NotesForCaptures($photoKeys: [String], $after: String) { fieldNotes( where: { photoKey: { in: $photoKeys } } orderBy: [{ createdAt: ASC }] first: 100 after: $after ) { __typename pageInfo { __typename ...More } edges { __typename node { __typename _id _createdAt _ownerId photoKey tags text } } } }"#,
        fragments: [More.self]
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
        .field("fieldNotes", FieldNotes.self, arguments: [
          "where": ["photoKey": ["in": .variable("photoKeys")]],
          "orderBy": [["createdAt": "ASC"]],
          "first": 100,
          "after": .variable("after")
        ]),
      ] }
      static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
        NotesForCapturesQuery.Data.self
      ] }

      /// List Field note records
      var fieldNotes: FieldNotes { __data["fieldNotes"] }

      /// FieldNotes
      ///
      /// Parent Type: `FieldNoteConnection`
      nonisolated struct FieldNotes: FoirAPI.SelectionSet {
        let __data: DataDict
        init(_dataDict: DataDict) { __data = _dataDict }

        static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.FieldNoteConnection }
        static var __selections: [ApolloAPI.Selection] { [
          .field("__typename", String.self),
          .field("pageInfo", PageInfo.self),
          .field("edges", [Edge].self),
        ] }
        static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
          NotesForCapturesQuery.Data.FieldNotes.self
        ] }

        var pageInfo: PageInfo { __data["pageInfo"] }
        var edges: [Edge] { __data["edges"] }

        /// FieldNotes.PageInfo
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
            NotesForCapturesQuery.Data.FieldNotes.PageInfo.self,
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

        /// FieldNotes.Edge
        ///
        /// Parent Type: `FieldNoteEdge`
        nonisolated struct Edge: FoirAPI.SelectionSet {
          let __data: DataDict
          init(_dataDict: DataDict) { __data = _dataDict }

          static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.FieldNoteEdge }
          static var __selections: [ApolloAPI.Selection] { [
            .field("__typename", String.self),
            .field("node", Node.self),
          ] }
          static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
            NotesForCapturesQuery.Data.FieldNotes.Edge.self
          ] }

          var node: Node { __data["node"] }

          /// FieldNotes.Edge.Node
          ///
          /// Parent Type: `FieldNote`
          nonisolated struct Node: FoirAPI.SelectionSet {
            let __data: DataDict
            init(_dataDict: DataDict) { __data = _dataDict }

            static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.FieldNote }
            static var __selections: [ApolloAPI.Selection] { [
              .field("__typename", String.self),
              .field("_id", String.self),
              .field("_createdAt", FoirAPI.DateTime.self),
              .field("_ownerId", String?.self),
              .field("photoKey", String?.self),
              .field("tags", FoirAPI.JSON?.self),
              .field("text", String?.self),
            ] }
            static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
              NotesForCapturesQuery.Data.FieldNotes.Edge.Node.self
            ] }

            var _id: String { __data["_id"] }
            var _createdAt: FoirAPI.DateTime { __data["_createdAt"] }
            var _ownerId: String? { __data["_ownerId"] }
            var photoKey: String? { __data["photoKey"] }
            var tags: FoirAPI.JSON? { __data["tags"] }
            var text: String? { __data["text"] }
          }
        }
      }
    }
  }

}