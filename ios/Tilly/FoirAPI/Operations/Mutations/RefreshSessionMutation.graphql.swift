// @generated
// This file was automatically generated and should not be edited.

@_exported import ApolloAPI
@_spi(Execution) @_spi(Unsafe) import ApolloAPI

extension FoirAPI {
  nonisolated struct RefreshSessionMutation: GraphQLMutation {
    static let operationName: String = "RefreshSession"
    static let operationDocument: ApolloAPI.OperationDocument = .init(
      definition: .init(
        #"mutation RefreshSession($refreshToken: String!) { refreshToken(refreshToken: $refreshToken) { __typename token refreshToken userId email } }"#
      ))

    public var refreshToken: String

    public init(refreshToken: String) {
      self.refreshToken = refreshToken
    }

    @_spi(Unsafe) public var __variables: Variables? { ["refreshToken": refreshToken] }

    nonisolated struct Data: FoirAPI.SelectionSet {
      let __data: DataDict
      init(_dataDict: DataDict) { __data = _dataDict }

      static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.Mutation }
      static var __selections: [ApolloAPI.Selection] { [
        .field("refreshToken", RefreshToken?.self, arguments: ["refreshToken": .variable("refreshToken")]),
      ] }
      static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
        RefreshSessionMutation.Data.self
      ] }

      /// Refresh an expired access token
      var refreshToken: RefreshToken? { __data["refreshToken"] }

      /// RefreshToken
      ///
      /// Parent Type: `AuthResult`
      nonisolated struct RefreshToken: FoirAPI.SelectionSet {
        let __data: DataDict
        init(_dataDict: DataDict) { __data = _dataDict }

        static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.AuthResult }
        static var __selections: [ApolloAPI.Selection] { [
          .field("__typename", String.self),
          .field("token", String.self),
          .field("refreshToken", String.self),
          .field("userId", String.self),
          .field("email", String.self),
        ] }
        static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
          RefreshSessionMutation.Data.RefreshToken.self
        ] }

        var token: String { __data["token"] }
        var refreshToken: String { __data["refreshToken"] }
        var userId: String { __data["userId"] }
        var email: String { __data["email"] }
      }
    }
  }

}