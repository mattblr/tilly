// @generated
// This file was automatically generated and should not be edited.

@_exported import ApolloAPI
@_spi(Execution) @_spi(Unsafe) import ApolloAPI

extension ExecutionAPI {
  nonisolated struct AppearancePreferencesQuery: GraphQLQuery {
    static let operationName: String = "AppearancePreferences"
    static let operationDocument: ApolloAPI.OperationDocument = .init(
      definition: .init(
        #"query AppearancePreferences($now: DateTime) { appSettings(naturalKey: "app") { __typename appearanceEnabled appearanceEligibility } myAppearanceAccount { __typename enabled consentVersion } myPremiumGrants(first: 1, where: { until: { gt: $now } }) { __typename totalCount } }"#
      ))

    public var now: GraphQLNullable<DateTime>

    public init(now: GraphQLNullable<DateTime>) {
      self.now = now
    }

    @_spi(Unsafe) public var __variables: Variables? { ["now": now] }

    nonisolated struct Data: ExecutionAPI.SelectionSet {
      let __data: DataDict
      init(_dataDict: DataDict) { __data = _dataDict }

      static var __parentType: any ApolloAPI.ParentType { ExecutionAPI.Objects.Query }
      static var __selections: [ApolloAPI.Selection] { [
        .field("appSettings", AppSettings?.self, arguments: ["naturalKey": "app"]),
        .field("myAppearanceAccount", MyAppearanceAccount?.self),
        .field("myPremiumGrants", MyPremiumGrants.self, arguments: [
          "first": 1,
          "where": ["until": ["gt": .variable("now")]]
        ]),
      ] }
      static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
        AppearancePreferencesQuery.Data.self
      ] }

      /// Get a single App settings by natural key or ID
      var appSettings: AppSettings? { __data["appSettings"] }
      /// The authenticated user's own Appearance preferences.
      var myAppearanceAccount: MyAppearanceAccount? { __data["myAppearanceAccount"] }
      /// The authenticated user's own Premium grant records.
      var myPremiumGrants: MyPremiumGrants { __data["myPremiumGrants"] }

      /// AppSettings
      ///
      /// Parent Type: `AppSettings`
      nonisolated struct AppSettings: ExecutionAPI.SelectionSet {
        let __data: DataDict
        init(_dataDict: DataDict) { __data = _dataDict }

        static var __parentType: any ApolloAPI.ParentType { ExecutionAPI.Objects.AppSettings }
        static var __selections: [ApolloAPI.Selection] { [
          .field("__typename", String.self),
          .field("appearanceEnabled", Bool?.self),
          .field("appearanceEligibility", String?.self),
        ] }
        static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
          AppearancePreferencesQuery.Data.AppSettings.self
        ] }

        var appearanceEnabled: Bool? { __data["appearanceEnabled"] }
        var appearanceEligibility: String? { __data["appearanceEligibility"] }
      }

      /// MyAppearanceAccount
      ///
      /// Parent Type: `AppearanceAccount`
      nonisolated struct MyAppearanceAccount: ExecutionAPI.SelectionSet {
        let __data: DataDict
        init(_dataDict: DataDict) { __data = _dataDict }

        static var __parentType: any ApolloAPI.ParentType { ExecutionAPI.Objects.AppearanceAccount }
        static var __selections: [ApolloAPI.Selection] { [
          .field("__typename", String.self),
          .field("enabled", Bool?.self),
          .field("consentVersion", String?.self),
        ] }
        static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
          AppearancePreferencesQuery.Data.MyAppearanceAccount.self
        ] }

        var enabled: Bool? { __data["enabled"] }
        var consentVersion: String? { __data["consentVersion"] }
      }

      /// MyPremiumGrants
      ///
      /// Parent Type: `PremiumGrantConnection`
      nonisolated struct MyPremiumGrants: ExecutionAPI.SelectionSet {
        let __data: DataDict
        init(_dataDict: DataDict) { __data = _dataDict }

        static var __parentType: any ApolloAPI.ParentType { ExecutionAPI.Objects.PremiumGrantConnection }
        static var __selections: [ApolloAPI.Selection] { [
          .field("__typename", String.self),
          .field("totalCount", Int.self),
        ] }
        static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
          AppearancePreferencesQuery.Data.MyPremiumGrants.self
        ] }

        /// Total rows matching the where clause, ignoring pagination.
        var totalCount: Int { __data["totalCount"] }
      }
    }
  }

}