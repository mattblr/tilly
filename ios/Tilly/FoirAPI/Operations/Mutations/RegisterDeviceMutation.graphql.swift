// @generated
// This file was automatically generated and should not be edited.

@_exported import ApolloAPI
@_spi(Execution) @_spi(Unsafe) import ApolloAPI

extension FoirAPI {
  nonisolated struct RegisterDeviceMutation: GraphQLMutation {
    static let operationName: String = "RegisterDevice"
    static let operationDocument: ApolloAPI.OperationDocument = .init(
      definition: .init(
        #"mutation RegisterDevice($input: RegisterDeviceTokenInput!) { registerDeviceToken(input: $input) }"#
      ))

    public var input: RegisterDeviceTokenInput

    public init(input: RegisterDeviceTokenInput) {
      self.input = input
    }

    @_spi(Unsafe) public var __variables: Variables? { ["input": input] }

    nonisolated struct Data: FoirAPI.SelectionSet {
      let __data: DataDict
      init(_dataDict: DataDict) { __data = _dataDict }

      static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.Mutation }
      static var __selections: [ApolloAPI.Selection] { [
        .field("registerDeviceToken", Bool.self, arguments: ["input": .variable("input")]),
      ] }
      static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
        RegisterDeviceMutation.Data.self
      ] }

      var registerDeviceToken: Bool { __data["registerDeviceToken"] }
    }
  }

}