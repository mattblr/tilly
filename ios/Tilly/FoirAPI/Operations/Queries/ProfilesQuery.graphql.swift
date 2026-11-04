// @generated
// This file was automatically generated and should not be edited.

@_exported import ApolloAPI
@_spi(Execution) @_spi(Unsafe) import ApolloAPI

extension FoirAPI {
  nonisolated struct ProfilesQuery: GraphQLQuery {
    static let operationName: String = "Profiles"
    static let operationDocument: ApolloAPI.OperationDocument = .init(
      definition: .init(
        #"query Profiles($ids: [ID], $after: String) { profiles(where: { ownerId: { in: $ids } }, first: 100, after: $after) { __typename pageInfo { __typename ...More } edges { __typename node { __typename ...ProfileFields } } } }"#,
        fragments: [More.self, PhotoThumb.self, ProfileFields.self]
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

    nonisolated struct Data: FoirAPI.SelectionSet {
      let __data: DataDict
      init(_dataDict: DataDict) { __data = _dataDict }

      static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.Query }
      static var __selections: [ApolloAPI.Selection] { [
        .field("profiles", Profiles.self, arguments: [
          "where": ["ownerId": ["in": .variable("ids")]],
          "first": 100,
          "after": .variable("after")
        ]),
      ] }
      static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
        ProfilesQuery.Data.self
      ] }

      /// List Profile records
      var profiles: Profiles { __data["profiles"] }

      /// Profiles
      ///
      /// Parent Type: `ProfileConnection`
      nonisolated struct Profiles: FoirAPI.SelectionSet {
        let __data: DataDict
        init(_dataDict: DataDict) { __data = _dataDict }

        static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.ProfileConnection }
        static var __selections: [ApolloAPI.Selection] { [
          .field("__typename", String.self),
          .field("pageInfo", PageInfo.self),
          .field("edges", [Edge].self),
        ] }
        static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
          ProfilesQuery.Data.Profiles.self
        ] }

        var pageInfo: PageInfo { __data["pageInfo"] }
        var edges: [Edge] { __data["edges"] }

        /// Profiles.PageInfo
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
            ProfilesQuery.Data.Profiles.PageInfo.self,
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

        /// Profiles.Edge
        ///
        /// Parent Type: `ProfileEdge`
        nonisolated struct Edge: FoirAPI.SelectionSet {
          let __data: DataDict
          init(_dataDict: DataDict) { __data = _dataDict }

          static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.ProfileEdge }
          static var __selections: [ApolloAPI.Selection] { [
            .field("__typename", String.self),
            .field("node", Node.self),
          ] }
          static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
            ProfilesQuery.Data.Profiles.Edge.self
          ] }

          var node: Node { __data["node"] }

          /// Profiles.Edge.Node
          ///
          /// Parent Type: `Profile`
          nonisolated struct Node: FoirAPI.SelectionSet {
            let __data: DataDict
            init(_dataDict: DataDict) { __data = _dataDict }

            static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.Profile }
            static var __selections: [ApolloAPI.Selection] { [
              .field("__typename", String.self),
              .fragment(ProfileFields.self),
            ] }
            static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
              ProfilesQuery.Data.Profiles.Edge.Node.self,
              ProfileFields.self
            ] }

            var _ownerId: String? { __data["_ownerId"] }
            var displayName: String? { __data["displayName"] }
            var username: String? { __data["username"] }
            var bio: String? { __data["bio"] }
            var privacy: String? { __data["privacy"] }
            var photo: Photo? { __data["photo"] }

            struct Fragments: FragmentContainer {
              let __data: DataDict
              init(_dataDict: DataDict) { __data = _dataDict }

              var profileFields: ProfileFields { _toFragment() }
            }

            typealias Photo = ProfileFields.Photo
          }
        }
      }
    }
  }

}