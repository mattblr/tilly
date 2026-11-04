// @generated
// This file was automatically generated and should not be edited.

@_exported import ApolloAPI
@_spi(Execution) @_spi(Unsafe) import ApolloAPI

extension FoirAPI {
  nonisolated struct RequestsToMeQuery: GraphQLQuery {
    static let operationName: String = "RequestsToMe"
    static let operationDocument: ApolloAPI.OperationDocument = .init(
      definition: .init(
        #"query RequestsToMe($meText: String, $after: String) { followRequests( where: { followeeId: { eq: $meText } } first: 100 after: $after ) { __typename pageInfo { __typename ...More } edges { __typename node { __typename _id _ownerId } } } }"#,
        fragments: [More.self]
      ))

    public var meText: GraphQLNullable<String>
    public var after: GraphQLNullable<String>

    public init(
      meText: GraphQLNullable<String>,
      after: GraphQLNullable<String>
    ) {
      self.meText = meText
      self.after = after
    }

    @_spi(Unsafe) public var __variables: Variables? { [
      "meText": meText,
      "after": after
    ] }

    nonisolated struct Data: FoirAPI.SelectionSet {
      let __data: DataDict
      init(_dataDict: DataDict) { __data = _dataDict }

      static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.Query }
      static var __selections: [ApolloAPI.Selection] { [
        .field("followRequests", FollowRequests.self, arguments: [
          "where": ["followeeId": ["eq": .variable("meText")]],
          "first": 100,
          "after": .variable("after")
        ]),
      ] }
      static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
        RequestsToMeQuery.Data.self
      ] }

      /// List Follow request records
      var followRequests: FollowRequests { __data["followRequests"] }

      /// FollowRequests
      ///
      /// Parent Type: `FollowRequestConnection`
      nonisolated struct FollowRequests: FoirAPI.SelectionSet {
        let __data: DataDict
        init(_dataDict: DataDict) { __data = _dataDict }

        static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.FollowRequestConnection }
        static var __selections: [ApolloAPI.Selection] { [
          .field("__typename", String.self),
          .field("pageInfo", PageInfo.self),
          .field("edges", [Edge].self),
        ] }
        static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
          RequestsToMeQuery.Data.FollowRequests.self
        ] }

        var pageInfo: PageInfo { __data["pageInfo"] }
        var edges: [Edge] { __data["edges"] }

        /// FollowRequests.PageInfo
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
            RequestsToMeQuery.Data.FollowRequests.PageInfo.self,
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

        /// FollowRequests.Edge
        ///
        /// Parent Type: `FollowRequestEdge`
        nonisolated struct Edge: FoirAPI.SelectionSet {
          let __data: DataDict
          init(_dataDict: DataDict) { __data = _dataDict }

          static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.FollowRequestEdge }
          static var __selections: [ApolloAPI.Selection] { [
            .field("__typename", String.self),
            .field("node", Node.self),
          ] }
          static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
            RequestsToMeQuery.Data.FollowRequests.Edge.self
          ] }

          var node: Node { __data["node"] }

          /// FollowRequests.Edge.Node
          ///
          /// Parent Type: `FollowRequest`
          nonisolated struct Node: FoirAPI.SelectionSet {
            let __data: DataDict
            init(_dataDict: DataDict) { __data = _dataDict }

            static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.FollowRequest }
            static var __selections: [ApolloAPI.Selection] { [
              .field("__typename", String.self),
              .field("_id", String.self),
              .field("_ownerId", String?.self),
            ] }
            static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
              RequestsToMeQuery.Data.FollowRequests.Edge.Node.self
            ] }

            var _id: String { __data["_id"] }
            var _ownerId: String? { __data["_ownerId"] }
          }
        }
      }
    }
  }

}