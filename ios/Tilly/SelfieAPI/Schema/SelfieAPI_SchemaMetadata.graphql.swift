// @generated
// This file was automatically generated and should not be edited.

import ApolloAPI

nonisolated protocol SelfieAPI_SelectionSet: ApolloAPI.SelectionSet & ApolloAPI.RootSelectionSet
where Schema == SelfieAPI.SchemaMetadata {}

nonisolated protocol SelfieAPI_InlineFragment: ApolloAPI.SelectionSet & ApolloAPI.InlineFragment
where Schema == SelfieAPI.SchemaMetadata {}

nonisolated protocol SelfieAPI_MutableSelectionSet: ApolloAPI.MutableRootSelectionSet
where Schema == SelfieAPI.SchemaMetadata {}

nonisolated protocol SelfieAPI_MutableInlineFragment: ApolloAPI.MutableSelectionSet & ApolloAPI.InlineFragment
where Schema == SelfieAPI.SchemaMetadata {}

extension SelfieAPI {
  typealias SelectionSet = SelfieAPI_SelectionSet

  typealias InlineFragment = SelfieAPI_InlineFragment

  typealias MutableSelectionSet = SelfieAPI_MutableSelectionSet

  typealias MutableInlineFragment = SelfieAPI_MutableInlineFragment

  nonisolated enum SchemaMetadata: ApolloAPI.SchemaMetadata {
    static let configuration: any ApolloAPI.SchemaConfiguration.Type = SchemaConfiguration.self

    private static let objectTypeMap: [String: ApolloAPI.Object] = [
      "CapturePhoto": SelfieAPI.Objects.CapturePhoto,
      "CapturePhotoConnection": SelfieAPI.Objects.CapturePhotoConnection,
      "CapturePhotoEdge": SelfieAPI.Objects.CapturePhotoEdge,
      "ExecuteTillyUpdateCaptureTagsPayload": SelfieAPI.Objects.ExecuteTillyUpdateCaptureTagsPayload,
      "Mutation": SelfieAPI.Objects.Mutation,
      "OperationExecution": SelfieAPI.Objects.OperationExecution,
      "PageInfo": SelfieAPI.Objects.PageInfo,
      "Query": SelfieAPI.Objects.Query,
      "TillyUpdateCaptureTagsOutput": SelfieAPI.Objects.TillyUpdateCaptureTagsOutput
    ]

    static func objectType(forTypename typename: String) -> ApolloAPI.Object? {
      objectTypeMap[typename]
    }
  }

  nonisolated enum Objects {}
  nonisolated enum Interfaces {}
  nonisolated enum Unions {}

}