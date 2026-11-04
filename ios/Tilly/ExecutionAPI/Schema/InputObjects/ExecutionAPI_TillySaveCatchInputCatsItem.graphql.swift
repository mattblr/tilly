// @generated
// This file was automatically generated and should not be edited.

@_spi(Internal) @_spi(Unsafe) import ApolloAPI

extension ExecutionAPI {
  nonisolated struct TillySaveCatchInputCatsItem: InputObject {
    private(set) var __data: InputDict

    init(_ data: InputDict) {
      __data = data
    }

    init(
      bounds: GraphQLNullable<TillySaveCatchInputCatsItemBounds> = nil,
      catId: GraphQLNullable<String> = nil,
      key: String,
      name: GraphQLNullable<String> = nil,
      position: GraphQLNullable<TillySaveCatchInputCatsItemPosition> = nil,
      vector: GraphQLNullable<[Double]> = nil,
      vectorModel: GraphQLNullable<String> = nil
    ) {
      __data = InputDict([
        "bounds": bounds,
        "catId": catId,
        "key": key,
        "name": name,
        "position": position,
        "vector": vector,
        "vectorModel": vectorModel
      ])
    }

    var bounds: GraphQLNullable<TillySaveCatchInputCatsItemBounds> {
      get { __data["bounds"] }
      set { __data["bounds"] = newValue }
    }

    var catId: GraphQLNullable<String> {
      get { __data["catId"] }
      set { __data["catId"] = newValue }
    }

    var key: String {
      get { __data["key"] }
      set { __data["key"] = newValue }
    }

    var name: GraphQLNullable<String> {
      get { __data["name"] }
      set { __data["name"] = newValue }
    }

    var position: GraphQLNullable<TillySaveCatchInputCatsItemPosition> {
      get { __data["position"] }
      set { __data["position"] = newValue }
    }

    var vector: GraphQLNullable<[Double]> {
      get { __data["vector"] }
      set { __data["vector"] = newValue }
    }

    var vectorModel: GraphQLNullable<String> {
      get { __data["vectorModel"] }
      set { __data["vectorModel"] = newValue }
    }
  }

}