// @generated
// This file was automatically generated and should not be edited.

@_exported import ApolloAPI
@_spi(Execution) @_spi(Unsafe) import ApolloAPI

extension FoirAPI {
  nonisolated struct FollowersOfQuery: GraphQLQuery {
    static let operationName: String = "FollowersOf"
    static let operationDocument: ApolloAPI.OperationDocument = .init(
      definition: .init(
        #"query FollowersOf($user: ID, $after: String) { followApprovals( where: { ownerId: { eq: $user }, status: { eq: "accepted" } } first: 100 after: $after ) { __typename pageInfo { __typename ...More } edges { __typename node { __typename followerId } } } }"#,
        fragments: [More.self]
      ))

    public var user: GraphQLNullable<ID>
    public var after: GraphQLNullable<String>

    public init(
      user: GraphQLNullable<ID>,
      after: GraphQLNullable<String>
    ) {
      self.user = user
      self.after = after
    }

    @_spi(Unsafe) public var __variables: Variables? { [
      "user": user,
      "after": after
    ] }

    nonisolated struct Data: FoirAPI.SelectionSet {
      let __data: DataDict
      init(_dataDict: DataDict) { __data = _dataDict }

      static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.Query }
      static var __selections: [ApolloAPI.Selection] { [
        .field("followApprovals", FollowApprovals.self, arguments: [
          "where": [
            "ownerId": ["eq": .variable("user")],
            "status": ["eq": "accepted"]
          ],
          "first": 100,
          "after": .variable("after")
        ]),
      ] }
      static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
        FollowersOfQuery.Data.self
      ] }

      /// List Follow approval records
      var followApprovals: FollowApprovals { __data["followApprovals"] }

      /// FollowApprovals
      ///
      /// Parent Type: `FollowApprovalConnection`
      nonisolated struct FollowApprovals: FoirAPI.SelectionSet {
        let __data: DataDict
        init(_dataDict: DataDict) { __data = _dataDict }

        static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.FollowApprovalConnection }
        static var __selections: [ApolloAPI.Selection] { [
          .field("__typename", String.self),
          .field("pageInfo", PageInfo.self),
          .field("edges", [Edge].self),
        ] }
        static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
          FollowersOfQuery.Data.FollowApprovals.self
        ] }

        var pageInfo: PageInfo { __data["pageInfo"] }
        var edges: [Edge] { __data["edges"] }

        /// FollowApprovals.PageInfo
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
            FollowersOfQuery.Data.FollowApprovals.PageInfo.self,
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

        /// FollowApprovals.Edge
        ///
        /// Parent Type: `FollowApprovalEdge`
        nonisolated struct Edge: FoirAPI.SelectionSet {
          let __data: DataDict
          init(_dataDict: DataDict) { __data = _dataDict }

          static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.FollowApprovalEdge }
          static var __selections: [ApolloAPI.Selection] { [
            .field("__typename", String.self),
            .field("node", Node.self),
          ] }
          static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
            FollowersOfQuery.Data.FollowApprovals.Edge.self
          ] }

          var node: Node { __data["node"] }

          /// FollowApprovals.Edge.Node
          ///
          /// Parent Type: `FollowApproval`
          nonisolated struct Node: FoirAPI.SelectionSet {
            let __data: DataDict
            init(_dataDict: DataDict) { __data = _dataDict }

            static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.FollowApproval }
            static var __selections: [ApolloAPI.Selection] { [
              .field("__typename", String.self),
              .field("followerId", String?.self),
            ] }
            static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
              FollowersOfQuery.Data.FollowApprovals.Edge.Node.self
            ] }

            var followerId: String? { __data["followerId"] }
          }
        }
      }
    }
  }

}