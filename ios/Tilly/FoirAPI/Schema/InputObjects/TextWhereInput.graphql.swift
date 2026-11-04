// @generated
// This file was automatically generated and should not be edited.

@_spi(Internal) @_spi(Unsafe) import ApolloAPI

extension FoirAPI {
  nonisolated struct TextWhereInput: InputObject {
    private(set) var __data: InputDict

    init(_ data: InputDict) {
      __data = data
    }

    init(
      contains: GraphQLNullable<String> = nil,
      endsWith: GraphQLNullable<String> = nil,
      eq: GraphQLNullable<String> = nil,
      gt: GraphQLNullable<String> = nil,
      gte: GraphQLNullable<String> = nil,
      ilike: GraphQLNullable<String> = nil,
      `in`: GraphQLNullable<[String?]> = nil,
      isNotNull: GraphQLNullable<Bool> = nil,
      isNull: GraphQLNullable<Bool> = nil,
      like: GraphQLNullable<String> = nil,
      lt: GraphQLNullable<String> = nil,
      lte: GraphQLNullable<String> = nil,
      ne: GraphQLNullable<String> = nil,
      nin: GraphQLNullable<[String?]> = nil,
      startsWith: GraphQLNullable<String> = nil
    ) {
      __data = InputDict([
        "contains": contains,
        "endsWith": endsWith,
        "eq": eq,
        "gt": gt,
        "gte": gte,
        "ilike": ilike,
        "in": `in`,
        "isNotNull": isNotNull,
        "isNull": isNull,
        "like": like,
        "lt": lt,
        "lte": lte,
        "ne": ne,
        "nin": nin,
        "startsWith": startsWith
      ])
    }

    var contains: GraphQLNullable<String> {
      get { __data["contains"] }
      set { __data["contains"] = newValue }
    }

    var endsWith: GraphQLNullable<String> {
      get { __data["endsWith"] }
      set { __data["endsWith"] = newValue }
    }

    var eq: GraphQLNullable<String> {
      get { __data["eq"] }
      set { __data["eq"] = newValue }
    }

    var gt: GraphQLNullable<String> {
      get { __data["gt"] }
      set { __data["gt"] = newValue }
    }

    var gte: GraphQLNullable<String> {
      get { __data["gte"] }
      set { __data["gte"] = newValue }
    }

    var ilike: GraphQLNullable<String> {
      get { __data["ilike"] }
      set { __data["ilike"] = newValue }
    }

    var `in`: GraphQLNullable<[String?]> {
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

    var like: GraphQLNullable<String> {
      get { __data["like"] }
      set { __data["like"] = newValue }
    }

    var lt: GraphQLNullable<String> {
      get { __data["lt"] }
      set { __data["lt"] = newValue }
    }

    var lte: GraphQLNullable<String> {
      get { __data["lte"] }
      set { __data["lte"] = newValue }
    }

    var ne: GraphQLNullable<String> {
      get { __data["ne"] }
      set { __data["ne"] = newValue }
    }

    var nin: GraphQLNullable<[String?]> {
      get { __data["nin"] }
      set { __data["nin"] = newValue }
    }

    var startsWith: GraphQLNullable<String> {
      get { __data["startsWith"] }
      set { __data["startsWith"] = newValue }
    }
  }

}