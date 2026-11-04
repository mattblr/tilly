// @generated
// This file was automatically generated and should not be edited.

@_spi(Internal) @_spi(Unsafe) import ApolloAPI

extension FoirAPI {
  nonisolated struct FollowUserInput: InputObject {
    private(set) var __data: InputDict

    init(_ data: InputDict) {
      __data = data
    }

    init(
      follower: GraphQLNullable<GraphQLEnum<FollowUserInputFollower>> = nil,
      following: GraphQLNullable<Bool> = nil,
      userId: String
    ) {
      __data = InputDict([
        "follower": follower,
        "following": following,
        "userId": userId
      ])
    }

    var follower: GraphQLNullable<GraphQLEnum<FollowUserInputFollower>> {
      get { __data["follower"] }
      set { __data["follower"] = newValue }
    }

    var following: GraphQLNullable<Bool> {
      get { __data["following"] }
      set { __data["following"] = newValue }
    }

    var userId: String {
      get { __data["userId"] }
      set { __data["userId"] = newValue }
    }
  }

}