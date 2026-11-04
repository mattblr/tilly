// @generated
// This file was automatically generated and should not be edited.

@_exported import ApolloAPI
@_spi(Execution) @_spi(Unsafe) import ApolloAPI

extension FoirAPI {
  nonisolated struct MyPremiumQuery: GraphQLQuery {
    static let operationName: String = "MyPremium"
    static let operationDocument: ApolloAPI.OperationDocument = .init(
      definition: .init(
        #"query MyPremium($now: DateTime) { myPremiumGrants(where: { until: { gte: $now } }, first: 1) { __typename totalCount } }"#
      ))

    public var now: GraphQLNullable<DateTime>

    public init(now: GraphQLNullable<DateTime>) {
      self.now = now
    }

    @_spi(Unsafe) public var __variables: Variables? { ["now": now] }

    nonisolated struct Data: FoirAPI.SelectionSet {
      let __data: DataDict
      init(_dataDict: DataDict) { __data = _dataDict }

      static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.Query }
      static var __selections: [ApolloAPI.Selection] { [
        .field("myPremiumGrants", MyPremiumGrants.self, arguments: [
          "where": ["until": ["gte": .variable("now")]],
          "first": 1
        ]),
      ] }
      static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
        MyPremiumQuery.Data.self
      ] }

      /// The authenticated user's own Premium grant records.
      var myPremiumGrants: MyPremiumGrants { __data["myPremiumGrants"] }

      /// MyPremiumGrants
      ///
      /// Parent Type: `PremiumGrantConnection`
      nonisolated struct MyPremiumGrants: FoirAPI.SelectionSet {
        let __data: DataDict
        init(_dataDict: DataDict) { __data = _dataDict }

        static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.PremiumGrantConnection }
        static var __selections: [ApolloAPI.Selection] { [
          .field("__typename", String.self),
          .field("totalCount", Int.self),
        ] }
        static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
          MyPremiumQuery.Data.MyPremiumGrants.self
        ] }

        /// Total rows matching the where clause, ignoring pagination.
        var totalCount: Int { __data["totalCount"] }
      }
    }
  }

}