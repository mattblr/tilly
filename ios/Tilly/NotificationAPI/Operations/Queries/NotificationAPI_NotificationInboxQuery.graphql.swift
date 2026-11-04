// @generated
// This file was automatically generated and should not be edited.

@_exported import ApolloAPI
@_spi(Execution) @_spi(Unsafe) import ApolloAPI

extension NotificationAPI {
  nonisolated struct NotificationInboxQuery: GraphQLQuery {
    static let operationName: String = "NotificationInbox"
    static let operationDocument: ApolloAPI.OperationDocument = .init(
      definition: .init(
        #"query NotificationInbox($after: String) { myNotifications(first: 20, after: $after) { __typename edges { __typename node { __typename id title body actionUrl imageUrl isRead createdAt } } pageInfo { __typename hasNextPage endCursor } } myUnreadCount }"#
      ))

    public var after: GraphQLNullable<String>

    public init(after: GraphQLNullable<String>) {
      self.after = after
    }

    @_spi(Unsafe) public var __variables: Variables? { ["after": after] }

    nonisolated struct Data: NotificationAPI.SelectionSet {
      let __data: DataDict
      init(_dataDict: DataDict) { __data = _dataDict }

      static var __parentType: any ApolloAPI.ParentType { NotificationAPI.Objects.Query }
      static var __selections: [ApolloAPI.Selection] { [
        .field("myNotifications", MyNotifications.self, arguments: [
          "first": 20,
          "after": .variable("after")
        ]),
        .field("myUnreadCount", Int.self),
      ] }
      static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
        NotificationInboxQuery.Data.self
      ] }

      /// List notifications for the authenticated user
      var myNotifications: MyNotifications { __data["myNotifications"] }
      /// Count unread notifications
      var myUnreadCount: Int { __data["myUnreadCount"] }

      /// MyNotifications
      ///
      /// Parent Type: `InboxNotificationConnection`
      nonisolated struct MyNotifications: NotificationAPI.SelectionSet {
        let __data: DataDict
        init(_dataDict: DataDict) { __data = _dataDict }

        static var __parentType: any ApolloAPI.ParentType { NotificationAPI.Objects.InboxNotificationConnection }
        static var __selections: [ApolloAPI.Selection] { [
          .field("__typename", String.self),
          .field("edges", [Edge].self),
          .field("pageInfo", PageInfo.self),
        ] }
        static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
          NotificationInboxQuery.Data.MyNotifications.self
        ] }

        var edges: [Edge] { __data["edges"] }
        var pageInfo: PageInfo { __data["pageInfo"] }

        /// MyNotifications.Edge
        ///
        /// Parent Type: `InboxNotificationEdge`
        nonisolated struct Edge: NotificationAPI.SelectionSet {
          let __data: DataDict
          init(_dataDict: DataDict) { __data = _dataDict }

          static var __parentType: any ApolloAPI.ParentType { NotificationAPI.Objects.InboxNotificationEdge }
          static var __selections: [ApolloAPI.Selection] { [
            .field("__typename", String.self),
            .field("node", Node.self),
          ] }
          static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
            NotificationInboxQuery.Data.MyNotifications.Edge.self
          ] }

          var node: Node { __data["node"] }

          /// MyNotifications.Edge.Node
          ///
          /// Parent Type: `InboxNotification`
          nonisolated struct Node: NotificationAPI.SelectionSet {
            let __data: DataDict
            init(_dataDict: DataDict) { __data = _dataDict }

            static var __parentType: any ApolloAPI.ParentType { NotificationAPI.Objects.InboxNotification }
            static var __selections: [ApolloAPI.Selection] { [
              .field("__typename", String.self),
              .field("id", String.self),
              .field("title", String.self),
              .field("body", String?.self),
              .field("actionUrl", String?.self),
              .field("imageUrl", String?.self),
              .field("isRead", Bool.self),
              .field("createdAt", NotificationAPI.DateTime.self),
            ] }
            static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
              NotificationInboxQuery.Data.MyNotifications.Edge.Node.self
            ] }

            var id: String { __data["id"] }
            var title: String { __data["title"] }
            var body: String? { __data["body"] }
            var actionUrl: String? { __data["actionUrl"] }
            var imageUrl: String? { __data["imageUrl"] }
            var isRead: Bool { __data["isRead"] }
            var createdAt: NotificationAPI.DateTime { __data["createdAt"] }
          }
        }

        /// MyNotifications.PageInfo
        ///
        /// Parent Type: `PageInfo`
        nonisolated struct PageInfo: NotificationAPI.SelectionSet {
          let __data: DataDict
          init(_dataDict: DataDict) { __data = _dataDict }

          static var __parentType: any ApolloAPI.ParentType { NotificationAPI.Objects.PageInfo }
          static var __selections: [ApolloAPI.Selection] { [
            .field("__typename", String.self),
            .field("hasNextPage", Bool.self),
            .field("endCursor", String?.self),
          ] }
          static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
            NotificationInboxQuery.Data.MyNotifications.PageInfo.self
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