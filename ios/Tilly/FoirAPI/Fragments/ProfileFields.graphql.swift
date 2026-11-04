// @generated
// This file was automatically generated and should not be edited.

@_exported import ApolloAPI
@_spi(Execution) @_spi(Unsafe) import ApolloAPI

extension FoirAPI {
  nonisolated struct ProfileFields: FoirAPI.SelectionSet, Fragment {
    static var fragmentDefinition: StaticString {
      #"fragment ProfileFields on Profile { __typename _ownerId displayName username bio privacy photo { __typename ...PhotoThumb } }"#
    }

    let __data: DataDict
    init(_dataDict: DataDict) { __data = _dataDict }

    static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.Profile }
    static var __selections: [ApolloAPI.Selection] { [
      .field("__typename", String.self),
      .field("_ownerId", String?.self),
      .field("displayName", String?.self),
      .field("username", String?.self),
      .field("bio", String?.self),
      .field("privacy", String?.self),
      .field("photo", Photo?.self),
    ] }
    static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
      ProfileFields.self
    ] }

    var _ownerId: String? { __data["_ownerId"] }
    var displayName: String? { __data["displayName"] }
    var username: String? { __data["username"] }
    var bio: String? { __data["bio"] }
    var privacy: String? { __data["privacy"] }
    var photo: Photo? { __data["photo"] }

    /// Photo
    ///
    /// Parent Type: `Image`
    nonisolated struct Photo: FoirAPI.SelectionSet {
      let __data: DataDict
      init(_dataDict: DataDict) { __data = _dataDict }

      static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.Image }
      static var __selections: [ApolloAPI.Selection] { [
        .field("__typename", String.self),
        .fragment(PhotoThumb.self),
      ] }
      static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
        ProfileFields.Photo.self,
        PhotoThumb.self
      ] }

      var url: String? { __data["url"] }
      var blurhash: String? { __data["blurhash"] }
      var width: Int? { __data["width"] }
      var height: Int? { __data["height"] }
      /// WebP tier set (universal support). Pair with `avif` in a <picture>.
      var webp: Webp? { __data["webp"] }

      struct Fragments: FragmentContainer {
        let __data: DataDict
        init(_dataDict: DataDict) { __data = _dataDict }

        var photoThumb: PhotoThumb { _toFragment() }
      }

      typealias Webp = PhotoThumb.Webp
    }
  }

}