// @generated
// This file was automatically generated and should not be edited.

@_exported import ApolloAPI
@_spi(Execution) @_spi(Unsafe) import ApolloAPI

extension SafetyAPI {
  nonisolated struct ReportContentMutation: GraphQLMutation {
    static let operationName: String = "ReportContent"
    static let operationDocument: ApolloAPI.OperationDocument = .init(
      definition: .init(
        #"mutation ReportContent($input: ReportContentInput!, $key: String) { executeReportContent(input: $input, idempotencyKey: $key) { __typename result { __typename ok id } execution { __typename id status error } } }"#
      ))

    public var input: ReportContentInput
    public var key: GraphQLNullable<String>

    public init(
      input: ReportContentInput,
      key: GraphQLNullable<String>
    ) {
      self.input = input
      self.key = key
    }

    @_spi(Unsafe) public var __variables: Variables? { [
      "input": input,
      "key": key
    ] }

    nonisolated struct Data: SafetyAPI.SelectionSet {
      let __data: DataDict
      init(_dataDict: DataDict) { __data = _dataDict }

      static var __parentType: any ApolloAPI.ParentType { SafetyAPI.Objects.Mutation }
      static var __selections: [ApolloAPI.Selection] { [
        .field("executeReportContent", ExecuteReportContent?.self, arguments: [
          "input": .variable("input"),
          "idempotencyKey": .variable("key")
        ]),
      ] }
      static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
        ReportContentMutation.Data.self
      ] }

      /// Execute the Report content for review operation
      var executeReportContent: ExecuteReportContent? { __data["executeReportContent"] }

      /// ExecuteReportContent
      ///
      /// Parent Type: `ExecuteReportContentPayload`
      nonisolated struct ExecuteReportContent: SafetyAPI.SelectionSet {
        let __data: DataDict
        init(_dataDict: DataDict) { __data = _dataDict }

        static var __parentType: any ApolloAPI.ParentType { SafetyAPI.Objects.ExecuteReportContentPayload }
        static var __selections: [ApolloAPI.Selection] { [
          .field("__typename", String.self),
          .field("result", Result?.self),
          .field("execution", Execution.self),
        ] }
        static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
          ReportContentMutation.Data.ExecuteReportContent.self
        ] }

        /// Typed result; populated on SYNC completion, null on ASYNC dispatch.
        var result: Result? { __data["result"] }
        /// Execution row. Use execution.id to subscribe on operationReportContentExecution.
        var execution: Execution { __data["execution"] }

        /// ExecuteReportContent.Result
        ///
        /// Parent Type: `ReportContentOutput`
        nonisolated struct Result: SafetyAPI.SelectionSet {
          let __data: DataDict
          init(_dataDict: DataDict) { __data = _dataDict }

          static var __parentType: any ApolloAPI.ParentType { SafetyAPI.Objects.ReportContentOutput }
          static var __selections: [ApolloAPI.Selection] { [
            .field("__typename", String.self),
            .field("ok", Bool?.self),
            .field("id", String?.self),
          ] }
          static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
            ReportContentMutation.Data.ExecuteReportContent.Result.self
          ] }

          var ok: Bool? { __data["ok"] }
          var id: String? { __data["id"] }
        }

        /// ExecuteReportContent.Execution
        ///
        /// Parent Type: `OperationExecution`
        nonisolated struct Execution: SafetyAPI.SelectionSet {
          let __data: DataDict
          init(_dataDict: DataDict) { __data = _dataDict }

          static var __parentType: any ApolloAPI.ParentType { SafetyAPI.Objects.OperationExecution }
          static var __selections: [ApolloAPI.Selection] { [
            .field("__typename", String.self),
            .field("id", String.self),
            .field("status", GraphQLEnum<SafetyAPI.OperationExecutionStatus>.self),
            .field("error", String?.self),
          ] }
          static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
            ReportContentMutation.Data.ExecuteReportContent.Execution.self
          ] }

          var id: String { __data["id"] }
          var status: GraphQLEnum<SafetyAPI.OperationExecutionStatus> { __data["status"] }
          var error: String? { __data["error"] }
        }
      }
    }
  }

}