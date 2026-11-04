// @generated
// This file was automatically generated and should not be edited.

import ApolloAPI

nonisolated protocol ExecutionAPI_SelectionSet: ApolloAPI.SelectionSet & ApolloAPI.RootSelectionSet
where Schema == ExecutionAPI.SchemaMetadata {}

nonisolated protocol ExecutionAPI_InlineFragment: ApolloAPI.SelectionSet & ApolloAPI.InlineFragment
where Schema == ExecutionAPI.SchemaMetadata {}

nonisolated protocol ExecutionAPI_MutableSelectionSet: ApolloAPI.MutableRootSelectionSet
where Schema == ExecutionAPI.SchemaMetadata {}

nonisolated protocol ExecutionAPI_MutableInlineFragment: ApolloAPI.MutableSelectionSet & ApolloAPI.InlineFragment
where Schema == ExecutionAPI.SchemaMetadata {}

extension ExecutionAPI {
  typealias SelectionSet = ExecutionAPI_SelectionSet

  typealias InlineFragment = ExecutionAPI_InlineFragment

  typealias MutableSelectionSet = ExecutionAPI_MutableSelectionSet

  typealias MutableInlineFragment = ExecutionAPI_MutableInlineFragment

  nonisolated enum SchemaMetadata: ApolloAPI.SchemaMetadata {
    static let configuration: any ApolloAPI.SchemaConfiguration.Type = SchemaConfiguration.self

    private static let objectTypeMap: [String: ApolloAPI.Object] = [
      "AggregateGroup": ExecutionAPI.Objects.AggregateGroup,
      "AggregateResult": ExecutionAPI.Objects.AggregateResult,
      "AppSettings": ExecutionAPI.Objects.AppSettings,
      "AppearanceAccount": ExecutionAPI.Objects.AppearanceAccount,
      "ExecuteFinalizeCapturePayload": ExecutionAPI.Objects.ExecuteFinalizeCapturePayload,
      "ExecuteSaveAppearancePreferencesPayload": ExecutionAPI.Objects.ExecuteSaveAppearancePreferencesPayload,
      "ExecuteTillySaveCatchPayload": ExecutionAPI.Objects.ExecuteTillySaveCatchPayload,
      "ExecuteTillySaveProfilePayload": ExecutionAPI.Objects.ExecuteTillySaveProfilePayload,
      "ExecuteTillyShareCapturePayload": ExecutionAPI.Objects.ExecuteTillyShareCapturePayload,
      "FinalizeCaptureOutput": ExecutionAPI.Objects.FinalizeCaptureOutput,
      "Mutation": ExecutionAPI.Objects.Mutation,
      "OperationExecution": ExecutionAPI.Objects.OperationExecution,
      "PremiumGrantConnection": ExecutionAPI.Objects.PremiumGrantConnection,
      "Query": ExecutionAPI.Objects.Query,
      "SaveAppearancePreferencesOutput": ExecutionAPI.Objects.SaveAppearancePreferencesOutput
    ]

    static func objectType(forTypename typename: String) -> ApolloAPI.Object? {
      objectTypeMap[typename]
    }
  }

  nonisolated enum Objects {}
  nonisolated enum Interfaces {}
  nonisolated enum Unions {}

}