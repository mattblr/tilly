// @generated
// This file was automatically generated and should not be edited.

@_exported import ApolloAPI
@_spi(Execution) @_spi(Unsafe) import ApolloAPI

extension FoirAPI {
  nonisolated struct CatBiographyQuery: GraphQLQuery {
    static let operationName: String = "CatBiography"
    static let operationDocument: ApolloAPI.OperationDocument = .init(
      definition: .init(
        #"query CatBiography($id: String!) { cat(id: $id) { __typename _id name } }"#
      ))

    public var id: String

    public init(id: String) {
      self.id = id
    }

    @_spi(Unsafe) public var __variables: Variables? { ["id": id] }

    nonisolated struct Data: FoirAPI.SelectionSet {
      let __data: DataDict
      init(_dataDict: DataDict) { __data = _dataDict }

      static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.Query }
      static var __selections: [ApolloAPI.Selection] { [
        .field("cat", Cat?.self, arguments: ["id": .variable("id")]),
      ] }
      static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
        CatBiographyQuery.Data.self
      ] }

      /// Get a single Cat by natural key or ID
      var cat: Cat? { __data["cat"] }

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
          CatBiographyQuery.Data.Cat.self
        ] }

        var _id: String { __data["_id"] }
        var name: String? { __data["name"] }
      }
    }
  }

}