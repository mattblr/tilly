// @generated
// This file was automatically generated and should not be edited.

@_exported import ApolloAPI
@_spi(Execution) @_spi(Unsafe) import ApolloAPI

extension FoirAPI {
  nonisolated struct TopLikedCapturesQuery: GraphQLQuery {
    static let operationName: String = "TopLikedCaptures"
    static let operationDocument: ApolloAPI.OperationDocument = .init(
      definition: .init(
        #"query TopLikedCaptures($since: DateTime) { captureLikeAggregate( where: { createdAt: { gte: $since } } groupBy: PHOTOKEY limit: 1000 ) { __typename truncated groups { __typename key count } } }"#
      ))

    public var since: GraphQLNullable<DateTime>

    public init(since: GraphQLNullable<DateTime>) {
      self.since = since
    }

    @_spi(Unsafe) public var __variables: Variables? { ["since": since] }

    nonisolated struct Data: FoirAPI.SelectionSet {
      let __data: DataDict
      init(_dataDict: DataDict) { __data = _dataDict }

      static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.Query }
      static var __selections: [ApolloAPI.Selection] { [
        .field("captureLikeAggregate", CaptureLikeAggregate.self, arguments: [
          "where": ["createdAt": ["gte": .variable("since")]],
          "groupBy": "PHOTOKEY",
          "limit": 1000
        ]),
      ] }
      static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
        TopLikedCapturesQuery.Data.self
      ] }

      /// Aggregate Capture like records without fetching them.
      var captureLikeAggregate: CaptureLikeAggregate { __data["captureLikeAggregate"] }

      /// CaptureLikeAggregate
      ///
      /// Parent Type: `AggregateResult`
      nonisolated struct CaptureLikeAggregate: FoirAPI.SelectionSet {
        let __data: DataDict
        init(_dataDict: DataDict) { __data = _dataDict }

        static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.AggregateResult }
        static var __selections: [ApolloAPI.Selection] { [
          .field("__typename", String.self),
          .field("truncated", Bool.self),
          .field("groups", [Group].self),
        ] }
        static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
          TopLikedCapturesQuery.Data.CaptureLikeAggregate.self
        ] }

        /// True when `limit` cut the group list short. Worth reading before you draw a chart from it — len(groups) == limit is ambiguous at exactly the boundary.
        var truncated: Bool { __data["truncated"] }
        var groups: [Group] { __data["groups"] }

        /// CaptureLikeAggregate.Group
        ///
        /// Parent Type: `AggregateGroup`
        nonisolated struct Group: FoirAPI.SelectionSet {
          let __data: DataDict
          init(_dataDict: DataDict) { __data = _dataDict }

          static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.AggregateGroup }
          static var __selections: [ApolloAPI.Selection] { [
            .field("__typename", String.self),
            .field("key", String?.self),
            .field("count", Int.self),
          ] }
          static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
            TopLikedCapturesQuery.Data.CaptureLikeAggregate.Group.self
          ] }

          /// The grouped value. Null for the ungrouped total, and null for the records that have no value for the grouped field — those are the same group.
          var key: String? { __data["key"] }
          var count: Int { __data["count"] }
        }
      }
    }
  }

}