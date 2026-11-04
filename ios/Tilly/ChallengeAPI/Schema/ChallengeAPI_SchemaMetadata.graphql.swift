// @generated
// This file was automatically generated and should not be edited.

import ApolloAPI

nonisolated protocol ChallengeAPI_SelectionSet: ApolloAPI.SelectionSet & ApolloAPI.RootSelectionSet
where Schema == ChallengeAPI.SchemaMetadata {}

nonisolated protocol ChallengeAPI_InlineFragment: ApolloAPI.SelectionSet & ApolloAPI.InlineFragment
where Schema == ChallengeAPI.SchemaMetadata {}

nonisolated protocol ChallengeAPI_MutableSelectionSet: ApolloAPI.MutableRootSelectionSet
where Schema == ChallengeAPI.SchemaMetadata {}

nonisolated protocol ChallengeAPI_MutableInlineFragment: ApolloAPI.MutableSelectionSet & ApolloAPI.InlineFragment
where Schema == ChallengeAPI.SchemaMetadata {}

extension ChallengeAPI {
  typealias SelectionSet = ChallengeAPI_SelectionSet

  typealias InlineFragment = ChallengeAPI_InlineFragment

  typealias MutableSelectionSet = ChallengeAPI_MutableSelectionSet

  typealias MutableInlineFragment = ChallengeAPI_MutableInlineFragment

  nonisolated enum SchemaMetadata: ApolloAPI.SchemaMetadata {
    static let configuration: any ApolloAPI.SchemaConfiguration.Type = SchemaConfiguration.self

    private static let objectTypeMap: [String: ApolloAPI.Object] = [
      "ChallengeAward": ChallengeAPI.Objects.ChallengeAward,
      "ChallengeAwardConnection": ChallengeAPI.Objects.ChallengeAwardConnection,
      "ChallengeAwardEdge": ChallengeAPI.Objects.ChallengeAwardEdge,
      "ChallengeEvaluation": ChallengeAPI.Objects.ChallengeEvaluation,
      "ChallengeEvaluationConnection": ChallengeAPI.Objects.ChallengeEvaluationConnection,
      "ChallengeEvaluationEdge": ChallengeAPI.Objects.ChallengeEvaluationEdge,
      "PageInfo": ChallengeAPI.Objects.PageInfo,
      "PhotoChallenge": ChallengeAPI.Objects.PhotoChallenge,
      "PhotoChallengeConnection": ChallengeAPI.Objects.PhotoChallengeConnection,
      "PhotoChallengeEdge": ChallengeAPI.Objects.PhotoChallengeEdge,
      "Query": ChallengeAPI.Objects.Query
    ]

    static func objectType(forTypename typename: String) -> ApolloAPI.Object? {
      objectTypeMap[typename]
    }
  }

  nonisolated enum Objects {}
  nonisolated enum Interfaces {}
  nonisolated enum Unions {}

}