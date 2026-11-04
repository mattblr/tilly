// @generated
// This file was automatically generated and should not be edited.

import ApolloAPI

nonisolated protocol SafetyAPI_SelectionSet: ApolloAPI.SelectionSet & ApolloAPI.RootSelectionSet
where Schema == SafetyAPI.SchemaMetadata {}

nonisolated protocol SafetyAPI_InlineFragment: ApolloAPI.SelectionSet & ApolloAPI.InlineFragment
where Schema == SafetyAPI.SchemaMetadata {}

nonisolated protocol SafetyAPI_MutableSelectionSet: ApolloAPI.MutableRootSelectionSet
where Schema == SafetyAPI.SchemaMetadata {}

nonisolated protocol SafetyAPI_MutableInlineFragment: ApolloAPI.MutableSelectionSet & ApolloAPI.InlineFragment
where Schema == SafetyAPI.SchemaMetadata {}

extension SafetyAPI {
  typealias SelectionSet = SafetyAPI_SelectionSet

  typealias InlineFragment = SafetyAPI_InlineFragment

  typealias MutableSelectionSet = SafetyAPI_MutableSelectionSet

  typealias MutableInlineFragment = SafetyAPI_MutableInlineFragment

  nonisolated enum SchemaMetadata: ApolloAPI.SchemaMetadata {
    static let configuration: any ApolloAPI.SchemaConfiguration.Type = SchemaConfiguration.self

    private static let objectTypeMap: [String: ApolloAPI.Object] = [
      "ExecuteReportContentPayload": SafetyAPI.Objects.ExecuteReportContentPayload,
      "ExecuteSetUserBlockPayload": SafetyAPI.Objects.ExecuteSetUserBlockPayload,
      "Mutation": SafetyAPI.Objects.Mutation,
      "OperationExecution": SafetyAPI.Objects.OperationExecution,
      "PageInfo": SafetyAPI.Objects.PageInfo,
      "Query": SafetyAPI.Objects.Query,
      "ReportContentOutput": SafetyAPI.Objects.ReportContentOutput,
      "SetUserBlockOutput": SafetyAPI.Objects.SetUserBlockOutput,
      "UserBlock": SafetyAPI.Objects.UserBlock,
      "UserBlockConnection": SafetyAPI.Objects.UserBlockConnection,
      "UserBlockEdge": SafetyAPI.Objects.UserBlockEdge
    ]

    static func objectType(forTypename typename: String) -> ApolloAPI.Object? {
      objectTypeMap[typename]
    }
  }

  nonisolated enum Objects {}
  nonisolated enum Interfaces {}
  nonisolated enum Unions {}

}