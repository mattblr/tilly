// @generated
// This file was automatically generated and should not be edited.

@_exported import ApolloAPI
@_spi(Execution) @_spi(Unsafe) import ApolloAPI

extension ExecutionAPI {
  nonisolated struct OwnOperationRunQuery: GraphQLQuery {
    static let operationName: String = "OwnOperationRun"
    static let operationDocument: ApolloAPI.OperationDocument = .init(
      definition: .init(
        #"query OwnOperationRun($id: String!) { operationExecution(id: $id) { __typename id operationKey status error result } }"#
      ))

    public var id: String

    public init(id: String) {
      self.id = id
    }

    @_spi(Unsafe) public var __variables: Variables? { ["id": id] }

    nonisolated struct Data: ExecutionAPI.SelectionSet {
      let __data: DataDict
      init(_dataDict: DataDict) { __data = _dataDict }

      static var __parentType: any ApolloAPI.ParentType { ExecutionAPI.Objects.Query }
      static var __selections: [ApolloAPI.Selection] { [
        .field("operationExecution", OperationExecution?.self, arguments: ["id": .variable("id")]),
      ] }
      static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
        OwnOperationRunQuery.Data.self
      ] }

      /// Get an operation execution by ID
      var operationExecution: OperationExecution? { __data["operationExecution"] }

      /// OperationExecution
      ///
      /// Parent Type: `OperationExecution`
      nonisolated struct OperationExecution: ExecutionAPI.SelectionSet {
        let __data: DataDict
        init(_dataDict: DataDict) { __data = _dataDict }

        static var __parentType: any ApolloAPI.ParentType { ExecutionAPI.Objects.OperationExecution }
        static var __selections: [ApolloAPI.Selection] { [
          .field("__typename", String.self),
          .field("id", String.self),
          .field("operationKey", String.self),
          .field("status", GraphQLEnum<ExecutionAPI.OperationExecutionStatus>.self),
          .field("error", String?.self),
          .field("result", ExecutionAPI.JSON?.self),
        ] }
        static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
          OwnOperationRunQuery.Data.OperationExecution.self
        ] }

        var id: String { __data["id"] }
        var operationKey: String { __data["operationKey"] }
        var status: GraphQLEnum<ExecutionAPI.OperationExecutionStatus> { __data["status"] }
        var error: String? { __data["error"] }
        var result: ExecutionAPI.JSON? { __data["result"] }
      }
    }
  }

}