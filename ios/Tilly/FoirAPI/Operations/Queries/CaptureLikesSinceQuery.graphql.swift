// @generated
// This file was automatically generated and should not be edited.

@_exported import ApolloAPI
@_spi(Execution) @_spi(Unsafe) import ApolloAPI

extension FoirAPI {
  nonisolated struct CaptureLikesSinceQuery: GraphQLQuery {
    static let operationName: String = "CaptureLikesSince"
    static let operationDocument: ApolloAPI.OperationDocument = .init(
      definition: .init(
        #"query CaptureLikesSince($photoKeys: [String], $since: DateTime) { captureLikeAggregate( where: { photoKey: { in: $photoKeys }, createdAt: { gte: $since } } groupBy: PHOTOKEY limit: 100 ) { __typename groups { __typename key count } } }"#
      ))

    public var photoKeys: GraphQLNullable<[String?]>
    public var since: GraphQLNullable<DateTime>

    public init(
      photoKeys: GraphQLNullable<[String?]>,
      since: GraphQLNullable<DateTime>
    ) {
      self.photoKeys = photoKeys
      self.since = since
    }

    @_spi(Unsafe) public var __variables: Variables? { [
      "photoKeys": photoKeys,
      "since": since
    ] }

    nonisolated struct Data: FoirAPI.SelectionSet {
      let __data: DataDict
      init(_dataDict: DataDict) { __data = _dataDict }

      static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.Query }
      static var __selections: [ApolloAPI.Selection] { [
        .field("captureLikeAggregate", CaptureLikeAggregate.self, arguments: [
          "where": [
            "photoKey": ["in": .variable("photoKeys")],
            "createdAt": ["gte": .variable("since")]
          ],
          "groupBy": "PHOTOKEY",
          "limit": 100
        ]),
      ] }
      static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
        CaptureLikesSinceQuery.Data.self
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
          .field("groups", [Group].self),
        ] }
        static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
          CaptureLikesSinceQuery.Data.CaptureLikeAggregate.self
        ] }

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
            CaptureLikesSinceQuery.Data.CaptureLikeAggregate.Group.self
          ] }

          /// The grouped value. Null for the ungrouped total, and null for the records that have no value for the grouped field — those are the same group.
          var key: String? { __data["key"] }
          var count: Int { __data["count"] }
        }
      }
    }
  }

}