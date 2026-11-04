// @generated
// This file was automatically generated and should not be edited.

@_spi(Internal) @_spi(Unsafe) import ApolloAPI

extension SafetyAPI {
  nonisolated struct ReportContentInput: InputObject {
    private(set) var __data: InputDict

    init(_ data: InputDict) {
      __data = data
    }

    init(
      details: GraphQLNullable<String> = nil,
      reason: GraphQLEnum<ReportContentInputReason>,
      targetId: String,
      targetType: GraphQLEnum<ReportContentInputTargetType>
    ) {
      __data = InputDict([
        "details": details,
        "reason": reason,
        "targetId": targetId,
        "targetType": targetType
      ])
    }

    var details: GraphQLNullable<String> {
      get { __data["details"] }
      set { __data["details"] = newValue }
    }

    var reason: GraphQLEnum<ReportContentInputReason> {
      get { __data["reason"] }
      set { __data["reason"] = newValue }
    }

    var targetId: String {
      get { __data["targetId"] }
      set { __data["targetId"] = newValue }
    }

    var targetType: GraphQLEnum<ReportContentInputTargetType> {
      get { __data["targetType"] }
      set { __data["targetType"] = newValue }
    }
  }

}