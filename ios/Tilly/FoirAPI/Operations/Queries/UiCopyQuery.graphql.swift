// @generated
// This file was automatically generated and should not be edited.

@_exported import ApolloAPI
@_spi(Execution) @_spi(Unsafe) import ApolloAPI

extension FoirAPI {
  nonisolated struct UiCopyQuery: GraphQLQuery {
    static let operationName: String = "UiCopy"
    static let operationDocument: ApolloAPI.OperationDocument = .init(
      definition: .init(
        #"query UiCopy($after: String, $locale: String) { uiCopies(first: 100, after: $after, locale: $locale) { __typename pageInfo { __typename ...More } edges { __typename node { __typename _naturalKey entries { __typename key value } } } } }"#,
        fragments: [More.self]
      ))

    public var after: GraphQLNullable<String>
    public var locale: GraphQLNullable<String>

    public init(
      after: GraphQLNullable<String>,
      locale: GraphQLNullable<String>
    ) {
      self.after = after
      self.locale = locale
    }

    @_spi(Unsafe) public var __variables: Variables? { [
      "after": after,
      "locale": locale
    ] }

    nonisolated struct Data: FoirAPI.SelectionSet {
      let __data: DataDict
      init(_dataDict: DataDict) { __data = _dataDict }

      static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.Query }
      static var __selections: [ApolloAPI.Selection] { [
        .field("uiCopies", UiCopies.self, arguments: [
          "first": 100,
          "after": .variable("after"),
          "locale": .variable("locale")
        ]),
      ] }
      static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
        UiCopyQuery.Data.self
      ] }

      /// List UI copy records
      var uiCopies: UiCopies { __data["uiCopies"] }

      /// UiCopies
      ///
      /// Parent Type: `UiCopyConnection`
      nonisolated struct UiCopies: FoirAPI.SelectionSet {
        let __data: DataDict
        init(_dataDict: DataDict) { __data = _dataDict }

        static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.UiCopyConnection }
        static var __selections: [ApolloAPI.Selection] { [
          .field("__typename", String.self),
          .field("pageInfo", PageInfo.self),
          .field("edges", [Edge].self),
        ] }
        static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
          UiCopyQuery.Data.UiCopies.self
        ] }

        var pageInfo: PageInfo { __data["pageInfo"] }
        var edges: [Edge] { __data["edges"] }

        /// UiCopies.PageInfo
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
            UiCopyQuery.Data.UiCopies.PageInfo.self,
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

        /// UiCopies.Edge
        ///
        /// Parent Type: `UiCopyEdge`
        nonisolated struct Edge: FoirAPI.SelectionSet {
          let __data: DataDict
          init(_dataDict: DataDict) { __data = _dataDict }

          static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.UiCopyEdge }
          static var __selections: [ApolloAPI.Selection] { [
            .field("__typename", String.self),
            .field("node", Node.self),
          ] }
          static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
            UiCopyQuery.Data.UiCopies.Edge.self
          ] }

          var node: Node { __data["node"] }

          /// UiCopies.Edge.Node
          ///
          /// Parent Type: `UiCopy`
          nonisolated struct Node: FoirAPI.SelectionSet {
            let __data: DataDict
            init(_dataDict: DataDict) { __data = _dataDict }

            static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.UiCopy }
            static var __selections: [ApolloAPI.Selection] { [
              .field("__typename", String.self),
              .field("_naturalKey", String?.self),
              .field("entries", [Entry?]?.self),
            ] }
            static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
              UiCopyQuery.Data.UiCopies.Edge.Node.self
            ] }

            var _naturalKey: String? { __data["_naturalKey"] }
            var entries: [Entry?]? { __data["entries"] }

            /// UiCopies.Edge.Node.Entry
            ///
            /// Parent Type: `UiCopyEntry`
            nonisolated struct Entry: FoirAPI.SelectionSet {
              let __data: DataDict
              init(_dataDict: DataDict) { __data = _dataDict }

              static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.UiCopyEntry }
              static var __selections: [ApolloAPI.Selection] { [
                .field("__typename", String.self),
                .field("key", String?.self),
                .field("value", String?.self),
              ] }
              static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
                UiCopyQuery.Data.UiCopies.Edge.Node.Entry.self
              ] }

              var key: String? { __data["key"] }
              var value: String? { __data["value"] }
            }
          }
        }
      }
    }
  }

}