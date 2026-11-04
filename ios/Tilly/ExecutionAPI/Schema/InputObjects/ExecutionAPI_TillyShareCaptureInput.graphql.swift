// @generated
// This file was automatically generated and should not be edited.

@_spi(Internal) @_spi(Unsafe) import ApolloAPI

extension ExecutionAPI {
  nonisolated struct TillyShareCaptureInput: InputObject {
    private(set) var __data: InputDict

    init(_ data: InputDict) {
      __data = data
    }

    init(
      comment: GraphQLNullable<String> = nil,
      note: GraphQLNullable<String> = nil,
      photoKey: GraphQLNullable<String> = nil,
      reposted: GraphQLNullable<Bool> = nil,
      reshareOf: GraphQLNullable<String> = nil
    ) {
      __data = InputDict([
        "comment": comment,
        "note": note,
        "photoKey": photoKey,
        "reposted": reposted,
        "reshareOf": reshareOf
      ])
    }

    var comment: GraphQLNullable<String> {
      get { __data["comment"] }
      set { __data["comment"] = newValue }
    }

    var note: GraphQLNullable<String> {
      get { __data["note"] }
      set { __data["note"] = newValue }
    }

    var photoKey: GraphQLNullable<String> {
      get { __data["photoKey"] }
      set { __data["photoKey"] = newValue }
    }

    var reposted: GraphQLNullable<Bool> {
      get { __data["reposted"] }
      set { __data["reposted"] = newValue }
    }

    var reshareOf: GraphQLNullable<String> {
      get { __data["reshareOf"] }
      set { __data["reshareOf"] = newValue }
    }
  }

}