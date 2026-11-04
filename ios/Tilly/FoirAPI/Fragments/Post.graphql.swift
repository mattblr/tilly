// @generated
// This file was automatically generated and should not be edited.

@_exported import ApolloAPI
@_spi(Execution) @_spi(Unsafe) import ApolloAPI

extension FoirAPI {
  nonisolated struct Post: FoirAPI.SelectionSet, Fragment {
    static var fragmentDefinition: StaticString {
      #"fragment Post on CapturePost { __typename _id _createdAt postedAt _ownerId catKey cat { __typename _id name } photoKey area { __typename lat lng } audience note reshareOf comment }"#
    }

    let __data: DataDict
    init(_dataDict: DataDict) { __data = _dataDict }

    static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.CapturePost }
    static var __selections: [ApolloAPI.Selection] { [
      .field("__typename", String.self),
      .field("_id", String.self),
      .field("_createdAt", FoirAPI.DateTime.self),
      .field("postedAt", FoirAPI.DateTime?.self),
      .field("_ownerId", String?.self),
      .field("catKey", String?.self),
      .field("cat", Cat?.self),
      .field("photoKey", String?.self),
      .field("area", Area?.self),
      .field("audience", String?.self),
      .field("note", String?.self),
      .field("reshareOf", String?.self),
      .field("comment", String?.self),
    ] }
    static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
      Post.self
    ] }

    var _id: String { __data["_id"] }
    var _createdAt: FoirAPI.DateTime { __data["_createdAt"] }
    var postedAt: FoirAPI.DateTime? { __data["postedAt"] }
    var _ownerId: String? { __data["_ownerId"] }
    var catKey: String? { __data["catKey"] }
    var cat: Cat? { __data["cat"] }
    var photoKey: String? { __data["photoKey"] }
    var area: Area? { __data["area"] }
    var audience: String? { __data["audience"] }
    var note: String? { __data["note"] }
    var reshareOf: String? { __data["reshareOf"] }
    var comment: String? { __data["comment"] }

    /// Cat
    ///
    /// Parent Type: `Cat`
    nonisolated struct Cat: FoirAPI.SelectionSet {
      let __data: DataDict
      init(_dataDict: DataDict) { __data = _dataDict }

      static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.Cat }
      static var __selections: [ApolloAPI.Selection] { [
        .field("__typename", String.self),
        .field("_id", String.self),
        .field("name", String?.self),
      ] }
      static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
        Post.Cat.self
      ] }

      var _id: String { __data["_id"] }
      var name: String? { __data["name"] }
    }

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
        Post.Area.self
      ] }

      var lat: Double? { __data["lat"] }
      var lng: Double? { __data["lng"] }
    }
  }

}