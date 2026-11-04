// @generated
// This file was automatically generated and should not be edited.

@_exported import ApolloAPI
@_spi(Execution) @_spi(Unsafe) import ApolloAPI

extension FoirAPI {
  nonisolated struct LikeCaptureMutation: GraphQLMutation {
    static let operationName: String = "LikeCapture"
    static let operationDocument: ApolloAPI.OperationDocument = .init(
      definition: .init(
        #"mutation LikeCapture($input: LikeCaptureInput!, $key: String) { executeLikeCapture(input: $input, concurrencyKey: $key) { __typename result { __typename ok active error } execution { __typename status error } } }"#
      ))

    public var input: LikeCaptureInput
    public var key: GraphQLNullable<String>

    public init(
      input: LikeCaptureInput,
      key: GraphQLNullable<String>
    ) {
      self.input = input
      self.key = key
    }

    @_spi(Unsafe) public var __variables: Variables? { [
      "input": input,
      "key": key
    ] }

    nonisolated struct Data: FoirAPI.SelectionSet {
      let __data: DataDict
      init(_dataDict: DataDict) { __data = _dataDict }

      static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.Mutation }
      static var __selections: [ApolloAPI.Selection] { [
        .field("executeLikeCapture", ExecuteLikeCapture?.self, arguments: [
          "input": .variable("input"),
          "concurrencyKey": .variable("key")
        ]),
      ] }
      static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
        LikeCaptureMutation.Data.self
      ] }

      /// Execute the Like a capture operation
      var executeLikeCapture: ExecuteLikeCapture? { __data["executeLikeCapture"] }

      /// ExecuteLikeCapture
      ///
      /// Parent Type: `ExecuteLikeCapturePayload`
      nonisolated struct ExecuteLikeCapture: FoirAPI.SelectionSet {
        let __data: DataDict
        init(_dataDict: DataDict) { __data = _dataDict }

        static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.ExecuteLikeCapturePayload }
        static var __selections: [ApolloAPI.Selection] { [
          .field("__typename", String.self),
          .field("result", Result?.self),
          .field("execution", Execution.self),
        ] }
        static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
          LikeCaptureMutation.Data.ExecuteLikeCapture.self
        ] }

        /// Typed result; populated on SYNC completion, null on ASYNC dispatch.
        var result: Result? { __data["result"] }
        /// Execution row. Use execution.id to subscribe on operationLikeCaptureExecution.
        var execution: Execution { __data["execution"] }

        /// ExecuteLikeCapture.Result
        ///
        /// Parent Type: `LikeCaptureOutput`
        nonisolated struct Result: FoirAPI.SelectionSet {
          let __data: DataDict
          init(_dataDict: DataDict) { __data = _dataDict }

          static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.LikeCaptureOutput }
          static var __selections: [ApolloAPI.Selection] { [
            .field("__typename", String.self),
            .field("ok", Bool?.self),
            .field("active", Bool?.self),
            .field("error", String?.self),
          ] }
          static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
            LikeCaptureMutation.Data.ExecuteLikeCapture.Result.self
          ] }

          var ok: Bool? { __data["ok"] }
          var active: Bool? { __data["active"] }
          var error: String? { __data["error"] }
        }

        /// ExecuteLikeCapture.Execution
        ///
        /// Parent Type: `OperationExecution`
        nonisolated struct Execution: FoirAPI.SelectionSet {
          let __data: DataDict
          init(_dataDict: DataDict) { __data = _dataDict }

          static var __parentType: any ApolloAPI.ParentType { FoirAPI.Objects.OperationExecution }
          static var __selections: [ApolloAPI.Selection] { [
            .field("__typename", String.self),
            .field("status", GraphQLEnum<FoirAPI.OperationExecutionStatus>.self),
            .field("error", String?.self),
          ] }
          static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
            LikeCaptureMutation.Data.ExecuteLikeCapture.Execution.self
          ] }

          var status: GraphQLEnum<FoirAPI.OperationExecutionStatus> { __data["status"] }
          var error: String? { __data["error"] }
        }
      }
    }
  }

}