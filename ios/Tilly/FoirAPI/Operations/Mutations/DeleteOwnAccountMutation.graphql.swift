// @generated
// This file was automatically generated and should not be edited.

@_exported import ApolloAPI
@_spi(Execution) @_spi(Unsafe) import ApolloAPI

extension FoirAPI {
  nonisolated struct DeleteOwnAccountMutation: GraphQLMutation {
    static let operationName: String = "DeleteOwnAccount"
    static let operationDocument: ApolloAPI.OperationDocument = .init(
      definition: .init(
        #"mutation DeleteOwnAccount { deleteMyAccount(confirm: true) { __typename success recordsDeleted filesDeleted } }"#
      ))

    public init() {}

    nonisolated struct Data: FoirAPI.SelectionSet {
      let __data: DataDict
      init(_dataDict: DataDict) { __data = _dataDict }

      static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.Mutation }
      static var __selections: [ApolloAPI.Selection] { [
        .field("deleteMyAccount", DeleteMyAccount?.self, arguments: ["confirm": true]),
      ] }
      static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
        DeleteOwnAccountMutation.Data.self
      ] }

      var deleteMyAccount: DeleteMyAccount? { __data["deleteMyAccount"] }

      /// DeleteMyAccount
      ///
      /// Parent Type: `DeleteAccountResult`
      nonisolated struct DeleteMyAccount: FoirAPI.SelectionSet {
        let __data: DataDict
        init(_dataDict: DataDict) { __data = _dataDict }

        static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.DeleteAccountResult }
        static var __selections: [ApolloAPI.Selection] { [
          .field("__typename", String.self),
          .field("success", Bool.self),
          .field("recordsDeleted", Int.self),
          .field("filesDeleted", Int.self),
        ] }
        static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
          DeleteOwnAccountMutation.Data.DeleteMyAccount.self
        ] }

        var success: Bool { __data["success"] }
        var recordsDeleted: Int { __data["recordsDeleted"] }
        var filesDeleted: Int { __data["filesDeleted"] }
      }
    }
  }

}