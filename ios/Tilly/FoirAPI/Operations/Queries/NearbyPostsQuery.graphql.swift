// @generated
// This file was automatically generated and should not be edited.

@_exported import ApolloAPI
@_spi(Execution) @_spi(Unsafe) import ApolloAPI

extension FoirAPI {
  nonisolated struct NearbyPostsQuery: GraphQLQuery {
    static let operationName: String = "NearbyPosts"
    static let operationDocument: ApolloAPI.OperationDocument = .init(
      definition: .init(
        #"query NearbyPosts($lat: Float!, $lng: Float!, $radius: Float!, $after: String) { searchByLocation( lat: $lat lng: $lng radiusMeters: $radius modelKey: "capture-post" key: "area" first: 100 after: $after ) { __typename pageInfo { __typename ...More } edges { __typename node { __typename recordId } } } }"#,
        fragments: [More.self]
      ))

    public var lat: Double
    public var lng: Double
    public var radius: Double
    public var after: GraphQLNullable<String>

    public init(
      lat: Double,
      lng: Double,
      radius: Double,
      after: GraphQLNullable<String>
    ) {
      self.lat = lat
      self.lng = lng
      self.radius = radius
      self.after = after
    }

    @_spi(Unsafe) public var __variables: Variables? { [
      "lat": lat,
      "lng": lng,
      "radius": radius,
      "after": after
    ] }

    nonisolated struct Data: FoirAPI.SelectionSet {
      let __data: DataDict
      init(_dataDict: DataDict) { __data = _dataDict }

      static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.Query }
      static var __selections: [ApolloAPI.Selection] { [
        .field("searchByLocation", SearchByLocation.self, arguments: [
          "lat": .variable("lat"),
          "lng": .variable("lng"),
          "radiusMeters": .variable("radius"),
          "modelKey": "capture-post",
          "key": "area",
          "first": 100,
          "after": .variable("after")
        ]),
      ] }
      static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
        NearbyPostsQuery.Data.self
      ] }

      /// Find records near an explicit point, ordered by true distance (the geo analog of searchEmbeddings).
      var searchByLocation: SearchByLocation { __data["searchByLocation"] }

      /// SearchByLocation
      ///
      /// Parent Type: `NearbyRecordConnection`
      nonisolated struct SearchByLocation: FoirAPI.SelectionSet {
        let __data: DataDict
        init(_dataDict: DataDict) { __data = _dataDict }

        static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.NearbyRecordConnection }
        static var __selections: [ApolloAPI.Selection] { [
          .field("__typename", String.self),
          .field("pageInfo", PageInfo.self),
          .field("edges", [Edge].self),
        ] }
        static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
          NearbyPostsQuery.Data.SearchByLocation.self
        ] }

        var pageInfo: PageInfo { __data["pageInfo"] }
        var edges: [Edge] { __data["edges"] }

        /// SearchByLocation.PageInfo
        ///
        /// Parent Type: `PageInfo`
        nonisolated struct PageInfo: FoirAPI.SelectionSet {
          let __data: DataDict
          init(_dataDict: DataDict) { __data = _dataDict }

          static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.PageInfo }
          static var __selections: [ApolloAPI.Selection] { [
            .field("__typename", String.self),
            .fragment(More.self),
          ] }
          static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
            NearbyPostsQuery.Data.SearchByLocation.PageInfo.self,
            More.self
          ] }

          /// True when a forward fetch (after the current page's end) would yield more rows.
          var hasNextPage: Bool { __data["hasNextPage"] }
          /// Cursor for the last row in this page; null when the page is empty.
          var endCursor: String? { __data["endCursor"] }

          struct Fragments: FragmentContainer {
            let __data: DataDict
            init(_dataDict: DataDict) { __data = _dataDict }

            var more: More { _toFragment() }
          }
        }

        /// SearchByLocation.Edge
        ///
        /// Parent Type: `NearbyRecordEdge`
        nonisolated struct Edge: FoirAPI.SelectionSet {
          let __data: DataDict
          init(_dataDict: DataDict) { __data = _dataDict }

          static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.NearbyRecordEdge }
          static var __selections: [ApolloAPI.Selection] { [
            .field("__typename", String.self),
            .field("node", Node.self),
          ] }
          static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
            NearbyPostsQuery.Data.SearchByLocation.Edge.self
          ] }

          var node: Node { __data["node"] }

          /// SearchByLocation.Edge.Node
          ///
          /// Parent Type: `NearbyRecord`
          nonisolated struct Node: FoirAPI.SelectionSet {
            let __data: DataDict
            init(_dataDict: DataDict) { __data = _dataDict }

            static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.NearbyRecord }
            static var __selections: [ApolloAPI.Selection] { [
              .field("__typename", String.self),
              .field("recordId", String.self),
            ] }
            static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
              NearbyPostsQuery.Data.SearchByLocation.Edge.Node.self
            ] }

            var recordId: String { __data["recordId"] }
          }
        }
      }
    }
  }

}