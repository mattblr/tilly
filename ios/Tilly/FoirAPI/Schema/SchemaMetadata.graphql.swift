// @generated
// This file was automatically generated and should not be edited.

import ApolloAPI

nonisolated protocol FoirAPI_SelectionSet: ApolloAPI.SelectionSet & ApolloAPI.RootSelectionSet
where Schema == FoirAPI.SchemaMetadata {}

nonisolated protocol FoirAPI_InlineFragment: ApolloAPI.SelectionSet & ApolloAPI.InlineFragment
where Schema == FoirAPI.SchemaMetadata {}

nonisolated protocol FoirAPI_MutableSelectionSet: ApolloAPI.MutableRootSelectionSet
where Schema == FoirAPI.SchemaMetadata {}

nonisolated protocol FoirAPI_MutableInlineFragment: ApolloAPI.MutableSelectionSet & ApolloAPI.InlineFragment
where Schema == FoirAPI.SchemaMetadata {}

extension FoirAPI {
  typealias SelectionSet = FoirAPI_SelectionSet

  typealias InlineFragment = FoirAPI_InlineFragment

  typealias MutableSelectionSet = FoirAPI_MutableSelectionSet

  typealias MutableInlineFragment = FoirAPI_MutableInlineFragment

  nonisolated enum SchemaMetadata: ApolloAPI.SchemaMetadata {
    static let configuration: any ApolloAPI.SchemaConfiguration.Type = SchemaConfiguration.self

    private static let objectTypeMap: [String: ApolloAPI.Object] = [
      "AggregateGroup": FoirAPI.Objects.AggregateGroup,
      "AggregateResult": FoirAPI.Objects.AggregateResult,
      "AppSettings": FoirAPI.Objects.AppSettings,
      "AuthResult": FoirAPI.Objects.AuthResult,
      "CaptureCatTag": FoirAPI.Objects.CaptureCatTag,
      "CaptureCatTagConnection": FoirAPI.Objects.CaptureCatTagConnection,
      "CaptureCatTagEdge": FoirAPI.Objects.CaptureCatTagEdge,
      "CaptureLike": FoirAPI.Objects.CaptureLike,
      "CaptureLikeConnection": FoirAPI.Objects.CaptureLikeConnection,
      "CaptureLikeEdge": FoirAPI.Objects.CaptureLikeEdge,
      "CapturePhoto": FoirAPI.Objects.CapturePhoto,
      "CapturePhotoConnection": FoirAPI.Objects.CapturePhotoConnection,
      "CapturePhotoEdge": FoirAPI.Objects.CapturePhotoEdge,
      "CapturePost": FoirAPI.Objects.CapturePost,
      "CapturePostConnection": FoirAPI.Objects.CapturePostConnection,
      "CapturePostEdge": FoirAPI.Objects.CapturePostEdge,
      "Cat": FoirAPI.Objects.Cat,
      "CatConnection": FoirAPI.Objects.CatConnection,
      "CatEdge": FoirAPI.Objects.CatEdge,
      "CatFollow": FoirAPI.Objects.CatFollow,
      "CatFollowConnection": FoirAPI.Objects.CatFollowConnection,
      "CatFollowEdge": FoirAPI.Objects.CatFollowEdge,
      "CatchArt": FoirAPI.Objects.CatchArt,
      "CatchArtConnection": FoirAPI.Objects.CatchArtConnection,
      "CatchArtEdge": FoirAPI.Objects.CatchArtEdge,
      "DeleteAccountResult": FoirAPI.Objects.DeleteAccountResult,
      "DesignTokenColor": FoirAPI.Objects.DesignTokenColor,
      "DesignTokenDimension": FoirAPI.Objects.DesignTokenDimension,
      "DesignTokens": FoirAPI.Objects.DesignTokens,
      "ExecuteFollowCatPayload": FoirAPI.Objects.ExecuteFollowCatPayload,
      "ExecuteFollowUserPayload": FoirAPI.Objects.ExecuteFollowUserPayload,
      "ExecuteLikeCapturePayload": FoirAPI.Objects.ExecuteLikeCapturePayload,
      "ExecuteProfileCountsPayload": FoirAPI.Objects.ExecuteProfileCountsPayload,
      "ExecuteTidyFollowersPayload": FoirAPI.Objects.ExecuteTidyFollowersPayload,
      "ExecuteTillyAddFieldNotePayload": FoirAPI.Objects.ExecuteTillyAddFieldNotePayload,
      "ExecuteTillyClaimPremiumPayload": FoirAPI.Objects.ExecuteTillyClaimPremiumPayload,
      "FieldNote": FoirAPI.Objects.FieldNote,
      "FieldNoteConnection": FoirAPI.Objects.FieldNoteConnection,
      "FieldNoteEdge": FoirAPI.Objects.FieldNoteEdge,
      "FileUpload": FoirAPI.Objects.FileUpload,
      "FollowApproval": FoirAPI.Objects.FollowApproval,
      "FollowApprovalConnection": FoirAPI.Objects.FollowApprovalConnection,
      "FollowApprovalEdge": FoirAPI.Objects.FollowApprovalEdge,
      "FollowCatOutput": FoirAPI.Objects.FollowCatOutput,
      "FollowRequest": FoirAPI.Objects.FollowRequest,
      "FollowRequestConnection": FoirAPI.Objects.FollowRequestConnection,
      "FollowRequestEdge": FoirAPI.Objects.FollowRequestEdge,
      "FollowUserOutput": FoirAPI.Objects.FollowUserOutput,
      "GeoPoint": FoirAPI.Objects.GeoPoint,
      "Image": FoirAPI.Objects.Image,
      "ImageVariant": FoirAPI.Objects.ImageVariant,
      "ImageVariantSet": FoirAPI.Objects.ImageVariantSet,
      "LikeCaptureOutput": FoirAPI.Objects.LikeCaptureOutput,
      "Mutation": FoirAPI.Objects.Mutation,
      "NearbyRecord": FoirAPI.Objects.NearbyRecord,
      "NearbyRecordConnection": FoirAPI.Objects.NearbyRecordConnection,
      "NearbyRecordEdge": FoirAPI.Objects.NearbyRecordEdge,
      "NoteTag": FoirAPI.Objects.NoteTag,
      "NoteTagConnection": FoirAPI.Objects.NoteTagConnection,
      "NoteTagEdge": FoirAPI.Objects.NoteTagEdge,
      "OperationExecution": FoirAPI.Objects.OperationExecution,
      "PageInfo": FoirAPI.Objects.PageInfo,
      "PremiumGrant": FoirAPI.Objects.PremiumGrant,
      "PremiumGrantConnection": FoirAPI.Objects.PremiumGrantConnection,
      "PremiumGrantEdge": FoirAPI.Objects.PremiumGrantEdge,
      "Profile": FoirAPI.Objects.Profile,
      "ProfileConnection": FoirAPI.Objects.ProfileConnection,
      "ProfileCountsOutput": FoirAPI.Objects.ProfileCountsOutput,
      "ProfileEdge": FoirAPI.Objects.ProfileEdge,
      "ProjectLocale": FoirAPI.Objects.ProjectLocale,
      "ProviderSignInResponse": FoirAPI.Objects.ProviderSignInResponse,
      "Query": FoirAPI.Objects.Query,
      "SignInStep": FoirAPI.Objects.SignInStep,
      "StreakTier": FoirAPI.Objects.StreakTier,
      "StreakTierConnection": FoirAPI.Objects.StreakTierConnection,
      "StreakTierEdge": FoirAPI.Objects.StreakTierEdge,
      "TillyAddFieldNoteOutput": FoirAPI.Objects.TillyAddFieldNoteOutput,
      "TillyClaimPremiumOutput": FoirAPI.Objects.TillyClaimPremiumOutput,
      "UiCopy": FoirAPI.Objects.UiCopy,
      "UiCopyConnection": FoirAPI.Objects.UiCopyConnection,
      "UiCopyEdge": FoirAPI.Objects.UiCopyEdge,
      "UiCopyEntry": FoirAPI.Objects.UiCopyEntry,
      "UploadLanded": FoirAPI.Objects.UploadLanded
    ]

    static func objectType(forTypename typename: String) -> ApolloAPI.Object? {
      objectTypeMap[typename]
    }
  }

  nonisolated enum Objects {}
  nonisolated enum Interfaces {}
  nonisolated enum Unions {}

}