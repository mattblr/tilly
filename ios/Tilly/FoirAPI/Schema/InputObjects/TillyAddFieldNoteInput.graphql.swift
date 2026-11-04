// @generated
// This file was automatically generated and should not be edited.

@_spi(Internal) @_spi(Unsafe) import ApolloAPI

extension FoirAPI {
  nonisolated struct TillyAddFieldNoteInput: InputObject {
    private(set) var __data: InputDict

    init(_ data: InputDict) {
      __data = data
    }

    init(
      photoKey: String,
      tags: GraphQLNullable<[String]> = nil,
      text: GraphQLNullable<String> = nil
    ) {
      __data = InputDict([
        "photoKey": photoKey,
        "tags": tags,
        "text": text
      ])
    }

    var photoKey: String {
      get { __data["photoKey"] }
      set { __data["photoKey"] = newValue }
    }

    var tags: GraphQLNullable<[String]> {
      get { __data["tags"] }
      set { __data["tags"] = newValue }
    }

    var text: GraphQLNullable<String> {
      get { __data["text"] }
      set { __data["text"] = newValue }
    }
  }

}