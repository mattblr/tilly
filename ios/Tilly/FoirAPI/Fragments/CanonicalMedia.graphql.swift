// @generated
// This file was automatically generated and should not be edited.

@_exported import ApolloAPI
@_spi(Execution) @_spi(Unsafe) import ApolloAPI

extension FoirAPI {
  nonisolated struct CanonicalMedia: FoirAPI.SelectionSet, Fragment {
    static var fragmentDefinition: StaticString {
      #"fragment CanonicalMedia on CapturePhoto { __typename _id _ownerId _createdAt state tagRevision catKey area { __typename lat lng } photo { __typename ...PhotoThumb } }"#
    }

    let __data: DataDict
    init(_dataDict: DataDict) { __data = _dataDict }

    static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.CapturePhoto }
    static var __selections: [ApolloAPI.Selection] { [
      .field("__typename", String.self),
      .field("_id", String.self),
      .field("_ownerId", String?.self),
      .field("_createdAt", FoirAPI.DateTime.self),
      .field("state", String?.self),
      .field("tagRevision", String?.self),
      .field("catKey", String?.self),
      .field("area", Area?.self),
      .field("photo", Photo?.self),
    ] }
    static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
      CanonicalMedia.self
    ] }

    var _id: String { __data["_id"] }
    var _ownerId: String? { __data["_ownerId"] }
    var _createdAt: FoirAPI.DateTime { __data["_createdAt"] }
    var state: String? { __data["state"] }
    var tagRevision: String? { __data["tagRevision"] }
    var catKey: String? { __data["catKey"] }
    var area: Area? { __data["area"] }
    var photo: Photo? { __data["photo"] }

    /// Area
    ///
    /// Parent Type: `GeoPoint`
    nonisolated struct Area: FoirAPI.SelectionSet {
      let __data: DataDict
      init(_dataDict: DataDict) { __data = _dataDict }

      static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.GeoPoint }
      static var __selections: [ApolloAPI.Selection] { [
        .field("__typename", String.self),
        .field("lat", Double?.self),
        .field("lng", Double?.self),
      ] }
      static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
        CanonicalMedia.Area.self
      ] }

      var lat: Double? { __data["lat"] }
      var lng: Double? { __data["lng"] }
    }

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
        CanonicalMedia.Photo.self,
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