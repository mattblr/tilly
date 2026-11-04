// @generated
// This file was automatically generated and should not be edited.

@_exported import ApolloAPI
@_spi(Execution) @_spi(Unsafe) import ApolloAPI

extension FoirAPI {
  nonisolated struct PublishedDesignTokensQuery: GraphQLQuery {
    static let operationName: String = "PublishedDesignTokens"
    static let operationDocument: ApolloAPI.OperationDocument = .init(
      definition: .init(
        #"query PublishedDesignTokens { designTokens { __typename colors { __typename name value } spacings { __typename name value } radii { __typename name value } } }"#
      ))

    public init() {}

    nonisolated struct Data: FoirAPI.SelectionSet {
      let __data: DataDict
      init(_dataDict: DataDict) { __data = _dataDict }

      static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.Query }
      static var __selections: [ApolloAPI.Selection] { [
        .field("designTokens", DesignTokens?.self),
      ] }
      static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
        PublishedDesignTokensQuery.Data.self
      ] }

      /// Current project's design tokens. Reads the published channel by default; a caller that may read drafts sees them by asking with X-Foir-Schema-Channel: draft.
      var designTokens: DesignTokens? { __data["designTokens"] }

      /// DesignTokens
      ///
      /// Parent Type: `DesignTokens`
      nonisolated struct DesignTokens: FoirAPI.SelectionSet {
        let __data: DataDict
        init(_dataDict: DataDict) { __data = _dataDict }

        static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.DesignTokens }
        static var __selections: [ApolloAPI.Selection] { [
          .field("__typename", String.self),
          .field("colors", [Color].self),
          .field("spacings", [Spacing].self),
          .field("radii", [Radii].self),
        ] }
        static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
          PublishedDesignTokensQuery.Data.DesignTokens.self
        ] }

        var colors: [Color] { __data["colors"] }
        var spacings: [Spacing] { __data["spacings"] }
        var radii: [Radii] { __data["radii"] }

        /// DesignTokens.Color
        ///
        /// Parent Type: `DesignTokenColor`
        nonisolated struct Color: FoirAPI.SelectionSet {
          let __data: DataDict
          init(_dataDict: DataDict) { __data = _dataDict }

          static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.DesignTokenColor }
          static var __selections: [ApolloAPI.Selection] { [
            .field("__typename", String.self),
            .field("name", String.self),
            .field("value", String.self),
          ] }
          static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
            PublishedDesignTokensQuery.Data.DesignTokens.Color.self
          ] }

          var name: String { __data["name"] }
          var value: String { __data["value"] }
        }

        /// DesignTokens.Spacing
        ///
        /// Parent Type: `DesignTokenDimension`
        nonisolated struct Spacing: FoirAPI.SelectionSet {
          let __data: DataDict
          init(_dataDict: DataDict) { __data = _dataDict }

          static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.DesignTokenDimension }
          static var __selections: [ApolloAPI.Selection] { [
            .field("__typename", String.self),
            .field("name", String.self),
            .field("value", String.self),
          ] }
          static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
            PublishedDesignTokensQuery.Data.DesignTokens.Spacing.self
          ] }

          var name: String { __data["name"] }
          var value: String { __data["value"] }
        }

        /// DesignTokens.Radii
        ///
        /// Parent Type: `DesignTokenDimension`
        nonisolated struct Radii: FoirAPI.SelectionSet {
          let __data: DataDict
          init(_dataDict: DataDict) { __data = _dataDict }

          static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.DesignTokenDimension }
          static var __selections: [ApolloAPI.Selection] { [
            .field("__typename", String.self),
            .field("name", String.self),
            .field("value", String.self),
          ] }
          static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
            PublishedDesignTokensQuery.Data.DesignTokens.Radii.self
          ] }

          var name: String { __data["name"] }
          var value: String { __data["value"] }
        }
      }
    }
  }

}