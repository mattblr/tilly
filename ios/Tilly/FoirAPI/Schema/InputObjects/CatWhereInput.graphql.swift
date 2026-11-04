// @generated
// This file was automatically generated and should not be edited.

@_spi(Internal) @_spi(Unsafe) import ApolloAPI

extension FoirAPI {
  nonisolated struct CatWhereInput: InputObject {
    private(set) var __data: InputDict

    init(_ data: InputDict) {
      __data = data
    }

    init(
      and: GraphQLNullable<[CatWhereInput?]> = nil,
      not: GraphQLNullable<CatWhereInput> = nil,
      or: GraphQLNullable<[CatWhereInput?]> = nil,
      area: GraphQLNullable<JSON> = nil,
      cell1: GraphQLNullable<TextWhereInput> = nil,
      cell2: GraphQLNullable<TextWhereInput> = nil,
      cell3: GraphQLNullable<TextWhereInput> = nil,
      cell4: GraphQLNullable<TextWhereInput> = nil,
      cell5: GraphQLNullable<TextWhereInput> = nil,
      cell6: GraphQLNullable<TextWhereInput> = nil,
      createdAt: GraphQLNullable<DateTimeWhereInput> = nil,
      createdBy: GraphQLNullable<IDWhereInput> = nil,
      id: GraphQLNullable<IDWhereInput> = nil,
      name: GraphQLNullable<TextWhereInput> = nil,
      naturalKey: GraphQLNullable<TextWhereInput> = nil,
      ownerId: GraphQLNullable<IDWhereInput> = nil,
      ownerKind: GraphQLNullable<TextWhereInput> = nil,
      updatedAt: GraphQLNullable<DateTimeWhereInput> = nil,
      updatedBy: GraphQLNullable<IDWhereInput> = nil
    ) {
      __data = InputDict([
        "AND": and,
        "NOT": not,
        "OR": or,
        "area": area,
        "cell1": cell1,
        "cell2": cell2,
        "cell3": cell3,
        "cell4": cell4,
        "cell5": cell5,
        "cell6": cell6,
        "createdAt": createdAt,
        "createdBy": createdBy,
        "id": id,
        "name": name,
        "naturalKey": naturalKey,
        "ownerId": ownerId,
        "ownerKind": ownerKind,
        "updatedAt": updatedAt,
        "updatedBy": updatedBy
      ])
    }

    var and: GraphQLNullable<[CatWhereInput?]> {
      get { __data["AND"] }
      set { __data["AND"] = newValue }
    }

    var not: GraphQLNullable<CatWhereInput> {
      get { __data["NOT"] }
      set { __data["NOT"] = newValue }
    }

    var or: GraphQLNullable<[CatWhereInput?]> {
      get { __data["OR"] }
      set { __data["OR"] = newValue }
    }

    var area: GraphQLNullable<JSON> {
      get { __data["area"] }
      set { __data["area"] = newValue }
    }

    var cell1: GraphQLNullable<TextWhereInput> {
      get { __data["cell1"] }
      set { __data["cell1"] = newValue }
    }

    var cell2: GraphQLNullable<TextWhereInput> {
      get { __data["cell2"] }
      set { __data["cell2"] = newValue }
    }

    var cell3: GraphQLNullable<TextWhereInput> {
      get { __data["cell3"] }
      set { __data["cell3"] = newValue }
    }

    var cell4: GraphQLNullable<TextWhereInput> {
      get { __data["cell4"] }
      set { __data["cell4"] = newValue }
    }

    var cell5: GraphQLNullable<TextWhereInput> {
      get { __data["cell5"] }
      set { __data["cell5"] = newValue }
    }

    var cell6: GraphQLNullable<TextWhereInput> {
      get { __data["cell6"] }
      set { __data["cell6"] = newValue }
    }

    var createdAt: GraphQLNullable<DateTimeWhereInput> {
      get { __data["createdAt"] }
      set { __data["createdAt"] = newValue }
    }

    var createdBy: GraphQLNullable<IDWhereInput> {
      get { __data["createdBy"] }
      set { __data["createdBy"] = newValue }
    }

    var id: GraphQLNullable<IDWhereInput> {
      get { __data["id"] }
      set { __data["id"] = newValue }
    }

    var name: GraphQLNullable<TextWhereInput> {
      get { __data["name"] }
      set { __data["name"] = newValue }
    }

    var naturalKey: GraphQLNullable<TextWhereInput> {
      get { __data["naturalKey"] }
      set { __data["naturalKey"] = newValue }
    }

    var ownerId: GraphQLNullable<IDWhereInput> {
      get { __data["ownerId"] }
      set { __data["ownerId"] = newValue }
    }

    var ownerKind: GraphQLNullable<TextWhereInput> {
      get { __data["ownerKind"] }
      set { __data["ownerKind"] = newValue }
    }

    var updatedAt: GraphQLNullable<DateTimeWhereInput> {
      get { __data["updatedAt"] }
      set { __data["updatedAt"] = newValue }
    }

    var updatedBy: GraphQLNullable<IDWhereInput> {
      get { __data["updatedBy"] }
      set { __data["updatedBy"] = newValue }
    }
  }

}