// @generated
// This file was automatically generated and should not be edited.

@_spi(Internal) @_spi(Unsafe) import ApolloAPI

extension ExecutionAPI {
  nonisolated struct TillySaveProfileInput: InputObject {
    private(set) var __data: InputDict

    init(_ data: InputDict) {
      __data = data
    }

    init(
      bio: GraphQLNullable<String> = nil,
      displayName: String,
      photoFileId: GraphQLNullable<String> = nil,
      privacy: GraphQLNullable<GraphQLEnum<TillySaveProfileInputPrivacy>> = nil,
      removePhoto: GraphQLNullable<Bool> = nil,
      username: String
    ) {
      __data = InputDict([
        "bio": bio,
        "displayName": displayName,
        "photoFileId": photoFileId,
        "privacy": privacy,
        "removePhoto": removePhoto,
        "username": username
      ])
    }

    var bio: GraphQLNullable<String> {
      get { __data["bio"] }
      set { __data["bio"] = newValue }
    }

    var displayName: String {
      get { __data["displayName"] }
      set { __data["displayName"] = newValue }
    }

    var photoFileId: GraphQLNullable<String> {
      get { __data["photoFileId"] }
      set { __data["photoFileId"] = newValue }
    }

    var privacy: GraphQLNullable<GraphQLEnum<TillySaveProfileInputPrivacy>> {
      get { __data["privacy"] }
      set { __data["privacy"] = newValue }
    }

    var removePhoto: GraphQLNullable<Bool> {
      get { __data["removePhoto"] }
      set { __data["removePhoto"] = newValue }
    }

    var username: String {
      get { __data["username"] }
      set { __data["username"] = newValue }
    }
  }

}