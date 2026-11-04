// @generated
// This file was automatically generated and should not be edited.

@_exported import ApolloAPI
@_spi(Execution) @_spi(Unsafe) import ApolloAPI

extension FoirAPI {
  nonisolated struct RequestSignInCodeMutation: GraphQLMutation {
    static let operationName: String = "RequestSignInCode"
    static let operationDocument: ApolloAPI.OperationDocument = .init(
      definition: .init(
        #"mutation RequestSignInCode($email: String!) { requestOTP(email: $email) { __typename id token } }"#
      ))

    public var email: String

    public init(email: String) {
      self.email = email
    }

    @_spi(Unsafe) public var __variables: Variables? { ["email": email] }

    nonisolated struct Data: FoirAPI.SelectionSet {
      let __data: DataDict
      init(_dataDict: DataDict) { __data = _dataDict }

      static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.Mutation }
      static var __selections: [ApolloAPI.Selection] { [
        .field("requestOTP", RequestOTP.self, arguments: ["email": .variable("email")]),
      ] }
      static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
        RequestSignInCodeMutation.Data.self
      ] }

      /// Send the address a one-time code to sign in with, and answer the step to post it to. A step for every address, held or not.
      var requestOTP: RequestOTP { __data["requestOTP"] }

      /// RequestOTP
      ///
      /// Parent Type: `SignInStep`
      nonisolated struct RequestOTP: FoirAPI.SelectionSet {
        let __data: DataDict
        init(_dataDict: DataDict) { __data = _dataDict }

        static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.SignInStep }
        static var __selections: [ApolloAPI.Selection] { [
          .field("__typename", String.self),
          .field("id", String.self),
          .field("token", String.self),
        ] }
        static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
          RequestSignInCodeMutation.Data.RequestOTP.self
        ] }

        var id: String { __data["id"] }
        var token: String { __data["token"] }
      }
    }
  }

}