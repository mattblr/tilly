// @generated
// This file was automatically generated and should not be edited.

@_exported import ApolloAPI
@_spi(Execution) @_spi(Unsafe) import ApolloAPI

extension ExecutionAPI {
  nonisolated struct PublicCatAppearanceQuery: GraphQLQuery {
    static let operationName: String = "PublicCatAppearance"
    static let operationDocument: ApolloAPI.OperationDocument = .init(
      definition: .init(
        #"query PublicCatAppearance($id: String) { appearanceVoteAggregate( where: { catKey: { eq: $id } } groupBy: DIMENSION limit: 258 ) { __typename truncated groups { __typename key count } } }"#
      ))

    public var id: GraphQLNullable<String>

    public init(id: GraphQLNullable<String>) {
      self.id = id
    }

    @_spi(Unsafe) public var __variables: Variables? { ["id": id] }

    nonisolated struct Data: ExecutionAPI.SelectionSet {
      let __data: DataDict
      init(_dataDict: DataDict) { __data = _dataDict }

      static var __parentType: any ApolloAPI.ParentType { ExecutionAPI.Objects.Query }
      static var __selections: [ApolloAPI.Selection] { [
        .field("appearanceVoteAggregate", AppearanceVoteAggregate.self, arguments: [
          "where": ["catKey": ["eq": .variable("id")]],
          "groupBy": "DIMENSION",
          "limit": 258
        ]),
      ] }
      static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
        PublicCatAppearanceQuery.Data.self
      ] }

      /// Aggregate Public cat appearance evidence records without fetching them.
      var appearanceVoteAggregate: AppearanceVoteAggregate { __data["appearanceVoteAggregate"] }

      /// AppearanceVoteAggregate
      ///
      /// Parent Type: `AggregateResult`
      nonisolated struct AppearanceVoteAggregate: ExecutionAPI.SelectionSet {
        let __data: DataDict
        init(_dataDict: DataDict) { __data = _dataDict }

        static var __parentType: any ApolloAPI.ParentType { ExecutionAPI.Objects.AggregateResult }
        static var __selections: [ApolloAPI.Selection] { [
          .field("__typename", String.self),
          .field("truncated", Bool.self),
          .field("groups", [Group].self),
        ] }
        static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
          PublicCatAppearanceQuery.Data.AppearanceVoteAggregate.self
        ] }

        /// True when `limit` cut the group list short. Worth reading before you draw a chart from it — len(groups) == limit is ambiguous at exactly the boundary.
        var truncated: Bool { __data["truncated"] }
        var groups: [Group] { __data["groups"] }

        /// AppearanceVoteAggregate.Group
        ///
        /// Parent Type: `AggregateGroup`
        nonisolated struct Group: ExecutionAPI.SelectionSet {
          let __data: DataDict
          init(_dataDict: DataDict) { __data = _dataDict }

          static var __parentType: any ApolloAPI.ParentType { ExecutionAPI.Objects.AggregateGroup }
          static var __selections: [ApolloAPI.Selection] { [
            .field("__typename", String.self),
            .field("key", String?.self),
            .field("count", Int.self),
          ] }
          static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
            PublicCatAppearanceQuery.Data.AppearanceVoteAggregate.Group.self
          ] }

          /// The grouped value. Null for the ungrouped total, and null for the records that have no value for the grouped field — those are the same group.
          var key: String? { __data["key"] }
          var count: Int { __data["count"] }
        }
      }
    }
  }

}