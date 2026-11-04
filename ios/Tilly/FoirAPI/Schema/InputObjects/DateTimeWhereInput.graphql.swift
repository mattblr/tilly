// @generated
// This file was automatically generated and should not be edited.

@_spi(Internal) @_spi(Unsafe) import ApolloAPI

extension FoirAPI {
  nonisolated struct DateTimeWhereInput: InputObject {
    private(set) var __data: InputDict

    init(_ data: InputDict) {
      __data = data
    }

    init(
      eq: GraphQLNullable<DateTime> = nil,
      gt: GraphQLNullable<DateTime> = nil,
      gte: GraphQLNullable<DateTime> = nil,
      `in`: GraphQLNullable<[DateTime?]> = nil,
      isNotNull: GraphQLNullable<Bool> = nil,
      isNull: GraphQLNullable<Bool> = nil,
      lt: GraphQLNullable<DateTime> = nil,
      lte: GraphQLNullable<DateTime> = nil,
      ne: GraphQLNullable<DateTime> = nil,
      nin: GraphQLNullable<[DateTime?]> = nil
    ) {
      __data = InputDict([
        "eq": eq,
        "gt": gt,
        "gte": gte,
        "in": `in`,
        "isNotNull": isNotNull,
        "isNull": isNull,
        "lt": lt,
        "lte": lte,
        "ne": ne,
        "nin": nin
      ])
    }

    var eq: GraphQLNullable<DateTime> {
      get { __data["eq"] }
      set { __data["eq"] = newValue }
    }

    var gt: GraphQLNullable<DateTime> {
      get { __data["gt"] }
      set { __data["gt"] = newValue }
    }

    var gte: GraphQLNullable<DateTime> {
      get { __data["gte"] }
      set { __data["gte"] = newValue }
    }

    var `in`: GraphQLNullable<[DateTime?]> {
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

    var lt: GraphQLNullable<DateTime> {
      get { __data["lt"] }
      set { __data["lt"] = newValue }
    }

    var lte: GraphQLNullable<DateTime> {
      get { __data["lte"] }
      set { __data["lte"] = newValue }
    }

    var ne: GraphQLNullable<DateTime> {
      get { __data["ne"] }
      set { __data["ne"] = newValue }
    }

    var nin: GraphQLNullable<[DateTime?]> {
      get { __data["nin"] }
      set { __data["nin"] = newValue }
    }
  }

}