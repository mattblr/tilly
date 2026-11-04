// @generated
// This file was automatically generated and should not be edited.

@_exported import ApolloAPI
@_spi(Execution) @_spi(Unsafe) import ApolloAPI

extension FoirAPI {
  nonisolated struct StartProviderSignInMutation: GraphQLMutation {
    static let operationName: String = "StartProviderSignIn"
    static let operationDocument: ApolloAPI.OperationDocument = .init(
      definition: .init(
        #"mutation StartProviderSignIn($providerKey: String!) { signInWithProvider(input: { providerKey: $providerKey }) { __typename redirectUrl step { __typename id token } } }"#
      ))

    public var providerKey: String

    public init(providerKey: String) {
      self.providerKey = providerKey
    }

    @_spi(Unsafe) public var __variables: Variables? { ["providerKey": providerKey] }

    nonisolated struct Data: FoirAPI.SelectionSet {
      let __data: DataDict
      init(_dataDict: DataDict) { __data = _dataDict }

      static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.Mutation }
      static var __selections: [ApolloAPI.Selection] { [
        .field("signInWithProvider", SignInWithProvider?.self, arguments: ["input": ["providerKey": .variable("providerKey")]]),
      ] }
      static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
        StartProviderSignInMutation.Data.self
      ] }

      var signInWithProvider: SignInWithProvider? { __data["signInWithProvider"] }

      /// SignInWithProvider
      ///
      /// Parent Type: `ProviderSignInResponse`
      nonisolated struct SignInWithProvider: FoirAPI.SelectionSet {
        let __data: DataDict
        init(_dataDict: DataDict) { __data = _dataDict }

        static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.ProviderSignInResponse }
        static var __selections: [ApolloAPI.Selection] { [
          .field("__typename", String.self),
          .field("redirectUrl", String?.self),
          .field("step", Step?.self),
        ] }
        static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
          StartProviderSignInMutation.Data.SignInWithProvider.self
        ] }

        var redirectUrl: String? { __data["redirectUrl"] }
        var step: Step? { __data["step"] }

        /// SignInWithProvider.Step
        ///
        /// Parent Type: `SignInStep`
        nonisolated struct Step: FoirAPI.SelectionSet {
          let __data: DataDict
          init(_dataDict: DataDict) { __data = _dataDict }

          static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.SignInStep }
          static var __selections: [ApolloAPI.Selection] { [
            .field("__typename", String.self),
            .field("id", String.self),
            .field("token", String.self),
          ] }
          static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
            StartProviderSignInMutation.Data.SignInWithProvider.Step.self
          ] }

          var id: String { __data["id"] }
          var token: String { __data["token"] }
        }
      }
    }
  }

}