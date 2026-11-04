// @generated
// This file was automatically generated and should not be edited.

@_exported import ApolloAPI
@_spi(Execution) @_spi(Unsafe) import ApolloAPI

extension FoirAPI {
  nonisolated struct More: FoirAPI.SelectionSet, Fragment {
    static var fragmentDefinition: StaticString {
      #"fragment More on PageInfo { __typename hasNextPage endCursor }"#
    }

    let __data: DataDict
    init(_dataDict: DataDict) { __data = _dataDict }

    static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.PageInfo }
    static var __selections: [ApolloAPI.Selection] { [
      .field("__typename", String.self),
      .field("hasNextPage", Bool.self),
      .field("endCursor", String?.self),
    ] }
    static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
      More.self
    ] }

    /// True when a forward fetch (after the current page's end) would yield more rows.
    var hasNextPage: Bool { __data["hasNextPage"] }
    /// Cursor for the last row in this page; null when the page is empty.
    var endCursor: String? { __data["endCursor"] }
  }

}