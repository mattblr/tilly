// @generated
// This file was automatically generated and should not be edited.

@_exported import ApolloAPI
@_spi(Execution) @_spi(Unsafe) import ApolloAPI

extension FoirAPI {
  nonisolated struct ProjectLocalesQuery: GraphQLQuery {
    static let operationName: String = "ProjectLocales"
    static let operationDocument: ApolloAPI.OperationDocument = .init(
      definition: .init(
        #"query ProjectLocales { locales { __typename code canonicalCode displayName nativeName isDefault isRtl } }"#
      ))

    public init() {}

    nonisolated struct Data: FoirAPI.SelectionSet {
      let __data: DataDict
      init(_dataDict: DataDict) { __data = _dataDict }

      static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.Query }
      static var __selections: [ApolloAPI.Selection] { [
        .field("locales", [Locale].self),
      ] }
      static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
        ProjectLocalesQuery.Data.self
      ] }

      /// The locales this project serves, ordered by code. Pass a `code` from here as the `locale` argument; ask `resolvedLocale` which of them a tag you did not configure will reach.
      var locales: [Locale] { __data["locales"] }

      /// Locale
      ///
      /// Parent Type: `ProjectLocale`
      nonisolated struct Locale: FoirAPI.SelectionSet {
        let __data: DataDict
        init(_dataDict: DataDict) { __data = _dataDict }

        static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.ProjectLocale }
        static var __selections: [ApolloAPI.Selection] { [
          .field("__typename", String.self),
          .field("code", String.self),
          .field("canonicalCode", String.self),
          .field("displayName", String.self),
          .field("nativeName", String?.self),
          .field("isDefault", Bool.self),
          .field("isRtl", Bool.self),
        ] }
        static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
          ProjectLocalesQuery.Data.Locale.self
        ] }

        /// BCP 47 tag, in the project's own spelling. This is the tag content is stored and resolved under, and what the `locale` argument takes. Do not compare it against a tag you canonicalised yourself — use `canonicalCode`.
        var code: String { __data["code"] }
        /// The same locale as `code`, canonicalised ("en-gb" becomes "en-GB"), or `code` verbatim when it is not valid BCP 47. This is the one to compare against `LocaleResolution.requested` and against a tag from `Accept-Language`, and the one to put in `<html lang>`.
        var canonicalCode: String { __data["canonicalCode"] }
        /// The name the console shows, in its own language (e.g. "French (Canada)").
        var displayName: String { __data["displayName"] }
        /// The locale's name in its own language (e.g. "Français (Canada)"): what a language switcher should render. Null when it was left unset.
        var nativeName: String? { __data["nativeName"] }
        /// The project's default locale, the last rung of every fallback chain. At most one locale is the default; a project may have none.
        var isDefault: Bool { __data["isDefault"] }
        /// Whether the locale is written right-to-left, for setting `dir` on the document.
        var isRtl: Bool { __data["isRtl"] }
      }
    }
  }

}