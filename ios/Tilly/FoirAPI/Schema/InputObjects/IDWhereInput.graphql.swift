// @generated
// This file was automatically generated and should not be edited.

@_spi(Internal) @_spi(Unsafe) import ApolloAPI

extension FoirAPI {
  nonisolated struct IDWhereInput: InputObject {
    private(set) var __data: InputDict

    init(_ data: InputDict) {
      __data = data
    }

    init(
      eq: GraphQLNullable<ID> = nil,
      `in`: GraphQLNullable<[ID?]> = nil,
      isNotNull: GraphQLNullable<Bool> = nil,
      isNull: GraphQLNullable<Bool> = nil,
      ne: GraphQLNullable<ID> = nil,
      nin: GraphQLNullable<[ID?]> = nil
    ) {
      __data = InputDict([
        "eq": eq,
        "in": `in`,
        "isNotNull": isNotNull,
        "isNull": isNull,
        "ne": ne,
        "nin": nin
      ])
    }

    var eq: GraphQLNullable<ID> {
      get { __data["eq"] }
      set { __data["eq"] = newValue }
    }

    var `in`: GraphQLNullable<[ID?]> {
      get { __data["in"] }
      set { __data["in"] = newValue }
    }

    var isNotNull: GraphQLNullable<Bool> {
      get { __data["isNotNull"] }
      set { __data["isNotNull"] = newValue }
    }

    var isNull: GraphQLNullable<Bool> {
      get { __data["isNull"] }
      set { __data["isNull"] = newValue }
    }

    var ne: GraphQLNullable<ID> {
      get { __data["ne"] }
      set { __data["ne"] = newValue }
    }

    var nin: GraphQLNullable<[ID?]> {
      get { __data["nin"] }
      set { __data["nin"] = newValue }
    }
  }

}