// @generated
// This file was automatically generated and should not be edited.

@_exported import ApolloAPI
@_spi(Execution) @_spi(Unsafe) import ApolloAPI

extension SafetyAPI {
  nonisolated struct BlockedAccountsQuery: GraphQLQuery {
    static let operationName: String = "BlockedAccounts"
    static let operationDocument: ApolloAPI.OperationDocument = .init(
      definition: .init(
        #"query BlockedAccounts($after: String) { myUserBlocks(first: 100, after: $after) { __typename edges { __typename node { __typename _id blockedUserId } } pageInfo { __typename hasNextPage endCursor } } }"#
      ))

    public var after: GraphQLNullable<String>

    public init(after: GraphQLNullable<String>) {
      self.after = after
    }

    @_spi(Unsafe) public var __variables: Variables? { ["after": after] }

    nonisolated struct Data: SafetyAPI.SelectionSet {
      let __data: DataDict
      init(_dataDict: DataDict) { __data = _dataDict }

      static var __parentType: any ApolloAPI.ParentType { SafetyAPI.Objects.Query }
      static var __selections: [ApolloAPI.Selection] { [
        .field("myUserBlocks", MyUserBlocks.self, arguments: [
          "first": 100,
          "after": .variable("after")
        ]),
      ] }
      static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
        BlockedAccountsQuery.Data.self
      ] }

      /// The authenticated user's own User block records.
      var myUserBlocks: MyUserBlocks { __data["myUserBlocks"] }

      /// MyUserBlocks
      ///
      /// Parent Type: `UserBlockConnection`
      nonisolated struct MyUserBlocks: SafetyAPI.SelectionSet {
        let __data: DataDict
        init(_dataDict: DataDict) { __data = _dataDict }

        static var __parentType: any ApolloAPI.ParentType { SafetyAPI.Objects.UserBlockConnection }
        static var __selections: [ApolloAPI.Selection] { [
          .field("__typename", String.self),
          .field("edges", [Edge].self),
          .field("pageInfo", PageInfo.self),
        ] }
        static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
          BlockedAccountsQuery.Data.MyUserBlocks.self
        ] }

        var edges: [Edge] { __data["edges"] }
        var pageInfo: PageInfo { __data["pageInfo"] }

        /// MyUserBlocks.Edge
        ///
        /// Parent Type: `UserBlockEdge`
        nonisolated struct Edge: SafetyAPI.SelectionSet {
          let __data: DataDict
          init(_dataDict: DataDict) { __data = _dataDict }

          static var __parentType: any ApolloAPI.ParentType { SafetyAPI.Objects.UserBlockEdge }
          static var __selections: [ApolloAPI.Selection] { [
            .field("__typename", String.self),
            .field("node", Node.self),
          ] }
          static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
            BlockedAccountsQuery.Data.MyUserBlocks.Edge.self
          ] }

          var node: Node { __data["node"] }

          /// MyUserBlocks.Edge.Node
          ///
          /// Parent Type: `UserBlock`
          nonisolated struct Node: SafetyAPI.SelectionSet {
            let __data: DataDict
            init(_dataDict: DataDict) { __data = _dataDict }

            static var __parentType: any ApolloAPI.ParentType { SafetyAPI.Objects.UserBlock }
            static var __selections: [ApolloAPI.Selection] { [
              .field("__typename", String.self),
              .field("_id", String.self),
              .field("blockedUserId", String?.self),
            ] }
            static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
              BlockedAccountsQuery.Data.MyUserBlocks.Edge.Node.self
            ] }

            var _id: String { __data["_id"] }
            var blockedUserId: String? { __data["blockedUserId"] }
          }
        }

        /// MyUserBlocks.PageInfo
        ///
        /// Parent Type: `PageInfo`
        nonisolated struct PageInfo: SafetyAPI.SelectionSet {
          let __data: DataDict
          init(_dataDict: DataDict) { __data = _dataDict }

          static var __parentType: any ApolloAPI.ParentType { SafetyAPI.Objects.PageInfo }
          static var __selections: [ApolloAPI.Selection] { [
            .field("__typename", String.self),
            .field("hasNextPage", Bool.self),
            .field("endCursor", String?.self),
          ] }
          static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
            BlockedAccountsQuery.Data.MyUserBlocks.PageInfo.self
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