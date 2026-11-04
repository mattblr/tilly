// @generated
// This file was automatically generated and should not be edited.

@_exported import ApolloAPI
@_spi(Execution) @_spi(Unsafe) import ApolloAPI

extension FoirAPI {
  nonisolated struct AppSettingsQuery: GraphQLQuery {
    static let operationName: String = "AppSettings"
    static let operationDocument: ApolloAPI.OperationDocument = .init(
      definition: .init(
        #"query AppSettings { appSettings(naturalKey: "app") { __typename clusterAt nearYouMeters nearYouHours nearMeMeters trendingPerCat } }"#
      ))

    public init() {}

    nonisolated struct Data: FoirAPI.SelectionSet {
      let __data: DataDict
      init(_dataDict: DataDict) { __data = _dataDict }

      static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.Query }
      static var __selections: [ApolloAPI.Selection] { [
        .field("appSettings", AppSettings?.self, arguments: ["naturalKey": "app"]),
      ] }
      static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
        AppSettingsQuery.Data.self
      ] }

      /// Get a single App settings by natural key or ID
      var appSettings: AppSettings? { __data["appSettings"] }

      /// AppSettings
      ///
      /// Parent Type: `AppSettings`
      nonisolated struct AppSettings: FoirAPI.SelectionSet {
        let __data: DataDict
        init(_dataDict: DataDict) { __data = _dataDict }

        static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.AppSettings }
        static var __selections: [ApolloAPI.Selection] { [
          .field("__typename", String.self),
          .field("clusterAt", Int?.self),
          .field("nearYouMeters", Int?.self),
          .field("nearYouHours", Int?.self),
          .field("nearMeMeters", Int?.self),
          .field("trendingPerCat", Int?.self),
        ] }
        static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
          AppSettingsQuery.Data.AppSettings.self
        ] }

        var clusterAt: Int? { __data["clusterAt"] }
        var nearYouMeters: Int? { __data["nearYouMeters"] }
        var nearYouHours: Int? { __data["nearYouHours"] }
        var nearMeMeters: Int? { __data["nearMeMeters"] }
        var trendingPerCat: Int? { __data["trendingPerCat"] }
      }
    }
  }

}