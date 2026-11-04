// @generated
// This file was automatically generated and should not be edited.

@_exported import ApolloAPI
@_spi(Execution) @_spi(Unsafe) import ApolloAPI

extension FoirAPI {
  nonisolated struct CatCellsQuery: GraphQLQuery {
    static let operationName: String = "CatCells"
    static let operationDocument: ApolloAPI.OperationDocument = .init(
      definition: .init(
        #"query CatCells($where: CatWhereInput, $groupBy: CatAggregatableField!) { catAggregate(where: $where, groupBy: $groupBy, limit: 500) { __typename groups { __typename key count } } }"#
      ))

    public var `where`: GraphQLNullable<CatWhereInput>
    public var groupBy: GraphQLEnum<CatAggregatableField>

    public init(
      `where`: GraphQLNullable<CatWhereInput>,
      groupBy: GraphQLEnum<CatAggregatableField>
    ) {
      self.`where` = `where`
      self.groupBy = groupBy
    }

    @_spi(Unsafe) public var __variables: Variables? { [
      "where": `where`,
      "groupBy": groupBy
    ] }

    nonisolated struct Data: FoirAPI.SelectionSet {
      let __data: DataDict
      init(_dataDict: DataDict) { __data = _dataDict }

      static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.Query }
      static var __selections: [ApolloAPI.Selection] { [
        .field("catAggregate", CatAggregate.self, arguments: [
          "where": .variable("where"),
          "groupBy": .variable("groupBy"),
          "limit": 500
        ]),
      ] }
      static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
        CatCellsQuery.Data.self
      ] }

      /// Aggregate Cat records without fetching them.
      var catAggregate: CatAggregate { __data["catAggregate"] }

      /// CatAggregate
      ///
      /// Parent Type: `AggregateResult`
      nonisolated struct CatAggregate: FoirAPI.SelectionSet {
        let __data: DataDict
        init(_dataDict: DataDict) { __data = _dataDict }

        static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.AggregateResult }
        static var __selections: [ApolloAPI.Selection] { [
          .field("__typename", String.self),
          .field("groups", [Group].self),
        ] }
        static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
          CatCellsQuery.Data.CatAggregate.self
        ] }

        var groups: [Group] { __data["groups"] }

        /// CatAggregate.Group
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
            CatCellsQuery.Data.CatAggregate.Group.self
          ] }

          /// The grouped value. Null for the ungrouped total, and null for the records that have no value for the grouped field — those are the same group.
          var key: String? { __data["key"] }
          var count: Int { __data["count"] }
        }
      }
    }
  }

}