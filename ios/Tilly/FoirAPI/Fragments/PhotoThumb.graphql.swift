// @generated
// This file was automatically generated and should not be edited.

@_exported import ApolloAPI
@_spi(Execution) @_spi(Unsafe) import ApolloAPI

extension FoirAPI {
  nonisolated struct PhotoThumb: FoirAPI.SelectionSet, Fragment {
    static var fragmentDefinition: StaticString {
      #"fragment PhotoThumb on Image { __typename url blurhash width height webp { __typename thumbnail { __typename url } medium { __typename url } } }"#
    }

    let __data: DataDict
    init(_dataDict: DataDict) { __data = _dataDict }

    static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.Image }
    static var __selections: [ApolloAPI.Selection] { [
      .field("__typename", String.self),
      .field("url", String?.self),
      .field("blurhash", String?.self),
      .field("width", Int?.self),
      .field("height", Int?.self),
      .field("webp", Webp?.self),
    ] }
    static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
      PhotoThumb.self
    ] }

    var url: String? { __data["url"] }
    var blurhash: String? { __data["blurhash"] }
    var width: Int? { __data["width"] }
    var height: Int? { __data["height"] }
    /// WebP tier set (universal support). Pair with `avif` in a <picture>.
    var webp: Webp? { __data["webp"] }

    /// Webp
    ///
    /// Parent Type: `ImageVariantSet`
    nonisolated struct Webp: FoirAPI.SelectionSet {
      let __data: DataDict
      init(_dataDict: DataDict) { __data = _dataDict }

      static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.ImageVariantSet }
      static var __selections: [ApolloAPI.Selection] { [
        .field("__typename", String.self),
        .field("thumbnail", Thumbnail?.self),
        .field("medium", Medium?.self),
      ] }
      static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
        PhotoThumb.Webp.self
      ] }

      var thumbnail: Thumbnail? { __data["thumbnail"] }
      var medium: Medium? { __data["medium"] }

      /// Webp.Thumbnail
      ///
      /// Parent Type: `ImageVariant`
      nonisolated struct Thumbnail: FoirAPI.SelectionSet {
        let __data: DataDict
        init(_dataDict: DataDict) { __data = _dataDict }

        static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.ImageVariant }
        static var __selections: [ApolloAPI.Selection] { [
          .field("__typename", String.self),
          .field("url", String.self),
        ] }
        static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
          PhotoThumb.Webp.Thumbnail.self
        ] }

        var url: String { __data["url"] }
      }

      /// Webp.Medium
      ///
      /// Parent Type: `ImageVariant`
      nonisolated struct Medium: FoirAPI.SelectionSet {
        let __data: DataDict
        init(_dataDict: DataDict) { __data = _dataDict }

        static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.ImageVariant }
        static var __selections: [ApolloAPI.Selection] { [
          .field("__typename", String.self),
          .field("url", String.self),
        ] }
        static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
          PhotoThumb.Webp.Medium.self
        ] }

        var url: String { __data["url"] }
      }
    }
  }

}