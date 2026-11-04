import type { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  DateTime: { input: string; output: string; }
  Decimal: { input: any; output: any; }
  EventSeq: { input: any; output: any; }
  JSON: { input: { [key: string]: any }; output: { [key: string]: any }; }
};

export type AcceptAuthInvitationInput = {
  firstName?: InputMaybe<Scalars['String']['input']>;
  lastName?: InputMaybe<Scalars['String']['input']>;
  password?: InputMaybe<Scalars['String']['input']>;
  token: Scalars['String']['input'];
};

/** The level of access a grant confers on a resource. */
export enum AccessLevel {
  DELETE = 'DELETE',
  READ = 'READ',
  WRITE = 'WRITE'
}

/** Why an accessor can reach a resource. */
export enum AccessSource {
  /** An explicit, revocable grant. */
  GRANT = 'GRANT',
  /** The resource's owner. */
  OWNER = 'OWNER',
  /** Reachable via the role plane (holders of a project or workspace role). */
  ROLE = 'ROLE'
}

/** What to compute over a numeric field. */
export enum AggregateOp {
  AVG = 'AVG',
  MAX = 'MAX',
  MIN = 'MIN',
  SUM = 'SUM'
}

export type AppSettingsOrderByInput = {
  createdAt?: InputMaybe<SortDirection>;
  id?: InputMaybe<SortDirection>;
  naturalKey?: InputMaybe<SortDirection>;
  updatedAt?: InputMaybe<SortDirection>;
};

export type AppSettingsWhereInput = {
  AND?: InputMaybe<Array<InputMaybe<AppSettingsWhereInput>>>;
  NOT?: InputMaybe<AppSettingsWhereInput>;
  OR?: InputMaybe<Array<InputMaybe<AppSettingsWhereInput>>>;
  appearanceEligibility?: InputMaybe<TextWhereInput>;
  artModel?: InputMaybe<TextWhereInput>;
  artQuality?: InputMaybe<TextWhereInput>;
  clusterAt?: InputMaybe<IntegerWhereInput>;
  createdAt?: InputMaybe<DateTimeWhereInput>;
  createdBy?: InputMaybe<IdWhereInput>;
  id?: InputMaybe<IdWhereInput>;
  naturalKey?: InputMaybe<TextWhereInput>;
  nearMeMeters?: InputMaybe<IntegerWhereInput>;
  nearYouHours?: InputMaybe<IntegerWhereInput>;
  nearYouMeters?: InputMaybe<IntegerWhereInput>;
  ownerId?: InputMaybe<IdWhereInput>;
  ownerKind?: InputMaybe<TextWhereInput>;
  trendingPerCat?: InputMaybe<IntegerWhereInput>;
  updatedAt?: InputMaybe<DateTimeWhereInput>;
  updatedBy?: InputMaybe<IdWhereInput>;
};

export type AppearanceAccountOrderByInput = {
  createdAt?: InputMaybe<SortDirection>;
  id?: InputMaybe<SortDirection>;
  naturalKey?: InputMaybe<SortDirection>;
  updatedAt?: InputMaybe<SortDirection>;
};

export type AppearanceAccountWhereInput = {
  AND?: InputMaybe<Array<InputMaybe<AppearanceAccountWhereInput>>>;
  NOT?: InputMaybe<AppearanceAccountWhereInput>;
  OR?: InputMaybe<Array<InputMaybe<AppearanceAccountWhereInput>>>;
  consentVersion?: InputMaybe<TextWhereInput>;
  consentedAt?: InputMaybe<DateTimeWhereInput>;
  createdAt?: InputMaybe<DateTimeWhereInput>;
  createdBy?: InputMaybe<IdWhereInput>;
  enabled?: InputMaybe<BooleanWhereInput>;
  id?: InputMaybe<IdWhereInput>;
  naturalKey?: InputMaybe<TextWhereInput>;
  ownerId?: InputMaybe<IdWhereInput>;
  ownerKind?: InputMaybe<TextWhereInput>;
  updatedAt?: InputMaybe<DateTimeWhereInput>;
  updatedBy?: InputMaybe<IdWhereInput>;
};

/** Fields on AppearanceVote that carry a typed index, and can therefore be grouped by. */
export enum AppearanceVoteAggregatableField {
  CATKEY = 'CATKEY',
  DIMENSION = 'DIMENSION'
}

export type AppearanceVoteOrderByInput = {
  catKey?: InputMaybe<SortDirection>;
  createdAt?: InputMaybe<SortDirection>;
  dimension?: InputMaybe<SortDirection>;
  id?: InputMaybe<SortDirection>;
  naturalKey?: InputMaybe<SortDirection>;
  updatedAt?: InputMaybe<SortDirection>;
};

export type AppearanceVoteWhereInput = {
  AND?: InputMaybe<Array<InputMaybe<AppearanceVoteWhereInput>>>;
  NOT?: InputMaybe<AppearanceVoteWhereInput>;
  OR?: InputMaybe<Array<InputMaybe<AppearanceVoteWhereInput>>>;
  catKey?: InputMaybe<TextWhereInput>;
  createdAt?: InputMaybe<DateTimeWhereInput>;
  createdBy?: InputMaybe<IdWhereInput>;
  dimension?: InputMaybe<TextWhereInput>;
  id?: InputMaybe<IdWhereInput>;
  naturalKey?: InputMaybe<TextWhereInput>;
  ownerId?: InputMaybe<IdWhereInput>;
  ownerKind?: InputMaybe<TextWhereInput>;
  updatedAt?: InputMaybe<DateTimeWhereInput>;
  updatedBy?: InputMaybe<IdWhereInput>;
};

/** Fields on Audience that carry a typed index, and can therefore be grouped by. */
export enum AudienceAggregatableField {
  PRIVACY = 'PRIVACY'
}

export type AudienceOrderByInput = {
  createdAt?: InputMaybe<SortDirection>;
  id?: InputMaybe<SortDirection>;
  naturalKey?: InputMaybe<SortDirection>;
  privacy?: InputMaybe<SortDirection>;
  updatedAt?: InputMaybe<SortDirection>;
};

export type AudienceWhereInput = {
  AND?: InputMaybe<Array<InputMaybe<AudienceWhereInput>>>;
  NOT?: InputMaybe<AudienceWhereInput>;
  OR?: InputMaybe<Array<InputMaybe<AudienceWhereInput>>>;
  createdAt?: InputMaybe<DateTimeWhereInput>;
  createdBy?: InputMaybe<IdWhereInput>;
  id?: InputMaybe<IdWhereInput>;
  naturalKey?: InputMaybe<TextWhereInput>;
  ownerId?: InputMaybe<IdWhereInput>;
  ownerKind?: InputMaybe<TextWhereInput>;
  privacy?: InputMaybe<TextWhereInput>;
  updatedAt?: InputMaybe<DateTimeWhereInput>;
  updatedBy?: InputMaybe<IdWhereInput>;
};

/** Lifecycle status of an invitation */
export enum AuthInvitationStatus {
  ACCEPTED = 'ACCEPTED',
  EXPIRED = 'EXPIRED',
  PENDING = 'PENDING',
  REVOKED = 'REVOKED'
}

/** Type of authentication provider */
export enum AuthProviderType {
  EXTERNAL = 'EXTERNAL',
  OAUTH2 = 'OAUTH2',
  OIDC = 'OIDC',
  SAML = 'SAML',
  TOKEN_SSO = 'TOKEN_SSO'
}

/** Status of a user account. Mirrors the proto UserStatus enum exactly: ACTIVE, PENDING, SUSPENDED. */
export enum AuthUserStatus {
  ACTIVE = 'ACTIVE',
  PENDING = 'PENDING',
  SUSPENDED = 'SUSPENDED'
}

export type BooleanWhereInput = {
  eq?: InputMaybe<Scalars['Boolean']['input']>;
  isNotNull?: InputMaybe<Scalars['Boolean']['input']>;
  isNull?: InputMaybe<Scalars['Boolean']['input']>;
  ne?: InputMaybe<Scalars['Boolean']['input']>;
};

/** Scope of a @cacheControl annotation. */
export enum CacheControlScope {
  /** Never cached. */
  NO_CACHE = 'NO_CACHE',
  /** Cacheable per-caller; isolates entries by user id. */
  PRIVATE = 'PRIVATE',
  /** Cacheable across all callers. */
  PUBLIC = 'PUBLIC'
}

/** Fields on CaptureCatTag that carry a typed index, and can therefore be grouped by. */
export enum CaptureCatTagAggregatableField {
  ACTIVE = 'ACTIVE',
  CAPTUREDAT = 'CAPTUREDAT',
  CATKEY = 'CATKEY',
  PHOTOKEY = 'PHOTOKEY',
  POSITIONINDEX = 'POSITIONINDEX',
  REVISION = 'REVISION',
  TAGKEY = 'TAGKEY'
}

export type CaptureCatTagAggregateInput = {
  field: CaptureCatTagNumericField;
  op: AggregateOp;
};

/** Numeric fields on CaptureCatTag that can be summed, averaged or bounded. */
export enum CaptureCatTagNumericField {
  POSITIONINDEX = 'POSITIONINDEX'
}

export type CaptureCatTagOrderByInput = {
  active?: InputMaybe<SortDirection>;
  capturedAt?: InputMaybe<SortDirection>;
  catKey?: InputMaybe<SortDirection>;
  createdAt?: InputMaybe<SortDirection>;
  id?: InputMaybe<SortDirection>;
  naturalKey?: InputMaybe<SortDirection>;
  photoKey?: InputMaybe<SortDirection>;
  positionIndex?: InputMaybe<SortDirection>;
  revision?: InputMaybe<SortDirection>;
  tagKey?: InputMaybe<SortDirection>;
  updatedAt?: InputMaybe<SortDirection>;
};

export type CaptureCatTagWhereInput = {
  AND?: InputMaybe<Array<InputMaybe<CaptureCatTagWhereInput>>>;
  NOT?: InputMaybe<CaptureCatTagWhereInput>;
  OR?: InputMaybe<Array<InputMaybe<CaptureCatTagWhereInput>>>;
  active?: InputMaybe<BooleanWhereInput>;
  area?: InputMaybe<Scalars['JSON']['input']>;
  bounds?: InputMaybe<Scalars['JSON']['input']>;
  capture?: InputMaybe<CapturePhotoWhereInput>;
  capturedAt?: InputMaybe<DateTimeWhereInput>;
  cat?: InputMaybe<CatWhereInput>;
  catKey?: InputMaybe<TextWhereInput>;
  createdAt?: InputMaybe<DateTimeWhereInput>;
  createdBy?: InputMaybe<IdWhereInput>;
  id?: InputMaybe<IdWhereInput>;
  inputHash?: InputMaybe<TextWhereInput>;
  naturalKey?: InputMaybe<TextWhereInput>;
  ownerId?: InputMaybe<IdWhereInput>;
  ownerKind?: InputMaybe<TextWhereInput>;
  photoKey?: InputMaybe<TextWhereInput>;
  position?: InputMaybe<Scalars['JSON']['input']>;
  positionIndex?: InputMaybe<IntegerWhereInput>;
  revision?: InputMaybe<TextWhereInput>;
  tagKey?: InputMaybe<TextWhereInput>;
  updatedAt?: InputMaybe<DateTimeWhereInput>;
  updatedBy?: InputMaybe<IdWhereInput>;
  vector?: InputMaybe<Scalars['JSON']['input']>;
  vectorModel?: InputMaybe<TextWhereInput>;
  viewers?: InputMaybe<AudienceWhereInput>;
};

/** Fields on CaptureLike that carry a typed index, and can therefore be grouped by. */
export enum CaptureLikeAggregatableField {
  CATKEY = 'CATKEY',
  PHOTOKEY = 'PHOTOKEY'
}

export type CaptureLikeOrderByInput = {
  catKey?: InputMaybe<SortDirection>;
  createdAt?: InputMaybe<SortDirection>;
  id?: InputMaybe<SortDirection>;
  naturalKey?: InputMaybe<SortDirection>;
  photoKey?: InputMaybe<SortDirection>;
  updatedAt?: InputMaybe<SortDirection>;
};

export type CaptureLikeWhereInput = {
  AND?: InputMaybe<Array<InputMaybe<CaptureLikeWhereInput>>>;
  NOT?: InputMaybe<CaptureLikeWhereInput>;
  OR?: InputMaybe<Array<InputMaybe<CaptureLikeWhereInput>>>;
  cat?: InputMaybe<CatWhereInput>;
  catKey?: InputMaybe<TextWhereInput>;
  createdAt?: InputMaybe<DateTimeWhereInput>;
  createdBy?: InputMaybe<IdWhereInput>;
  id?: InputMaybe<IdWhereInput>;
  naturalKey?: InputMaybe<TextWhereInput>;
  ownerId?: InputMaybe<IdWhereInput>;
  ownerKind?: InputMaybe<TextWhereInput>;
  photoKey?: InputMaybe<TextWhereInput>;
  updatedAt?: InputMaybe<DateTimeWhereInput>;
  updatedBy?: InputMaybe<IdWhereInput>;
};

/** Fields on CapturePhoto that carry a typed index, and can therefore be grouped by. */
export enum CapturePhotoAggregatableField {
  AUDIENCE = 'AUDIENCE',
  CATKEY = 'CATKEY',
  CLIENTKEY = 'CLIENTKEY',
  STATE = 'STATE',
  TAGREVISION = 'TAGREVISION'
}

export type CapturePhotoOrderByInput = {
  audience?: InputMaybe<SortDirection>;
  catKey?: InputMaybe<SortDirection>;
  clientKey?: InputMaybe<SortDirection>;
  createdAt?: InputMaybe<SortDirection>;
  id?: InputMaybe<SortDirection>;
  naturalKey?: InputMaybe<SortDirection>;
  state?: InputMaybe<SortDirection>;
  tagRevision?: InputMaybe<SortDirection>;
  updatedAt?: InputMaybe<SortDirection>;
};

export type CapturePhotoWhereInput = {
  AND?: InputMaybe<Array<InputMaybe<CapturePhotoWhereInput>>>;
  NOT?: InputMaybe<CapturePhotoWhereInput>;
  OR?: InputMaybe<Array<InputMaybe<CapturePhotoWhereInput>>>;
  area?: InputMaybe<Scalars['JSON']['input']>;
  audience?: InputMaybe<TextWhereInput>;
  cat?: InputMaybe<CatWhereInput>;
  catKey?: InputMaybe<TextWhereInput>;
  challengeHighlights?: InputMaybe<Scalars['JSON']['input']>;
  challengeRevision?: InputMaybe<TextWhereInput>;
  clientKey?: InputMaybe<TextWhereInput>;
  createdAt?: InputMaybe<DateTimeWhereInput>;
  createdBy?: InputMaybe<IdWhereInput>;
  editHash?: InputMaybe<TextWhereInput>;
  fileId?: InputMaybe<TextWhereInput>;
  id?: InputMaybe<IdWhereInput>;
  naturalKey?: InputMaybe<TextWhereInput>;
  ownerId?: InputMaybe<IdWhereInput>;
  ownerKind?: InputMaybe<TextWhereInput>;
  payloadHash?: InputMaybe<TextWhereInput>;
  photo?: InputMaybe<IdWhereInput>;
  state?: InputMaybe<TextWhereInput>;
  tagRevision?: InputMaybe<TextWhereInput>;
  updatedAt?: InputMaybe<DateTimeWhereInput>;
  updatedBy?: InputMaybe<IdWhereInput>;
  viewers?: InputMaybe<AudienceWhereInput>;
};

/** Fields on CapturePost that carry a typed index, and can therefore be grouped by. */
export enum CapturePostAggregatableField {
  AUDIENCE = 'AUDIENCE',
  CATKEY = 'CATKEY',
  PHOTOKEY = 'PHOTOKEY',
  POSTEDAT = 'POSTEDAT',
  RESHAREOF = 'RESHAREOF',
  WORLDCELL = 'WORLDCELL'
}

export type CapturePostOrderByInput = {
  audience?: InputMaybe<SortDirection>;
  catKey?: InputMaybe<SortDirection>;
  createdAt?: InputMaybe<SortDirection>;
  id?: InputMaybe<SortDirection>;
  naturalKey?: InputMaybe<SortDirection>;
  photoKey?: InputMaybe<SortDirection>;
  postedAt?: InputMaybe<SortDirection>;
  reshareOf?: InputMaybe<SortDirection>;
  updatedAt?: InputMaybe<SortDirection>;
  worldCell?: InputMaybe<SortDirection>;
};

export type CapturePostWhereInput = {
  AND?: InputMaybe<Array<InputMaybe<CapturePostWhereInput>>>;
  NOT?: InputMaybe<CapturePostWhereInput>;
  OR?: InputMaybe<Array<InputMaybe<CapturePostWhereInput>>>;
  area?: InputMaybe<Scalars['JSON']['input']>;
  audience?: InputMaybe<TextWhereInput>;
  cat?: InputMaybe<CatWhereInput>;
  catKey?: InputMaybe<TextWhereInput>;
  comment?: InputMaybe<TextWhereInput>;
  createdAt?: InputMaybe<DateTimeWhereInput>;
  createdBy?: InputMaybe<IdWhereInput>;
  id?: InputMaybe<IdWhereInput>;
  naturalKey?: InputMaybe<TextWhereInput>;
  note?: InputMaybe<TextWhereInput>;
  ownerId?: InputMaybe<IdWhereInput>;
  ownerKind?: InputMaybe<TextWhereInput>;
  photoKey?: InputMaybe<TextWhereInput>;
  postedAt?: InputMaybe<DateTimeWhereInput>;
  reshareOf?: InputMaybe<TextWhereInput>;
  updatedAt?: InputMaybe<DateTimeWhereInput>;
  updatedBy?: InputMaybe<IdWhereInput>;
  viewers?: InputMaybe<AudienceWhereInput>;
  worldCell?: InputMaybe<TextWhereInput>;
};

/** Fields on Cat that carry a typed index, and can therefore be grouped by. */
export enum CatAggregatableField {
  CELL1 = 'CELL1',
  CELL2 = 'CELL2',
  CELL3 = 'CELL3',
  CELL4 = 'CELL4',
  CELL5 = 'CELL5',
  CELL6 = 'CELL6'
}

/** Fields on CatAppearance that carry a typed index, and can therefore be grouped by. */
export enum CatAppearanceAggregatableField {
  CACHEKEY = 'CACHEKEY',
  PHOTOKEY = 'PHOTOKEY',
  STATUS = 'STATUS'
}

export type CatAppearanceOrderByInput = {
  cacheKey?: InputMaybe<SortDirection>;
  createdAt?: InputMaybe<SortDirection>;
  id?: InputMaybe<SortDirection>;
  naturalKey?: InputMaybe<SortDirection>;
  photoKey?: InputMaybe<SortDirection>;
  status?: InputMaybe<SortDirection>;
  updatedAt?: InputMaybe<SortDirection>;
};

export type CatAppearanceWhereInput = {
  AND?: InputMaybe<Array<InputMaybe<CatAppearanceWhereInput>>>;
  NOT?: InputMaybe<CatAppearanceWhereInput>;
  OR?: InputMaybe<Array<InputMaybe<CatAppearanceWhereInput>>>;
  cacheKey?: InputMaybe<TextWhereInput>;
  consentVersion?: InputMaybe<TextWhereInput>;
  createdAt?: InputMaybe<DateTimeWhereInput>;
  createdBy?: InputMaybe<IdWhereInput>;
  fileId?: InputMaybe<TextWhereInput>;
  id?: InputMaybe<IdWhereInput>;
  modelVersion?: InputMaybe<TextWhereInput>;
  naturalKey?: InputMaybe<TextWhereInput>;
  ownerId?: InputMaybe<IdWhereInput>;
  ownerKind?: InputMaybe<TextWhereInput>;
  photoKey?: InputMaybe<TextWhereInput>;
  promptVersion?: InputMaybe<TextWhereInput>;
  result?: InputMaybe<Scalars['JSON']['input']>;
  revision?: InputMaybe<TextWhereInput>;
  runId?: InputMaybe<TextWhereInput>;
  status?: InputMaybe<TextWhereInput>;
  updatedAt?: InputMaybe<DateTimeWhereInput>;
  updatedBy?: InputMaybe<IdWhereInput>;
};

/** Fields on CatFollow that carry a typed index, and can therefore be grouped by. */
export enum CatFollowAggregatableField {
  CATKEY = 'CATKEY'
}

export type CatFollowOrderByInput = {
  catKey?: InputMaybe<SortDirection>;
  createdAt?: InputMaybe<SortDirection>;
  id?: InputMaybe<SortDirection>;
  naturalKey?: InputMaybe<SortDirection>;
  updatedAt?: InputMaybe<SortDirection>;
};

export type CatFollowWhereInput = {
  AND?: InputMaybe<Array<InputMaybe<CatFollowWhereInput>>>;
  NOT?: InputMaybe<CatFollowWhereInput>;
  OR?: InputMaybe<Array<InputMaybe<CatFollowWhereInput>>>;
  cat?: InputMaybe<CatWhereInput>;
  catKey?: InputMaybe<TextWhereInput>;
  createdAt?: InputMaybe<DateTimeWhereInput>;
  createdBy?: InputMaybe<IdWhereInput>;
  id?: InputMaybe<IdWhereInput>;
  naturalKey?: InputMaybe<TextWhereInput>;
  ownerId?: InputMaybe<IdWhereInput>;
  ownerKind?: InputMaybe<TextWhereInput>;
  updatedAt?: InputMaybe<DateTimeWhereInput>;
  updatedBy?: InputMaybe<IdWhereInput>;
};

export type CatOrderByInput = {
  cell1?: InputMaybe<SortDirection>;
  cell2?: InputMaybe<SortDirection>;
  cell3?: InputMaybe<SortDirection>;
  cell4?: InputMaybe<SortDirection>;
  cell5?: InputMaybe<SortDirection>;
  cell6?: InputMaybe<SortDirection>;
  createdAt?: InputMaybe<SortDirection>;
  id?: InputMaybe<SortDirection>;
  naturalKey?: InputMaybe<SortDirection>;
  updatedAt?: InputMaybe<SortDirection>;
};

export type CatWhereInput = {
  AND?: InputMaybe<Array<InputMaybe<CatWhereInput>>>;
  NOT?: InputMaybe<CatWhereInput>;
  OR?: InputMaybe<Array<InputMaybe<CatWhereInput>>>;
  area?: InputMaybe<Scalars['JSON']['input']>;
  cell1?: InputMaybe<TextWhereInput>;
  cell2?: InputMaybe<TextWhereInput>;
  cell3?: InputMaybe<TextWhereInput>;
  cell4?: InputMaybe<TextWhereInput>;
  cell5?: InputMaybe<TextWhereInput>;
  cell6?: InputMaybe<TextWhereInput>;
  createdAt?: InputMaybe<DateTimeWhereInput>;
  createdBy?: InputMaybe<IdWhereInput>;
  id?: InputMaybe<IdWhereInput>;
  name?: InputMaybe<TextWhereInput>;
  naturalKey?: InputMaybe<TextWhereInput>;
  ownerId?: InputMaybe<IdWhereInput>;
  ownerKind?: InputMaybe<TextWhereInput>;
  updatedAt?: InputMaybe<DateTimeWhereInput>;
  updatedBy?: InputMaybe<IdWhereInput>;
};

/** Fields on CatchArt that carry a typed index, and can therefore be grouped by. */
export enum CatchArtAggregatableField {
  CATKEY = 'CATKEY',
  PHOTOKEY = 'PHOTOKEY',
  STATUS = 'STATUS'
}

export type CatchArtOrderByInput = {
  catKey?: InputMaybe<SortDirection>;
  createdAt?: InputMaybe<SortDirection>;
  id?: InputMaybe<SortDirection>;
  naturalKey?: InputMaybe<SortDirection>;
  photoKey?: InputMaybe<SortDirection>;
  status?: InputMaybe<SortDirection>;
  updatedAt?: InputMaybe<SortDirection>;
};

export type CatchArtWhereInput = {
  AND?: InputMaybe<Array<InputMaybe<CatchArtWhereInput>>>;
  NOT?: InputMaybe<CatchArtWhereInput>;
  OR?: InputMaybe<Array<InputMaybe<CatchArtWhereInput>>>;
  art?: InputMaybe<IdWhereInput>;
  cat?: InputMaybe<CatWhereInput>;
  catKey?: InputMaybe<TextWhereInput>;
  createdAt?: InputMaybe<DateTimeWhereInput>;
  createdBy?: InputMaybe<IdWhereInput>;
  id?: InputMaybe<IdWhereInput>;
  naturalKey?: InputMaybe<TextWhereInput>;
  ownerId?: InputMaybe<IdWhereInput>;
  ownerKind?: InputMaybe<TextWhereInput>;
  photoKey?: InputMaybe<TextWhereInput>;
  status?: InputMaybe<TextWhereInput>;
  style?: InputMaybe<TextWhereInput>;
  tierDays?: InputMaybe<IntegerWhereInput>;
  updatedAt?: InputMaybe<DateTimeWhereInput>;
  updatedBy?: InputMaybe<IdWhereInput>;
  viewers?: InputMaybe<AudienceWhereInput>;
};

/** Fields on ChallengeAward that carry a typed index, and can therefore be grouped by. */
export enum ChallengeAwardAggregatableField {
  CHALLENGEKEY = 'CHALLENGEKEY',
  CHALLENGEVERSION = 'CHALLENGEVERSION'
}

export type ChallengeAwardOrderByInput = {
  challengeKey?: InputMaybe<SortDirection>;
  challengeVersion?: InputMaybe<SortDirection>;
  createdAt?: InputMaybe<SortDirection>;
  id?: InputMaybe<SortDirection>;
  naturalKey?: InputMaybe<SortDirection>;
  updatedAt?: InputMaybe<SortDirection>;
};

export type ChallengeAwardWhereInput = {
  AND?: InputMaybe<Array<InputMaybe<ChallengeAwardWhereInput>>>;
  NOT?: InputMaybe<ChallengeAwardWhereInput>;
  OR?: InputMaybe<Array<InputMaybe<ChallengeAwardWhereInput>>>;
  active?: InputMaybe<BooleanWhereInput>;
  badge?: InputMaybe<IdWhereInput>;
  challengeKey?: InputMaybe<TextWhereInput>;
  challengeVersion?: InputMaybe<TextWhereInput>;
  createdAt?: InputMaybe<DateTimeWhereInput>;
  createdBy?: InputMaybe<IdWhereInput>;
  criteriaDigest?: InputMaybe<TextWhereInput>;
  earnedAt?: InputMaybe<DateTimeWhereInput>;
  id?: InputMaybe<IdWhereInput>;
  naturalKey?: InputMaybe<TextWhereInput>;
  ownerId?: InputMaybe<IdWhereInput>;
  ownerKind?: InputMaybe<TextWhereInput>;
  progress?: InputMaybe<IntegerWhereInput>;
  targetCount?: InputMaybe<IntegerWhereInput>;
  title?: InputMaybe<TextWhereInput>;
  updatedAt?: InputMaybe<DateTimeWhereInput>;
  updatedBy?: InputMaybe<IdWhereInput>;
};

/** Fields on ChallengeEvaluation that carry a typed index, and can therefore be grouped by. */
export enum ChallengeEvaluationAggregatableField {
  CAPTUREID = 'CAPTUREID',
  CHALLENGEKEY = 'CHALLENGEKEY',
  CHALLENGEVERSION = 'CHALLENGEVERSION',
  CRITERIADIGEST = 'CRITERIADIGEST',
  STATUS = 'STATUS'
}

export type ChallengeEvaluationOrderByInput = {
  captureId?: InputMaybe<SortDirection>;
  challengeKey?: InputMaybe<SortDirection>;
  challengeVersion?: InputMaybe<SortDirection>;
  createdAt?: InputMaybe<SortDirection>;
  criteriaDigest?: InputMaybe<SortDirection>;
  id?: InputMaybe<SortDirection>;
  naturalKey?: InputMaybe<SortDirection>;
  status?: InputMaybe<SortDirection>;
  updatedAt?: InputMaybe<SortDirection>;
};

export type ChallengeEvaluationWhereInput = {
  AND?: InputMaybe<Array<InputMaybe<ChallengeEvaluationWhereInput>>>;
  NOT?: InputMaybe<ChallengeEvaluationWhereInput>;
  OR?: InputMaybe<Array<InputMaybe<ChallengeEvaluationWhereInput>>>;
  attemptCount?: InputMaybe<IntegerWhereInput>;
  captureId?: InputMaybe<TextWhereInput>;
  challengeKey?: InputMaybe<TextWhereInput>;
  challengeVersion?: InputMaybe<TextWhereInput>;
  createdAt?: InputMaybe<DateTimeWhereInput>;
  createdBy?: InputMaybe<IdWhereInput>;
  criteriaDigest?: InputMaybe<TextWhereInput>;
  evaluatedAt?: InputMaybe<DateTimeWhereInput>;
  fileId?: InputMaybe<TextWhereInput>;
  id?: InputMaybe<IdWhereInput>;
  modelVersion?: InputMaybe<TextWhereInput>;
  naturalKey?: InputMaybe<TextWhereInput>;
  outcome?: InputMaybe<TextWhereInput>;
  ownerId?: InputMaybe<IdWhereInput>;
  ownerKind?: InputMaybe<TextWhereInput>;
  reasonCode?: InputMaybe<TextWhereInput>;
  retryCount?: InputMaybe<IntegerWhereInput>;
  revision?: InputMaybe<TextWhereInput>;
  runId?: InputMaybe<TextWhereInput>;
  status?: InputMaybe<TextWhereInput>;
  updatedAt?: InputMaybe<DateTimeWhereInput>;
  updatedBy?: InputMaybe<IdWhereInput>;
};

export enum ContentAlignEnum {
  /** Center */
  center = 'center',
  /** End */
  end = 'end',
  /** Start */
  start = 'start'
}

export enum ContentCtaLayoutEnum {
  /** Column */
  column = 'column',
  /** Row */
  row = 'row'
}

/** Fields on ContentReport that carry a typed index, and can therefore be grouped by. */
export enum ContentReportAggregatableField {
  REASON = 'REASON',
  STATUS = 'STATUS',
  TARGETID = 'TARGETID',
  TARGETOWNERID = 'TARGETOWNERID',
  TARGETTYPE = 'TARGETTYPE'
}

export type ContentReportOrderByInput = {
  createdAt?: InputMaybe<SortDirection>;
  id?: InputMaybe<SortDirection>;
  naturalKey?: InputMaybe<SortDirection>;
  reason?: InputMaybe<SortDirection>;
  status?: InputMaybe<SortDirection>;
  targetId?: InputMaybe<SortDirection>;
  targetOwnerId?: InputMaybe<SortDirection>;
  targetType?: InputMaybe<SortDirection>;
  updatedAt?: InputMaybe<SortDirection>;
};

export type ContentReportWhereInput = {
  AND?: InputMaybe<Array<InputMaybe<ContentReportWhereInput>>>;
  NOT?: InputMaybe<ContentReportWhereInput>;
  OR?: InputMaybe<Array<InputMaybe<ContentReportWhereInput>>>;
  createdAt?: InputMaybe<DateTimeWhereInput>;
  createdBy?: InputMaybe<IdWhereInput>;
  details?: InputMaybe<TextWhereInput>;
  id?: InputMaybe<IdWhereInput>;
  naturalKey?: InputMaybe<TextWhereInput>;
  ownerId?: InputMaybe<IdWhereInput>;
  ownerKind?: InputMaybe<TextWhereInput>;
  reason?: InputMaybe<TextWhereInput>;
  resolution?: InputMaybe<TextWhereInput>;
  status?: InputMaybe<TextWhereInput>;
  targetId?: InputMaybe<TextWhereInput>;
  targetOwnerId?: InputMaybe<TextWhereInput>;
  targetType?: InputMaybe<TextWhereInput>;
  updatedAt?: InputMaybe<DateTimeWhereInput>;
  updatedBy?: InputMaybe<IdWhereInput>;
};

export type CookieConsentOrderByInput = {
  createdAt?: InputMaybe<SortDirection>;
  id?: InputMaybe<SortDirection>;
  naturalKey?: InputMaybe<SortDirection>;
  updatedAt?: InputMaybe<SortDirection>;
};

export type CookieConsentSectionsListWhereInput = {
  /** All items match (vacuously true on empty list). */
  every?: InputMaybe<CookieSectionWhereInput>;
  /** Zero items match. */
  none?: InputMaybe<CookieSectionWhereInput>;
  /** At least one item matches. */
  some?: InputMaybe<CookieSectionWhereInput>;
};

export type CookieConsentWhereInput = {
  AND?: InputMaybe<Array<InputMaybe<CookieConsentWhereInput>>>;
  NOT?: InputMaybe<CookieConsentWhereInput>;
  OR?: InputMaybe<Array<InputMaybe<CookieConsentWhereInput>>>;
  acceptAllLabel?: InputMaybe<TextWhereInput>;
  consentDescription?: InputMaybe<TextWhereInput>;
  consentTitle?: InputMaybe<TextWhereInput>;
  createdAt?: InputMaybe<DateTimeWhereInput>;
  createdBy?: InputMaybe<IdWhereInput>;
  id?: InputMaybe<IdWhereInput>;
  manageLabel?: InputMaybe<TextWhereInput>;
  naturalKey?: InputMaybe<TextWhereInput>;
  ownerId?: InputMaybe<IdWhereInput>;
  ownerKind?: InputMaybe<TextWhereInput>;
  preferencesTitle?: InputMaybe<TextWhereInput>;
  rejectAllLabel?: InputMaybe<TextWhereInput>;
  saveLabel?: InputMaybe<TextWhereInput>;
  sections?: InputMaybe<CookieConsentSectionsListWhereInput>;
  updatedAt?: InputMaybe<DateTimeWhereInput>;
  updatedBy?: InputMaybe<IdWhereInput>;
};

export type CookieSectionWhereInput = {
  AND?: InputMaybe<Array<InputMaybe<CookieSectionWhereInput>>>;
  NOT?: InputMaybe<CookieSectionWhereInput>;
  OR?: InputMaybe<Array<InputMaybe<CookieSectionWhereInput>>>;
  categoryKey?: InputMaybe<TextWhereInput>;
  createdAt?: InputMaybe<DateTimeWhereInput>;
  createdBy?: InputMaybe<IdWhereInput>;
  description?: InputMaybe<TextWhereInput>;
  enabled?: InputMaybe<BooleanWhereInput>;
  id?: InputMaybe<IdWhereInput>;
  naturalKey?: InputMaybe<TextWhereInput>;
  ownerId?: InputMaybe<IdWhereInput>;
  ownerKind?: InputMaybe<TextWhereInput>;
  readOnly?: InputMaybe<BooleanWhereInput>;
  title?: InputMaybe<TextWhereInput>;
  updatedAt?: InputMaybe<DateTimeWhereInput>;
  updatedBy?: InputMaybe<IdWhereInput>;
};

export enum CtaVariantEnum {
  /** Link */
  link = 'link',
  /** Outline */
  outline = 'outline',
  /** Solid */
  solid = 'solid'
}

export type DateTimeWhereInput = {
  eq?: InputMaybe<Scalars['DateTime']['input']>;
  gt?: InputMaybe<Scalars['DateTime']['input']>;
  gte?: InputMaybe<Scalars['DateTime']['input']>;
  in?: InputMaybe<Array<InputMaybe<Scalars['DateTime']['input']>>>;
  isNotNull?: InputMaybe<Scalars['Boolean']['input']>;
  isNull?: InputMaybe<Scalars['Boolean']['input']>;
  lt?: InputMaybe<Scalars['DateTime']['input']>;
  lte?: InputMaybe<Scalars['DateTime']['input']>;
  ne?: InputMaybe<Scalars['DateTime']['input']>;
  nin?: InputMaybe<Array<InputMaybe<Scalars['DateTime']['input']>>>;
};

export enum DeviceType {
  DESKTOP = 'DESKTOP',
  MOBILE = 'MOBILE',
  TABLET = 'TABLET'
}

/** Dispatch mode for execute{Op} mutations on operations that support async-callback. */
export enum ExecutionMode {
  /** Return the execution row immediately; subscribe on operation{Op}Execution for progress and terminal events. */
  ASYNC = 'ASYNC',
  /** Call the operation's endpoint directly and return its result, bounded by the operation's timeout. */
  SYNC = 'SYNC'
}

/** Fields on FieldNote that carry a typed index, and can therefore be grouped by. */
export enum FieldNoteAggregatableField {
  CATKEY = 'CATKEY',
  PHOTOKEY = 'PHOTOKEY'
}

export type FieldNoteOrderByInput = {
  catKey?: InputMaybe<SortDirection>;
  createdAt?: InputMaybe<SortDirection>;
  id?: InputMaybe<SortDirection>;
  naturalKey?: InputMaybe<SortDirection>;
  photoKey?: InputMaybe<SortDirection>;
  updatedAt?: InputMaybe<SortDirection>;
};

export type FieldNoteWhereInput = {
  AND?: InputMaybe<Array<InputMaybe<FieldNoteWhereInput>>>;
  NOT?: InputMaybe<FieldNoteWhereInput>;
  OR?: InputMaybe<Array<InputMaybe<FieldNoteWhereInput>>>;
  cat?: InputMaybe<CatWhereInput>;
  catKey?: InputMaybe<TextWhereInput>;
  createdAt?: InputMaybe<DateTimeWhereInput>;
  createdBy?: InputMaybe<IdWhereInput>;
  id?: InputMaybe<IdWhereInput>;
  naturalKey?: InputMaybe<TextWhereInput>;
  ownerId?: InputMaybe<IdWhereInput>;
  ownerKind?: InputMaybe<TextWhereInput>;
  photoKey?: InputMaybe<TextWhereInput>;
  tags?: InputMaybe<Scalars['JSON']['input']>;
  text?: InputMaybe<TextWhereInput>;
  updatedAt?: InputMaybe<DateTimeWhereInput>;
  updatedBy?: InputMaybe<IdWhereInput>;
  viewers?: InputMaybe<AudienceWhereInput>;
};

export type FinalizeCaptureInput = {
  captureId: Scalars['String']['input'];
  timeZone: Scalars['String']['input'];
};

/** Fields on FollowApproval that carry a typed index, and can therefore be grouped by. */
export enum FollowApprovalAggregatableField {
  FOLLOWERID = 'FOLLOWERID',
  REQUESTID = 'REQUESTID',
  STATUS = 'STATUS'
}

export type FollowApprovalOrderByInput = {
  createdAt?: InputMaybe<SortDirection>;
  followerId?: InputMaybe<SortDirection>;
  id?: InputMaybe<SortDirection>;
  naturalKey?: InputMaybe<SortDirection>;
  requestId?: InputMaybe<SortDirection>;
  status?: InputMaybe<SortDirection>;
  updatedAt?: InputMaybe<SortDirection>;
};

export type FollowApprovalWhereInput = {
  AND?: InputMaybe<Array<InputMaybe<FollowApprovalWhereInput>>>;
  NOT?: InputMaybe<FollowApprovalWhereInput>;
  OR?: InputMaybe<Array<InputMaybe<FollowApprovalWhereInput>>>;
  createdAt?: InputMaybe<DateTimeWhereInput>;
  createdBy?: InputMaybe<IdWhereInput>;
  followerId?: InputMaybe<TextWhereInput>;
  id?: InputMaybe<IdWhereInput>;
  naturalKey?: InputMaybe<TextWhereInput>;
  ownerId?: InputMaybe<IdWhereInput>;
  ownerKind?: InputMaybe<TextWhereInput>;
  requestId?: InputMaybe<TextWhereInput>;
  status?: InputMaybe<TextWhereInput>;
  updatedAt?: InputMaybe<DateTimeWhereInput>;
  updatedBy?: InputMaybe<IdWhereInput>;
  viewers?: InputMaybe<AudienceWhereInput>;
};

export type FollowCatInput = {
  catId: Scalars['String']['input'];
  following: Scalars['Boolean']['input'];
};

/** Fields on FollowRequest that carry a typed index, and can therefore be grouped by. */
export enum FollowRequestAggregatableField {
  FOLLOWEEID = 'FOLLOWEEID',
  STATUS = 'STATUS'
}

export type FollowRequestOrderByInput = {
  createdAt?: InputMaybe<SortDirection>;
  followeeId?: InputMaybe<SortDirection>;
  id?: InputMaybe<SortDirection>;
  naturalKey?: InputMaybe<SortDirection>;
  status?: InputMaybe<SortDirection>;
  updatedAt?: InputMaybe<SortDirection>;
};

export type FollowRequestWhereInput = {
  AND?: InputMaybe<Array<InputMaybe<FollowRequestWhereInput>>>;
  NOT?: InputMaybe<FollowRequestWhereInput>;
  OR?: InputMaybe<Array<InputMaybe<FollowRequestWhereInput>>>;
  createdAt?: InputMaybe<DateTimeWhereInput>;
  createdBy?: InputMaybe<IdWhereInput>;
  followeeId?: InputMaybe<TextWhereInput>;
  id?: InputMaybe<IdWhereInput>;
  naturalKey?: InputMaybe<TextWhereInput>;
  ownerId?: InputMaybe<IdWhereInput>;
  ownerKind?: InputMaybe<TextWhereInput>;
  status?: InputMaybe<TextWhereInput>;
  updatedAt?: InputMaybe<DateTimeWhereInput>;
  updatedBy?: InputMaybe<IdWhereInput>;
};

export type FollowUserInput = {
  follower?: InputMaybe<FollowUserInputFollower>;
  following?: InputMaybe<Scalars['Boolean']['input']>;
  userId: Scalars['String']['input'];
};

export enum FollowUserInputFollower {
  accept = 'accept',
  decline = 'decline',
  remove = 'remove'
}

/** The kind of principal a grant is given to. */
export enum GranteeKind {
  USER = 'USER'
}

export type IdWhereInput = {
  eq?: InputMaybe<Scalars['ID']['input']>;
  in?: InputMaybe<Array<InputMaybe<Scalars['ID']['input']>>>;
  isNotNull?: InputMaybe<Scalars['Boolean']['input']>;
  isNull?: InputMaybe<Scalars['Boolean']['input']>;
  ne?: InputMaybe<Scalars['ID']['input']>;
  nin?: InputMaybe<Array<InputMaybe<Scalars['ID']['input']>>>;
};

/** Output format for an image variant. */
export enum ImageFormat {
  AVIF = 'AVIF',
  JPEG = 'JPEG',
  PNG = 'PNG',
  WEBP = 'WEBP'
}

export type IntegerWhereInput = {
  eq?: InputMaybe<Scalars['Int']['input']>;
  gt?: InputMaybe<Scalars['Int']['input']>;
  gte?: InputMaybe<Scalars['Int']['input']>;
  in?: InputMaybe<Array<InputMaybe<Scalars['Int']['input']>>>;
  isNotNull?: InputMaybe<Scalars['Boolean']['input']>;
  isNull?: InputMaybe<Scalars['Boolean']['input']>;
  lt?: InputMaybe<Scalars['Int']['input']>;
  lte?: InputMaybe<Scalars['Int']['input']>;
  ne?: InputMaybe<Scalars['Int']['input']>;
  nin?: InputMaybe<Array<InputMaybe<Scalars['Int']['input']>>>;
};

export type LikeCaptureInput = {
  liked: Scalars['Boolean']['input'];
  photoKey: Scalars['String']['input'];
};

export enum MediaConfigFitEnum {
  /** Contain (render at native aspect ratio) */
  contain = 'contain',
  /** Cover (fill the container, crop overflow) */
  cover = 'cover'
}

export type MenuItemChildrenListWhereInput = {
  /** All items match (vacuously true on empty list). */
  every?: InputMaybe<MenuItemWhereInput>;
  /** Zero items match. */
  none?: InputMaybe<MenuItemWhereInput>;
  /** At least one item matches. */
  some?: InputMaybe<MenuItemWhereInput>;
};

export type MenuItemWhereInput = {
  AND?: InputMaybe<Array<InputMaybe<MenuItemWhereInput>>>;
  NOT?: InputMaybe<MenuItemWhereInput>;
  OR?: InputMaybe<Array<InputMaybe<MenuItemWhereInput>>>;
  children?: InputMaybe<MenuItemChildrenListWhereInput>;
  createdAt?: InputMaybe<DateTimeWhereInput>;
  createdBy?: InputMaybe<IdWhereInput>;
  id?: InputMaybe<IdWhereInput>;
  label?: InputMaybe<TextWhereInput>;
  naturalKey?: InputMaybe<TextWhereInput>;
  openInNewTab?: InputMaybe<BooleanWhereInput>;
  ownerId?: InputMaybe<IdWhereInput>;
  ownerKind?: InputMaybe<TextWhereInput>;
  pageRef?: InputMaybe<PageWhereInput>;
  updatedAt?: InputMaybe<DateTimeWhereInput>;
  updatedBy?: InputMaybe<IdWhereInput>;
  url?: InputMaybe<TextWhereInput>;
};

export type MenuItemsListWhereInput = {
  /** All items match (vacuously true on empty list). */
  every?: InputMaybe<MenuItemWhereInput>;
  /** Zero items match. */
  none?: InputMaybe<MenuItemWhereInput>;
  /** At least one item matches. */
  some?: InputMaybe<MenuItemWhereInput>;
};

export type MenuOrderByInput = {
  createdAt?: InputMaybe<SortDirection>;
  id?: InputMaybe<SortDirection>;
  naturalKey?: InputMaybe<SortDirection>;
  updatedAt?: InputMaybe<SortDirection>;
};

export type MenuWhereInput = {
  AND?: InputMaybe<Array<InputMaybe<MenuWhereInput>>>;
  NOT?: InputMaybe<MenuWhereInput>;
  OR?: InputMaybe<Array<InputMaybe<MenuWhereInput>>>;
  createdAt?: InputMaybe<DateTimeWhereInput>;
  createdBy?: InputMaybe<IdWhereInput>;
  id?: InputMaybe<IdWhereInput>;
  items?: InputMaybe<MenuItemsListWhereInput>;
  naturalKey?: InputMaybe<TextWhereInput>;
  ownerId?: InputMaybe<IdWhereInput>;
  ownerKind?: InputMaybe<TextWhereInput>;
  title?: InputMaybe<TextWhereInput>;
  updatedAt?: InputMaybe<DateTimeWhereInput>;
  updatedBy?: InputMaybe<IdWhereInput>;
};

/** Fields on ModerationCase that carry a typed index, and can therefore be grouped by. */
export enum ModerationCaseAggregatableField {
  DIGEST = 'DIGEST',
  FILEID = 'FILEID',
  MODEL = 'MODEL',
  REVIEWEDBY = 'REVIEWEDBY',
  STATUS = 'STATUS',
  TARGETID = 'TARGETID',
  TARGETTYPE = 'TARGETTYPE'
}

export type ModerationCaseOrderByInput = {
  createdAt?: InputMaybe<SortDirection>;
  digest?: InputMaybe<SortDirection>;
  fileId?: InputMaybe<SortDirection>;
  id?: InputMaybe<SortDirection>;
  model?: InputMaybe<SortDirection>;
  naturalKey?: InputMaybe<SortDirection>;
  reviewedBy?: InputMaybe<SortDirection>;
  status?: InputMaybe<SortDirection>;
  targetId?: InputMaybe<SortDirection>;
  targetType?: InputMaybe<SortDirection>;
  updatedAt?: InputMaybe<SortDirection>;
};

export type ModerationCaseWhereInput = {
  AND?: InputMaybe<Array<InputMaybe<ModerationCaseWhereInput>>>;
  NOT?: InputMaybe<ModerationCaseWhereInput>;
  OR?: InputMaybe<Array<InputMaybe<ModerationCaseWhereInput>>>;
  categories?: InputMaybe<Scalars['JSON']['input']>;
  createdAt?: InputMaybe<DateTimeWhereInput>;
  createdBy?: InputMaybe<IdWhereInput>;
  digest?: InputMaybe<TextWhereInput>;
  fileId?: InputMaybe<TextWhereInput>;
  id?: InputMaybe<IdWhereInput>;
  model?: InputMaybe<TextWhereInput>;
  naturalKey?: InputMaybe<TextWhereInput>;
  ownerId?: InputMaybe<IdWhereInput>;
  ownerKind?: InputMaybe<TextWhereInput>;
  reviewReason?: InputMaybe<TextWhereInput>;
  reviewedAt?: InputMaybe<DateTimeWhereInput>;
  reviewedBy?: InputMaybe<TextWhereInput>;
  status?: InputMaybe<TextWhereInput>;
  targetId?: InputMaybe<TextWhereInput>;
  targetType?: InputMaybe<TextWhereInput>;
  text?: InputMaybe<TextWhereInput>;
  updatedAt?: InputMaybe<DateTimeWhereInput>;
  updatedBy?: InputMaybe<IdWhereInput>;
};

/** Fields on NoteTag that carry a typed index, and can therefore be grouped by. */
export enum NoteTagAggregatableField {
  POSITION = 'POSITION'
}

export type NoteTagAggregateInput = {
  field: NoteTagNumericField;
  op: AggregateOp;
};

/** Numeric fields on NoteTag that can be summed, averaged or bounded. */
export enum NoteTagNumericField {
  POSITION = 'POSITION'
}

export type NoteTagOrderByInput = {
  createdAt?: InputMaybe<SortDirection>;
  id?: InputMaybe<SortDirection>;
  naturalKey?: InputMaybe<SortDirection>;
  position?: InputMaybe<SortDirection>;
  updatedAt?: InputMaybe<SortDirection>;
};

export type NoteTagWhereInput = {
  AND?: InputMaybe<Array<InputMaybe<NoteTagWhereInput>>>;
  NOT?: InputMaybe<NoteTagWhereInput>;
  OR?: InputMaybe<Array<InputMaybe<NoteTagWhereInput>>>;
  createdAt?: InputMaybe<DateTimeWhereInput>;
  createdBy?: InputMaybe<IdWhereInput>;
  id?: InputMaybe<IdWhereInput>;
  label?: InputMaybe<TextWhereInput>;
  naturalKey?: InputMaybe<TextWhereInput>;
  ownerId?: InputMaybe<IdWhereInput>;
  ownerKind?: InputMaybe<TextWhereInput>;
  position?: InputMaybe<IntegerWhereInput>;
  updatedAt?: InputMaybe<DateTimeWhereInput>;
  updatedBy?: InputMaybe<IdWhereInput>;
};

/** A notification category declared by this project. The recipient's per-category preferences gate delivery on it. */
export enum NotificationCategory {
  /** Artwork ready */
  art_ready = 'art_ready',
  /** Community updates */
  community_updates = 'community_updates',
  /** Streak reminders */
  streak_reminder = 'streak_reminder'
}

/** Fields on NotificationSettings that carry a typed index, and can therefore be grouped by. */
export enum NotificationSettingsAggregatableField {
  ARTREADY = 'ARTREADY',
  BESTSTREAK = 'BESTSTREAK',
  COMMUNITYUPDATES = 'COMMUNITYUPDATES',
  CURRENTSTREAK = 'CURRENTSTREAK',
  STREAKDAY = 'STREAKDAY',
  STREAKREMINDERS = 'STREAKREMINDERS'
}

export type NotificationSettingsAggregateInput = {
  field: NotificationSettingsNumericField;
  op: AggregateOp;
};

/** Numeric fields on NotificationSettings that can be summed, averaged or bounded. */
export enum NotificationSettingsNumericField {
  BESTSTREAK = 'BESTSTREAK',
  CURRENTSTREAK = 'CURRENTSTREAK'
}

export type NotificationSettingsOrderByInput = {
  artReady?: InputMaybe<SortDirection>;
  bestStreak?: InputMaybe<SortDirection>;
  communityUpdates?: InputMaybe<SortDirection>;
  createdAt?: InputMaybe<SortDirection>;
  currentStreak?: InputMaybe<SortDirection>;
  id?: InputMaybe<SortDirection>;
  naturalKey?: InputMaybe<SortDirection>;
  streakDay?: InputMaybe<SortDirection>;
  streakReminders?: InputMaybe<SortDirection>;
  updatedAt?: InputMaybe<SortDirection>;
};

export type NotificationSettingsWhereInput = {
  AND?: InputMaybe<Array<InputMaybe<NotificationSettingsWhereInput>>>;
  NOT?: InputMaybe<NotificationSettingsWhereInput>;
  OR?: InputMaybe<Array<InputMaybe<NotificationSettingsWhereInput>>>;
  artReady?: InputMaybe<BooleanWhereInput>;
  bestStreak?: InputMaybe<IntegerWhereInput>;
  communityUpdates?: InputMaybe<BooleanWhereInput>;
  createdAt?: InputMaybe<DateTimeWhereInput>;
  createdBy?: InputMaybe<IdWhereInput>;
  currentStreak?: InputMaybe<IntegerWhereInput>;
  id?: InputMaybe<IdWhereInput>;
  naturalKey?: InputMaybe<TextWhereInput>;
  ownerId?: InputMaybe<IdWhereInput>;
  ownerKind?: InputMaybe<TextWhereInput>;
  reminderHour?: InputMaybe<IntegerWhereInput>;
  streakDay?: InputMaybe<TextWhereInput>;
  streakReminders?: InputMaybe<BooleanWhereInput>;
  timeZone?: InputMaybe<TextWhereInput>;
  updatedAt?: InputMaybe<DateTimeWhereInput>;
  updatedBy?: InputMaybe<IdWhereInput>;
};

/** Status of an operation execution */
export enum OperationExecutionStatus {
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
  DISPATCHED = 'DISPATCHED',
  FAILED = 'FAILED',
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  TIMED_OUT = 'TIMED_OUT'
}

export enum OverlaySettingsPositionEnum {
  /** Bottom Center */
  bottom_center = 'bottom_center',
  /** Bottom Left */
  bottom_left = 'bottom_left',
  /** Bottom Right */
  bottom_right = 'bottom_right',
  /** Center */
  center = 'center',
  /** Top Center */
  top_center = 'top_center',
  /** Top Left */
  top_left = 'top_left',
  /** Top Right */
  top_right = 'top_right'
}

export enum OverlaySettingsScrimColorEnum {
  /** Dark (black tint) */
  dark = 'dark',
  /** Light (white tint) */
  light = 'light'
}

export enum OverlaySettingsThemeEnum {
  /** Dark */
  dark = 'dark',
  /** Light */
  light = 'light'
}

export type PageOrderByInput = {
  createdAt?: InputMaybe<SortDirection>;
  id?: InputMaybe<SortDirection>;
  naturalKey?: InputMaybe<SortDirection>;
  updatedAt?: InputMaybe<SortDirection>;
};

export type PageWhereInput = {
  AND?: InputMaybe<Array<InputMaybe<PageWhereInput>>>;
  NOT?: InputMaybe<PageWhereInput>;
  OR?: InputMaybe<Array<InputMaybe<PageWhereInput>>>;
  blocks?: InputMaybe<Scalars['JSON']['input']>;
  createdAt?: InputMaybe<DateTimeWhereInput>;
  createdBy?: InputMaybe<IdWhereInput>;
  id?: InputMaybe<IdWhereInput>;
  naturalKey?: InputMaybe<TextWhereInput>;
  ownerId?: InputMaybe<IdWhereInput>;
  ownerKind?: InputMaybe<TextWhereInput>;
  seo?: InputMaybe<SeoWhereInput>;
  title?: InputMaybe<TextWhereInput>;
  updatedAt?: InputMaybe<DateTimeWhereInput>;
  updatedBy?: InputMaybe<IdWhereInput>;
};

export type PhotoChallengeOrderByInput = {
  createdAt?: InputMaybe<SortDirection>;
  id?: InputMaybe<SortDirection>;
  naturalKey?: InputMaybe<SortDirection>;
  updatedAt?: InputMaybe<SortDirection>;
};

export type PhotoChallengeWhereInput = {
  AND?: InputMaybe<Array<InputMaybe<PhotoChallengeWhereInput>>>;
  NOT?: InputMaybe<PhotoChallengeWhereInput>;
  OR?: InputMaybe<Array<InputMaybe<PhotoChallengeWhereInput>>>;
  badge?: InputMaybe<IdWhereInput>;
  badgeFileId?: InputMaybe<TextWhereInput>;
  createdAt?: InputMaybe<DateTimeWhereInput>;
  createdBy?: InputMaybe<IdWhereInput>;
  criteria?: InputMaybe<TextWhereInput>;
  criteriaVersion?: InputMaybe<TextWhereInput>;
  description?: InputMaybe<TextWhereInput>;
  enabled?: InputMaybe<BooleanWhereInput>;
  endsAt?: InputMaybe<DateTimeWhereInput>;
  highlightKey?: InputMaybe<TextWhereInput>;
  id?: InputMaybe<IdWhereInput>;
  modelVersion?: InputMaybe<TextWhereInput>;
  naturalKey?: InputMaybe<TextWhereInput>;
  ownerId?: InputMaybe<IdWhereInput>;
  ownerKind?: InputMaybe<TextWhereInput>;
  startsAt?: InputMaybe<DateTimeWhereInput>;
  targetCount?: InputMaybe<IntegerWhereInput>;
  title?: InputMaybe<TextWhereInput>;
  updatedAt?: InputMaybe<DateTimeWhereInput>;
  updatedBy?: InputMaybe<IdWhereInput>;
};

export enum PlatformType {
  ANDROID = 'ANDROID',
  IOS = 'IOS',
  WEB = 'WEB'
}

/** Fields on PremiumGrant that carry a typed index, and can therefore be grouped by. */
export enum PremiumGrantAggregatableField {
  UNTIL = 'UNTIL'
}

export type PremiumGrantOrderByInput = {
  createdAt?: InputMaybe<SortDirection>;
  id?: InputMaybe<SortDirection>;
  naturalKey?: InputMaybe<SortDirection>;
  until?: InputMaybe<SortDirection>;
  updatedAt?: InputMaybe<SortDirection>;
};

export type PremiumGrantWhereInput = {
  AND?: InputMaybe<Array<InputMaybe<PremiumGrantWhereInput>>>;
  NOT?: InputMaybe<PremiumGrantWhereInput>;
  OR?: InputMaybe<Array<InputMaybe<PremiumGrantWhereInput>>>;
  createdAt?: InputMaybe<DateTimeWhereInput>;
  createdBy?: InputMaybe<IdWhereInput>;
  id?: InputMaybe<IdWhereInput>;
  naturalKey?: InputMaybe<TextWhereInput>;
  note?: InputMaybe<TextWhereInput>;
  ownerId?: InputMaybe<IdWhereInput>;
  ownerKind?: InputMaybe<TextWhereInput>;
  until?: InputMaybe<DateTimeWhereInput>;
  updatedAt?: InputMaybe<DateTimeWhereInput>;
  updatedBy?: InputMaybe<IdWhereInput>;
};

/** Fields on Profile that carry a typed index, and can therefore be grouped by. */
export enum ProfileAggregatableField {
  USERNAME = 'USERNAME'
}

export type ProfileCountsInput = {
  userId: Scalars['String']['input'];
};

export type ProfileOrderByInput = {
  createdAt?: InputMaybe<SortDirection>;
  id?: InputMaybe<SortDirection>;
  naturalKey?: InputMaybe<SortDirection>;
  updatedAt?: InputMaybe<SortDirection>;
  username?: InputMaybe<SortDirection>;
};

export type ProfileWhereInput = {
  AND?: InputMaybe<Array<InputMaybe<ProfileWhereInput>>>;
  NOT?: InputMaybe<ProfileWhereInput>;
  OR?: InputMaybe<Array<InputMaybe<ProfileWhereInput>>>;
  bio?: InputMaybe<TextWhereInput>;
  createdAt?: InputMaybe<DateTimeWhereInput>;
  createdBy?: InputMaybe<IdWhereInput>;
  displayName?: InputMaybe<TextWhereInput>;
  id?: InputMaybe<IdWhereInput>;
  naturalKey?: InputMaybe<TextWhereInput>;
  ownerId?: InputMaybe<IdWhereInput>;
  ownerKind?: InputMaybe<TextWhereInput>;
  photo?: InputMaybe<IdWhereInput>;
  privacy?: InputMaybe<TextWhereInput>;
  updatedAt?: InputMaybe<DateTimeWhereInput>;
  updatedBy?: InputMaybe<IdWhereInput>;
  username?: InputMaybe<TextWhereInput>;
};

/** Input for starting a sign-in with an auth provider */
export type ProviderSignInInput = {
  providerKey: Scalars['String']['input'];
  redirectUri?: InputMaybe<Scalars['String']['input']>;
  returnTo?: InputMaybe<Scalars['String']['input']>;
};

export enum ProviderTokenRefresh {
  /** Tried and failed; the token is answered as stored, and refreshFailure says where. */
  FAILED = 'FAILED',
  /** Due, or asked for, within a minute of the last try, so not tried again yet. */
  HELD_BACK = 'HELD_BACK',
  /** The token is fresh, or no refresh token is held to renew it with. */
  NOT_ATTEMPTED = 'NOT_ATTEMPTED',
  /** Renewed for this read, or by a read beside it. */
  REFRESHED = 'REFRESHED'
}

/** Push notification platform */
export enum PushPlatform {
  ANDROID = 'ANDROID',
  IOS = 'IOS',
  WEB = 'WEB'
}

/** Input for registering a device for push notifications */
export type RegisterDeviceTokenInput = {
  deviceName?: InputMaybe<Scalars['String']['input']>;
  platform: PushPlatform;
  token: Scalars['String']['input'];
};

export type ReportContentInput = {
  details?: InputMaybe<Scalars['String']['input']>;
  reason: ReportContentInputReason;
  targetId: Scalars['String']['input'];
  targetType: ReportContentInputTargetType;
};

export enum ReportContentInputReason {
  harassment = 'harassment',
  other = 'other',
  privacy = 'privacy',
  spam = 'spam',
  unsafe = 'unsafe'
}

export enum ReportContentInputTargetType {
  note = 'note',
  post = 'post',
  profile = 'profile'
}

export type ResolveContextInput = {
  /** The country of the visitor a server is calling for, as an ISO 3166-1 alpha-2 code. Requires a key holding visitors:forward. A caller that is its own visitor is placed by the platform and does not pass it. */
  country?: InputMaybe<Scalars['String']['input']>;
  device?: InputMaybe<DeviceType>;
  locale?: InputMaybe<Scalars['String']['input']>;
  /** Report locale resolution: an unconfigured locale as an error, fields with no translation as extensions.localeStrict warnings. Does not change the data returned. */
  localeStrict?: InputMaybe<Scalars['Boolean']['input']>;
  /** Where the visitor a server is calling for is. Requires a key holding visitors:forward. A caller that is its own visitor is placed by the platform and does not pass it. */
  location?: InputMaybe<VisitorLocationInput>;
  platform?: InputMaybe<PlatformType>;
  preview?: InputMaybe<Scalars['Boolean']['input']>;
  /** Return extensions.resolution: the ordered candidates each resolution axis considered, which one served, and why. Requires the targeting:debug scope. Does not change the data returned, and bypasses the response cache. */
  resolutionTrace?: InputMaybe<Scalars['Boolean']['input']>;
  streak1?: InputMaybe<Scalars['String']['input']>;
  streak7?: InputMaybe<Scalars['String']['input']>;
  streak14?: InputMaybe<Scalars['String']['input']>;
  streakContext?: InputMaybe<Scalars['String']['input']>;
};

export type SaveAppearancePreferencesInput = {
  consentVersion?: InputMaybe<Scalars['String']['input']>;
  enabled: Scalars['Boolean']['input'];
};

export type SaveNotificationSettingsInput = {
  artReady: Scalars['Boolean']['input'];
  communityUpdates: Scalars['Boolean']['input'];
  reminderHour: Scalars['Int']['input'];
  streakReminders: Scalars['Boolean']['input'];
  timeZone: Scalars['String']['input'];
};

/** Input for sending notifications to multiple users */
export type SendBulkNotificationsInput = {
  actionUrl?: InputMaybe<Scalars['String']['input']>;
  category: NotificationCategory;
  channels?: InputMaybe<Scalars['JSON']['input']>;
  expiresAt?: InputMaybe<Scalars['DateTime']['input']>;
  imageUrl?: InputMaybe<Scalars['String']['input']>;
  message?: InputMaybe<Scalars['String']['input']>;
  metadata?: InputMaybe<Scalars['JSON']['input']>;
  title: Scalars['String']['input'];
  userIds: Array<Scalars['ID']['input']>;
};

/** Input for sending a notification to a user */
export type SendNotificationInput = {
  actionUrl?: InputMaybe<Scalars['String']['input']>;
  category: NotificationCategory;
  channels?: InputMaybe<Scalars['JSON']['input']>;
  expiresAt?: InputMaybe<Scalars['DateTime']['input']>;
  /** Makes the send safe to retry: sent again with the same key by the same caller, it answers without notifying the user a second time. Refused when reused for a different send. */
  idempotencyKey?: InputMaybe<Scalars['String']['input']>;
  imageUrl?: InputMaybe<Scalars['String']['input']>;
  message?: InputMaybe<Scalars['String']['input']>;
  metadata?: InputMaybe<Scalars['JSON']['input']>;
  title: Scalars['String']['input'];
  userId: Scalars['ID']['input'];
};

export type SeoWhereInput = {
  AND?: InputMaybe<Array<InputMaybe<SeoWhereInput>>>;
  NOT?: InputMaybe<SeoWhereInput>;
  OR?: InputMaybe<Array<InputMaybe<SeoWhereInput>>>;
  canonicalUrl?: InputMaybe<TextWhereInput>;
  createdAt?: InputMaybe<DateTimeWhereInput>;
  createdBy?: InputMaybe<IdWhereInput>;
  id?: InputMaybe<IdWhereInput>;
  jsonLd?: InputMaybe<TextWhereInput>;
  metaDescription?: InputMaybe<TextWhereInput>;
  metaTitle?: InputMaybe<TextWhereInput>;
  naturalKey?: InputMaybe<TextWhereInput>;
  ogDescription?: InputMaybe<TextWhereInput>;
  ogImage?: InputMaybe<IdWhereInput>;
  ogTitle?: InputMaybe<TextWhereInput>;
  ogType?: InputMaybe<TextWhereInput>;
  ownerId?: InputMaybe<IdWhereInput>;
  ownerKind?: InputMaybe<TextWhereInput>;
  robots?: InputMaybe<TextWhereInput>;
  twitterCard?: InputMaybe<TextWhereInput>;
  twitterDescription?: InputMaybe<TextWhereInput>;
  twitterImage?: InputMaybe<IdWhereInput>;
  twitterTitle?: InputMaybe<TextWhereInput>;
  updatedAt?: InputMaybe<DateTimeWhereInput>;
  updatedBy?: InputMaybe<IdWhereInput>;
};

export type SetUserBlockInput = {
  blocked: Scalars['Boolean']['input'];
  userId: Scalars['String']['input'];
};

/** The project's user signup mode */
export enum SignupMode {
  CLOSED = 'CLOSED',
  PUBLIC = 'PUBLIC',
  RESTRICTED = 'RESTRICTED',
  WAITLIST = 'WAITLIST'
}

export enum SortDirection {
  ASC = 'ASC',
  DESC = 'DESC'
}

/** Fields on StreakTier that carry a typed index, and can therefore be grouped by. */
export enum StreakTierAggregatableField {
  DAYS = 'DAYS'
}

export type StreakTierAggregateInput = {
  field: StreakTierNumericField;
  op: AggregateOp;
};

/** Numeric fields on StreakTier that can be summed, averaged or bounded. */
export enum StreakTierNumericField {
  DAYS = 'DAYS'
}

export type StreakTierOrderByInput = {
  createdAt?: InputMaybe<SortDirection>;
  days?: InputMaybe<SortDirection>;
  id?: InputMaybe<SortDirection>;
  naturalKey?: InputMaybe<SortDirection>;
  updatedAt?: InputMaybe<SortDirection>;
};

export type StreakTierWhereInput = {
  AND?: InputMaybe<Array<InputMaybe<StreakTierWhereInput>>>;
  NOT?: InputMaybe<StreakTierWhereInput>;
  OR?: InputMaybe<Array<InputMaybe<StreakTierWhereInput>>>;
  animated?: InputMaybe<BooleanWhereInput>;
  badge?: InputMaybe<IdWhereInput>;
  createdAt?: InputMaybe<DateTimeWhereInput>;
  createdBy?: InputMaybe<IdWhereInput>;
  days?: InputMaybe<IntegerWhereInput>;
  id?: InputMaybe<IdWhereInput>;
  name?: InputMaybe<TextWhereInput>;
  naturalKey?: InputMaybe<TextWhereInput>;
  ownerId?: InputMaybe<IdWhereInput>;
  ownerKind?: InputMaybe<TextWhereInput>;
  stylePrompt?: InputMaybe<TextWhereInput>;
  updatedAt?: InputMaybe<DateTimeWhereInput>;
  updatedBy?: InputMaybe<IdWhereInput>;
};

export type TextWhereInput = {
  contains?: InputMaybe<Scalars['String']['input']>;
  endsWith?: InputMaybe<Scalars['String']['input']>;
  eq?: InputMaybe<Scalars['String']['input']>;
  gt?: InputMaybe<Scalars['String']['input']>;
  gte?: InputMaybe<Scalars['String']['input']>;
  ilike?: InputMaybe<Scalars['String']['input']>;
  in?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
  isNotNull?: InputMaybe<Scalars['Boolean']['input']>;
  isNull?: InputMaybe<Scalars['Boolean']['input']>;
  like?: InputMaybe<Scalars['String']['input']>;
  lt?: InputMaybe<Scalars['String']['input']>;
  lte?: InputMaybe<Scalars['String']['input']>;
  ne?: InputMaybe<Scalars['String']['input']>;
  nin?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
  startsWith?: InputMaybe<Scalars['String']['input']>;
};

export type TidyFollowersInput = {
  data?: InputMaybe<Scalars['JSON']['input']>;
};

export type TillyAddFieldNoteInput = {
  photoKey: Scalars['String']['input'];
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
  text?: InputMaybe<Scalars['String']['input']>;
};

export type TillyClaimPremiumInput = {
  data?: InputMaybe<Scalars['JSON']['input']>;
};

export type TillyPostMyCatchesInput = {
  data?: InputMaybe<Scalars['JSON']['input']>;
};

export type TillySaveCatchInput = {
  captureKey: Scalars['String']['input'];
  cats: Array<TillySaveCatchInputCatsItem>;
  lat: Scalars['Float']['input'];
  lng: Scalars['Float']['input'];
  photoFileId: Scalars['String']['input'];
};

export type TillySaveCatchInputCatsItem = {
  bounds?: InputMaybe<TillySaveCatchInputCatsItemBounds>;
  catId?: InputMaybe<Scalars['String']['input']>;
  key: Scalars['String']['input'];
  name?: InputMaybe<Scalars['String']['input']>;
  position?: InputMaybe<TillySaveCatchInputCatsItemPosition>;
  vector?: InputMaybe<Array<Scalars['Float']['input']>>;
  vectorModel?: InputMaybe<Scalars['String']['input']>;
};

export type TillySaveCatchInputCatsItemBounds = {
  height: Scalars['Float']['input'];
  width: Scalars['Float']['input'];
  x: Scalars['Float']['input'];
  y: Scalars['Float']['input'];
};

export type TillySaveCatchInputCatsItemPosition = {
  x: Scalars['Float']['input'];
  y: Scalars['Float']['input'];
};

export type TillySaveProfileInput = {
  bio?: InputMaybe<Scalars['String']['input']>;
  displayName: Scalars['String']['input'];
  photoFileId?: InputMaybe<Scalars['String']['input']>;
  privacy?: InputMaybe<TillySaveProfileInputPrivacy>;
  removePhoto?: InputMaybe<Scalars['Boolean']['input']>;
  username: Scalars['String']['input'];
};

export enum TillySaveProfileInputPrivacy {
  private = 'private',
  public = 'public'
}

export type TillyShareCaptureInput = {
  comment?: InputMaybe<Scalars['String']['input']>;
  note?: InputMaybe<Scalars['String']['input']>;
  photoKey?: InputMaybe<Scalars['String']['input']>;
  reposted?: InputMaybe<Scalars['Boolean']['input']>;
  reshareOf?: InputMaybe<Scalars['String']['input']>;
};

export enum TillySuggestCatAppearanceOutputAnswerCatsItemCoatLength {
  long = 'long',
  medium = 'medium',
  short = 'short',
  unknown = 'unknown'
}

export enum TillySuggestCatAppearanceOutputAnswerCatsItemPattern {
  bicolour = 'bicolour',
  colourpoint = 'colourpoint',
  mixed = 'mixed',
  solid = 'solid',
  tabby = 'tabby',
  tortoiseshell = 'tortoiseshell',
  tricolour = 'tricolour',
  unknown = 'unknown'
}

export enum TillySuggestCatAppearanceOutputAnswerCatsItemStatus {
  mixed = 'mixed',
  no_cat = 'no_cat',
  possible = 'possible',
  unknown = 'unknown'
}

export type TillyUpdateCaptureTagsInput = {
  cats: Array<TillyUpdateCaptureTagsInputCatsItem>;
  expectedRevision: Scalars['String']['input'];
  photoKey: Scalars['String']['input'];
  revision: Scalars['String']['input'];
};

export type TillyUpdateCaptureTagsInputCatsItem = {
  bounds?: InputMaybe<TillyUpdateCaptureTagsInputCatsItemBounds>;
  catId?: InputMaybe<Scalars['String']['input']>;
  key: Scalars['String']['input'];
  name?: InputMaybe<Scalars['String']['input']>;
  position?: InputMaybe<TillyUpdateCaptureTagsInputCatsItemPosition>;
  vector?: InputMaybe<Array<Scalars['Float']['input']>>;
  vectorModel?: InputMaybe<Scalars['String']['input']>;
};

export type TillyUpdateCaptureTagsInputCatsItemBounds = {
  height: Scalars['Float']['input'];
  width: Scalars['Float']['input'];
  x: Scalars['Float']['input'];
  y: Scalars['Float']['input'];
};

export type TillyUpdateCaptureTagsInputCatsItemPosition = {
  x: Scalars['Float']['input'];
  y: Scalars['Float']['input'];
};

export type TillyWebCheckoutInput = {
  data?: InputMaybe<Scalars['JSON']['input']>;
};

export type TillyWebPortalInput = {
  data?: InputMaybe<Scalars['JSON']['input']>;
};

export type UiCopyEntriesListWhereInput = {
  /** All items match (vacuously true on empty list). */
  every?: InputMaybe<UiCopyEntryWhereInput>;
  /** Zero items match. */
  none?: InputMaybe<UiCopyEntryWhereInput>;
  /** At least one item matches. */
  some?: InputMaybe<UiCopyEntryWhereInput>;
};

export type UiCopyEntryWhereInput = {
  AND?: InputMaybe<Array<InputMaybe<UiCopyEntryWhereInput>>>;
  NOT?: InputMaybe<UiCopyEntryWhereInput>;
  OR?: InputMaybe<Array<InputMaybe<UiCopyEntryWhereInput>>>;
  createdAt?: InputMaybe<DateTimeWhereInput>;
  createdBy?: InputMaybe<IdWhereInput>;
  id?: InputMaybe<IdWhereInput>;
  key?: InputMaybe<TextWhereInput>;
  naturalKey?: InputMaybe<TextWhereInput>;
  ownerId?: InputMaybe<IdWhereInput>;
  ownerKind?: InputMaybe<TextWhereInput>;
  updatedAt?: InputMaybe<DateTimeWhereInput>;
  updatedBy?: InputMaybe<IdWhereInput>;
  value?: InputMaybe<TextWhereInput>;
};

export type UiCopyOrderByInput = {
  createdAt?: InputMaybe<SortDirection>;
  id?: InputMaybe<SortDirection>;
  naturalKey?: InputMaybe<SortDirection>;
  updatedAt?: InputMaybe<SortDirection>;
};

export type UiCopyWhereInput = {
  AND?: InputMaybe<Array<InputMaybe<UiCopyWhereInput>>>;
  NOT?: InputMaybe<UiCopyWhereInput>;
  OR?: InputMaybe<Array<InputMaybe<UiCopyWhereInput>>>;
  createdAt?: InputMaybe<DateTimeWhereInput>;
  createdBy?: InputMaybe<IdWhereInput>;
  entries?: InputMaybe<UiCopyEntriesListWhereInput>;
  id?: InputMaybe<IdWhereInput>;
  naturalKey?: InputMaybe<TextWhereInput>;
  ownerId?: InputMaybe<IdWhereInput>;
  ownerKind?: InputMaybe<TextWhereInput>;
  updatedAt?: InputMaybe<DateTimeWhereInput>;
  updatedBy?: InputMaybe<IdWhereInput>;
};

/** Input for updating a notification preference */
export type UpdateNotificationPreferenceInput = {
  category: NotificationCategory;
  channel: Scalars['String']['input'];
  enabled: Scalars['Boolean']['input'];
};

/** Fields on UserBlock that carry a typed index, and can therefore be grouped by. */
export enum UserBlockAggregatableField {
  BLOCKEDUSERID = 'BLOCKEDUSERID'
}

export type UserBlockOrderByInput = {
  blockedUserId?: InputMaybe<SortDirection>;
  createdAt?: InputMaybe<SortDirection>;
  id?: InputMaybe<SortDirection>;
  naturalKey?: InputMaybe<SortDirection>;
  updatedAt?: InputMaybe<SortDirection>;
};

export type UserBlockWhereInput = {
  AND?: InputMaybe<Array<InputMaybe<UserBlockWhereInput>>>;
  NOT?: InputMaybe<UserBlockWhereInput>;
  OR?: InputMaybe<Array<InputMaybe<UserBlockWhereInput>>>;
  blockedUserId?: InputMaybe<TextWhereInput>;
  createdAt?: InputMaybe<DateTimeWhereInput>;
  createdBy?: InputMaybe<IdWhereInput>;
  id?: InputMaybe<IdWhereInput>;
  naturalKey?: InputMaybe<TextWhereInput>;
  ownerId?: InputMaybe<IdWhereInput>;
  ownerKind?: InputMaybe<TextWhereInput>;
  updatedAt?: InputMaybe<DateTimeWhereInput>;
  updatedBy?: InputMaybe<IdWhereInput>;
};

/** Resource visibility. PRIVATE = owner and explicit grantees only; PUBLIC additionally opens READ to anyone. */
export enum Visibility {
  PRIVATE = 'PRIVATE',
  PUBLIC = 'PUBLIC'
}

/** Where the visitor a server is calling for is, in decimal degrees. */
export type VisitorLocationInput = {
  latitude: Scalars['Float']['input'];
  longitude: Scalars['Float']['input'];
};

export type GetCookieConsentQueryVariables = Exact<{
  naturalKey: Scalars['String']['input'];
  locale?: InputMaybe<Scalars['String']['input']>;
  preview?: InputMaybe<Scalars['Boolean']['input']>;
}>;


export type GetCookieConsentQuery = { __typename?: 'Query', cookieConsent?: { __typename?: 'CookieConsent', _id: string, _naturalKey?: string | null, consentTitle?: string | null, consentDescription?: string | null, acceptAllLabel?: string | null, rejectAllLabel?: string | null, manageLabel?: string | null, preferencesTitle?: string | null, saveLabel?: string | null, sections?: Array<{ __typename?: 'CookieSection', title?: string | null, description?: string | null, categoryKey?: string | null, enabled?: boolean | null, readOnly?: boolean | null } | null> | null } | null };

export type GetMenuQueryVariables = Exact<{
  naturalKey: Scalars['String']['input'];
  locale?: InputMaybe<Scalars['String']['input']>;
  preview?: InputMaybe<Scalars['Boolean']['input']>;
}>;


export type GetMenuQuery = { __typename?: 'Query', menu?: { __typename?: 'Menu', _id: string, _naturalKey?: string | null, title?: string | null, items?: Array<{ __typename?: 'MenuItem', label?: string | null, url?: string | null, openInNewTab?: boolean | null, pageRef?: { __typename?: 'Page', _naturalKey?: string | null } | null, children?: Array<{ __typename?: 'MenuItem', label?: string | null, url?: string | null, openInNewTab?: boolean | null, pageRef?: { __typename?: 'Page', _naturalKey?: string | null } | null } | null> | null } | null> | null } | null };

export type ImageFieldsFragment = { __typename?: 'Image', url?: string | null, alt?: string | null, width?: number | null, height?: number | null, blurhash?: string | null, dominantColor?: string | null, crop?: { [key: string]: any } | null, variants?: { __typename?: 'ImageVariantSet', thumbnail?: { __typename?: 'ImageVariant', url: string } | null, small?: { __typename?: 'ImageVariant', url: string } | null, medium?: { __typename?: 'ImageVariant', url: string } | null, large?: { __typename?: 'ImageVariant', url: string } | null } | null };

export type VideoFieldsFragment = { __typename?: 'Video', url?: string | null, width?: number | null, height?: number | null, blurhash?: string | null, dominantColor?: string | null, thumbnailUrl?: string | null, previewUrl?: string | null, hlsManifestUrl?: string | null, duration?: number | null };

export type PassageFieldsFragment = { __typename: 'Passage', _id?: string | null, kind?: string | null, token?: string | null, align?: string | null, list?: string | null, level?: number | null, language?: string | null, markDefs?: { [key: string]: any } | null, spans?: Array<{ __typename?: 'ProseSpan', text?: string | null, marks?: Array<string | null> | null } | null> | null };

export type CtaFieldsFragment = { __typename?: 'Cta', label?: string | null, href?: string | null, variant?: CtaVariantEnum | null, openInNewTab?: boolean | null, pageRef?: { __typename?: 'Page', _naturalKey?: string | null } | null };

export type ContentFieldsFragment = { __typename?: 'Content', ctaLayout?: ContentCtaLayoutEnum | null, contentAlign?: ContentAlignEnum | null, richtext?: { __typename?: 'Prose', html?: string | null, entries?: Array<
      | { __typename: 'Content' }
      | { __typename: 'CookieSection' }
      | { __typename: 'Cta' }
      | { __typename: 'EditorialMedia' }
      | { __typename: 'FileValue' }
      | { __typename: 'GeoPoint' }
      | { __typename: 'Image' }
      | { __typename: 'MediaConfig' }
      | { __typename: 'MediaImage' }
      | { __typename: 'MediaOverlay' }
      | { __typename: 'MediaVideo' }
      | { __typename: 'MenuItem' }
      | { __typename: 'OverlaySettings' }
      | { __typename: 'Passage', _id?: string | null, kind?: string | null, token?: string | null, align?: string | null, list?: string | null, level?: number | null, language?: string | null, markDefs?: { [key: string]: any } | null, spans?: Array<{ __typename?: 'ProseSpan', text?: string | null, marks?: Array<string | null> | null } | null> | null }
      | { __typename: 'Reference' }
      | { __typename: 'Seo' }
      | { __typename: 'UiCopyEntry' }
      | { __typename: 'Video' }
     | null> | null } | null, ctas?: Array<{ __typename?: 'Cta', label?: string | null, href?: string | null, variant?: CtaVariantEnum | null, openInNewTab?: boolean | null, pageRef?: { __typename?: 'Page', _naturalKey?: string | null } | null } | null> | null };

export type OverlaySettingsFieldsFragment = { __typename?: 'OverlaySettings', position?: OverlaySettingsPositionEnum | null, theme?: OverlaySettingsThemeEnum | null, scrimColor?: OverlaySettingsScrimColorEnum | null, scrimOpacity?: any | null };

export type MediaFieldsFragment = { __typename?: 'EditorialMedia', linkUrl?: string | null, linkOpenInNewTab?: boolean | null, image?: { __typename?: 'MediaImage', desktop?: { __typename?: 'Image', url?: string | null, alt?: string | null, width?: number | null, height?: number | null, blurhash?: string | null, dominantColor?: string | null, crop?: { [key: string]: any } | null, variants?: { __typename?: 'ImageVariantSet', thumbnail?: { __typename?: 'ImageVariant', url: string } | null, small?: { __typename?: 'ImageVariant', url: string } | null, medium?: { __typename?: 'ImageVariant', url: string } | null, large?: { __typename?: 'ImageVariant', url: string } | null } | null } | null, mobile?: { __typename?: 'Image', url?: string | null, alt?: string | null, width?: number | null, height?: number | null, blurhash?: string | null, dominantColor?: string | null, crop?: { [key: string]: any } | null, variants?: { __typename?: 'ImageVariantSet', thumbnail?: { __typename?: 'ImageVariant', url: string } | null, small?: { __typename?: 'ImageVariant', url: string } | null, medium?: { __typename?: 'ImageVariant', url: string } | null, large?: { __typename?: 'ImageVariant', url: string } | null } | null } | null } | null, video?: { __typename?: 'MediaVideo', desktop?: { __typename?: 'Video', url?: string | null, width?: number | null, height?: number | null, blurhash?: string | null, dominantColor?: string | null, thumbnailUrl?: string | null, previewUrl?: string | null, hlsManifestUrl?: string | null, duration?: number | null } | null, mobile?: { __typename?: 'Video', url?: string | null, width?: number | null, height?: number | null, blurhash?: string | null, dominantColor?: string | null, thumbnailUrl?: string | null, previewUrl?: string | null, hlsManifestUrl?: string | null, duration?: number | null } | null } | null, config?: { __typename?: 'MediaConfig', alt?: string | null, fit?: MediaConfigFitEnum | null, autoplay?: boolean | null, muted?: boolean | null, loop?: boolean | null } | null, overlay?: { __typename?: 'MediaOverlay', content?: { __typename?: 'Content', ctaLayout?: ContentCtaLayoutEnum | null, contentAlign?: ContentAlignEnum | null, richtext?: { __typename?: 'Prose', html?: string | null, entries?: Array<
          | { __typename: 'Content' }
          | { __typename: 'CookieSection' }
          | { __typename: 'Cta' }
          | { __typename: 'EditorialMedia' }
          | { __typename: 'FileValue' }
          | { __typename: 'GeoPoint' }
          | { __typename: 'Image' }
          | { __typename: 'MediaConfig' }
          | { __typename: 'MediaImage' }
          | { __typename: 'MediaOverlay' }
          | { __typename: 'MediaVideo' }
          | { __typename: 'MenuItem' }
          | { __typename: 'OverlaySettings' }
          | { __typename: 'Passage', _id?: string | null, kind?: string | null, token?: string | null, align?: string | null, list?: string | null, level?: number | null, language?: string | null, markDefs?: { [key: string]: any } | null, spans?: Array<{ __typename?: 'ProseSpan', text?: string | null, marks?: Array<string | null> | null } | null> | null }
          | { __typename: 'Reference' }
          | { __typename: 'Seo' }
          | { __typename: 'UiCopyEntry' }
          | { __typename: 'Video' }
         | null> | null } | null, ctas?: Array<{ __typename?: 'Cta', label?: string | null, href?: string | null, variant?: CtaVariantEnum | null, openInNewTab?: boolean | null, pageRef?: { __typename?: 'Page', _naturalKey?: string | null } | null } | null> | null } | null, settings?: { __typename?: 'OverlaySettings', position?: OverlaySettingsPositionEnum | null, theme?: OverlaySettingsThemeEnum | null, scrimColor?: OverlaySettingsScrimColorEnum | null, scrimOpacity?: any | null } | null } | null, linkRef?: { __typename?: 'Page', _naturalKey?: string | null } | null };

export type GetPageQueryVariables = Exact<{
  naturalKey: Scalars['String']['input'];
  locale?: InputMaybe<Scalars['String']['input']>;
  preview?: InputMaybe<Scalars['Boolean']['input']>;
}>;


export type GetPageQuery = { __typename?: 'Query', page?: { __typename?: 'Page', _id: string, _naturalKey?: string | null, _modelKey: string, title?: string | null, blocks?: { __typename?: 'Prose', entries?: Array<
        | { __typename: 'Content', ctaLayout?: ContentCtaLayoutEnum | null, contentAlign?: ContentAlignEnum | null, richtext?: { __typename?: 'Prose', html?: string | null, entries?: Array<
              | { __typename: 'Content' }
              | { __typename: 'CookieSection' }
              | { __typename: 'Cta' }
              | { __typename: 'EditorialMedia' }
              | { __typename: 'FileValue' }
              | { __typename: 'GeoPoint' }
              | { __typename: 'Image' }
              | { __typename: 'MediaConfig' }
              | { __typename: 'MediaImage' }
              | { __typename: 'MediaOverlay' }
              | { __typename: 'MediaVideo' }
              | { __typename: 'MenuItem' }
              | { __typename: 'OverlaySettings' }
              | { __typename: 'Passage', _id?: string | null, kind?: string | null, token?: string | null, align?: string | null, list?: string | null, level?: number | null, language?: string | null, markDefs?: { [key: string]: any } | null, spans?: Array<{ __typename?: 'ProseSpan', text?: string | null, marks?: Array<string | null> | null } | null> | null }
              | { __typename: 'Reference' }
              | { __typename: 'Seo' }
              | { __typename: 'UiCopyEntry' }
              | { __typename: 'Video' }
             | null> | null } | null, ctas?: Array<{ __typename?: 'Cta', label?: string | null, href?: string | null, variant?: CtaVariantEnum | null, openInNewTab?: boolean | null, pageRef?: { __typename?: 'Page', _naturalKey?: string | null } | null } | null> | null }
        | { __typename: 'CookieSection' }
        | { __typename: 'Cta' }
        | { __typename: 'EditorialMedia', linkUrl?: string | null, linkOpenInNewTab?: boolean | null, image?: { __typename?: 'MediaImage', desktop?: { __typename?: 'Image', url?: string | null, alt?: string | null, width?: number | null, height?: number | null, blurhash?: string | null, dominantColor?: string | null, crop?: { [key: string]: any } | null, variants?: { __typename?: 'ImageVariantSet', thumbnail?: { __typename?: 'ImageVariant', url: string } | null, small?: { __typename?: 'ImageVariant', url: string } | null, medium?: { __typename?: 'ImageVariant', url: string } | null, large?: { __typename?: 'ImageVariant', url: string } | null } | null } | null, mobile?: { __typename?: 'Image', url?: string | null, alt?: string | null, width?: number | null, height?: number | null, blurhash?: string | null, dominantColor?: string | null, crop?: { [key: string]: any } | null, variants?: { __typename?: 'ImageVariantSet', thumbnail?: { __typename?: 'ImageVariant', url: string } | null, small?: { __typename?: 'ImageVariant', url: string } | null, medium?: { __typename?: 'ImageVariant', url: string } | null, large?: { __typename?: 'ImageVariant', url: string } | null } | null } | null } | null, video?: { __typename?: 'MediaVideo', desktop?: { __typename?: 'Video', url?: string | null, width?: number | null, height?: number | null, blurhash?: string | null, dominantColor?: string | null, thumbnailUrl?: string | null, previewUrl?: string | null, hlsManifestUrl?: string | null, duration?: number | null } | null, mobile?: { __typename?: 'Video', url?: string | null, width?: number | null, height?: number | null, blurhash?: string | null, dominantColor?: string | null, thumbnailUrl?: string | null, previewUrl?: string | null, hlsManifestUrl?: string | null, duration?: number | null } | null } | null, config?: { __typename?: 'MediaConfig', alt?: string | null, fit?: MediaConfigFitEnum | null, autoplay?: boolean | null, muted?: boolean | null, loop?: boolean | null } | null, overlay?: { __typename?: 'MediaOverlay', content?: { __typename?: 'Content', ctaLayout?: ContentCtaLayoutEnum | null, contentAlign?: ContentAlignEnum | null, richtext?: { __typename?: 'Prose', html?: string | null, entries?: Array<
                  | { __typename: 'Content' }
                  | { __typename: 'CookieSection' }
                  | { __typename: 'Cta' }
                  | { __typename: 'EditorialMedia' }
                  | { __typename: 'FileValue' }
                  | { __typename: 'GeoPoint' }
                  | { __typename: 'Image' }
                  | { __typename: 'MediaConfig' }
                  | { __typename: 'MediaImage' }
                  | { __typename: 'MediaOverlay' }
                  | { __typename: 'MediaVideo' }
                  | { __typename: 'MenuItem' }
                  | { __typename: 'OverlaySettings' }
                  | { __typename: 'Passage', _id?: string | null, kind?: string | null, token?: string | null, align?: string | null, list?: string | null, level?: number | null, language?: string | null, markDefs?: { [key: string]: any } | null, spans?: Array<{ __typename?: 'ProseSpan', text?: string | null, marks?: Array<string | null> | null } | null> | null }
                  | { __typename: 'Reference' }
                  | { __typename: 'Seo' }
                  | { __typename: 'UiCopyEntry' }
                  | { __typename: 'Video' }
                 | null> | null } | null, ctas?: Array<{ __typename?: 'Cta', label?: string | null, href?: string | null, variant?: CtaVariantEnum | null, openInNewTab?: boolean | null, pageRef?: { __typename?: 'Page', _naturalKey?: string | null } | null } | null> | null } | null, settings?: { __typename?: 'OverlaySettings', position?: OverlaySettingsPositionEnum | null, theme?: OverlaySettingsThemeEnum | null, scrimColor?: OverlaySettingsScrimColorEnum | null, scrimOpacity?: any | null } | null } | null, linkRef?: { __typename?: 'Page', _naturalKey?: string | null } | null }
        | { __typename: 'FileValue' }
        | { __typename: 'GeoPoint' }
        | { __typename: 'Image' }
        | { __typename: 'MediaConfig' }
        | { __typename: 'MediaImage' }
        | { __typename: 'MediaOverlay' }
        | { __typename: 'MediaVideo' }
        | { __typename: 'MenuItem' }
        | { __typename: 'OverlaySettings' }
        | { __typename: 'Passage', _id?: string | null, kind?: string | null, token?: string | null, align?: string | null, list?: string | null, level?: number | null, language?: string | null, markDefs?: { [key: string]: any } | null, spans?: Array<{ __typename?: 'ProseSpan', text?: string | null, marks?: Array<string | null> | null } | null> | null }
        | { __typename: 'Reference' }
        | { __typename: 'Seo' }
        | { __typename: 'UiCopyEntry' }
        | { __typename: 'Video' }
       | null> | null } | null, seo?: { __typename?: 'Seo', metaTitle?: string | null, metaDescription?: string | null, canonicalUrl?: string | null, robots?: string | null, ogTitle?: string | null, ogDescription?: string | null, ogType?: string | null, twitterCard?: string | null, twitterTitle?: string | null, twitterDescription?: string | null, jsonLd?: string | null, ogImage?: { __typename?: 'Image', url?: string | null, width?: number | null, height?: number | null, alt?: string | null } | null, twitterImage?: { __typename?: 'Image', url?: string | null, width?: number | null, height?: number | null, alt?: string | null } | null } | null } | null };

export type GetDesignTokensQueryVariables = Exact<{ [key: string]: never; }>;


export type GetDesignTokensQuery = { __typename?: 'Query', designTokens?: { __typename?: 'DesignTokens', colors: Array<{ __typename?: 'DesignTokenColor', name: string, value: string }>, spacings: Array<{ __typename?: 'DesignTokenDimension', name: string, value: string }>, radii: Array<{ __typename?: 'DesignTokenDimension', name: string, value: string }> } | null };

export const ImageFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ImageFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Image"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"alt"}},{"kind":"Field","name":{"kind":"Name","value":"width"}},{"kind":"Field","name":{"kind":"Name","value":"height"}},{"kind":"Field","name":{"kind":"Name","value":"blurhash"}},{"kind":"Field","name":{"kind":"Name","value":"dominantColor"}},{"kind":"Field","name":{"kind":"Name","value":"crop"}},{"kind":"Field","name":{"kind":"Name","value":"variants"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"thumbnail"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"url"}}]}},{"kind":"Field","name":{"kind":"Name","value":"small"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"url"}}]}},{"kind":"Field","name":{"kind":"Name","value":"medium"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"url"}}]}},{"kind":"Field","name":{"kind":"Name","value":"large"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"url"}}]}}]}}]}}]} as unknown as DocumentNode<ImageFieldsFragment, unknown>;
export const VideoFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"VideoFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Video"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"width"}},{"kind":"Field","name":{"kind":"Name","value":"height"}},{"kind":"Field","name":{"kind":"Name","value":"blurhash"}},{"kind":"Field","name":{"kind":"Name","value":"dominantColor"}},{"kind":"Field","name":{"kind":"Name","value":"thumbnailUrl"}},{"kind":"Field","name":{"kind":"Name","value":"previewUrl"}},{"kind":"Field","name":{"kind":"Name","value":"hlsManifestUrl"}},{"kind":"Field","name":{"kind":"Name","value":"duration"}}]}}]} as unknown as DocumentNode<VideoFieldsFragment, unknown>;
export const PassageFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PassageFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Passage"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"Field","name":{"kind":"Name","value":"_id"}},{"kind":"Field","name":{"kind":"Name","value":"kind"}},{"kind":"Field","name":{"kind":"Name","value":"token"}},{"kind":"Field","name":{"kind":"Name","value":"align"}},{"kind":"Field","name":{"kind":"Name","value":"list"}},{"kind":"Field","name":{"kind":"Name","value":"level"}},{"kind":"Field","name":{"kind":"Name","value":"language"}},{"kind":"Field","name":{"kind":"Name","value":"markDefs"}},{"kind":"Field","name":{"kind":"Name","value":"spans"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"text"}},{"kind":"Field","name":{"kind":"Name","value":"marks"}}]}}]}}]} as unknown as DocumentNode<PassageFieldsFragment, unknown>;
export const CtaFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"CtaFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Cta"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"label"}},{"kind":"Field","name":{"kind":"Name","value":"href"}},{"kind":"Field","name":{"kind":"Name","value":"variant"}},{"kind":"Field","name":{"kind":"Name","value":"openInNewTab"}},{"kind":"Field","name":{"kind":"Name","value":"pageRef"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"_naturalKey"}}]}}]}}]} as unknown as DocumentNode<CtaFieldsFragment, unknown>;
export const ContentFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ContentFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Content"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","alias":{"kind":"Name","value":"contentAlign"},"name":{"kind":"Name","value":"align"}},{"kind":"Field","name":{"kind":"Name","value":"ctaLayout"}},{"kind":"Field","name":{"kind":"Name","value":"richtext"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"html"}},{"kind":"Field","name":{"kind":"Name","value":"entries"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"PassageFields"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"ctas"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"CtaFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PassageFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Passage"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"Field","name":{"kind":"Name","value":"_id"}},{"kind":"Field","name":{"kind":"Name","value":"kind"}},{"kind":"Field","name":{"kind":"Name","value":"token"}},{"kind":"Field","name":{"kind":"Name","value":"align"}},{"kind":"Field","name":{"kind":"Name","value":"list"}},{"kind":"Field","name":{"kind":"Name","value":"level"}},{"kind":"Field","name":{"kind":"Name","value":"language"}},{"kind":"Field","name":{"kind":"Name","value":"markDefs"}},{"kind":"Field","name":{"kind":"Name","value":"spans"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"text"}},{"kind":"Field","name":{"kind":"Name","value":"marks"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"CtaFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Cta"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"label"}},{"kind":"Field","name":{"kind":"Name","value":"href"}},{"kind":"Field","name":{"kind":"Name","value":"variant"}},{"kind":"Field","name":{"kind":"Name","value":"openInNewTab"}},{"kind":"Field","name":{"kind":"Name","value":"pageRef"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"_naturalKey"}}]}}]}}]} as unknown as DocumentNode<ContentFieldsFragment, unknown>;
export const OverlaySettingsFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"OverlaySettingsFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"OverlaySettings"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"position"}},{"kind":"Field","name":{"kind":"Name","value":"theme"}},{"kind":"Field","name":{"kind":"Name","value":"scrimColor"}},{"kind":"Field","name":{"kind":"Name","value":"scrimOpacity"}}]}}]} as unknown as DocumentNode<OverlaySettingsFieldsFragment, unknown>;
export const MediaFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"MediaFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"EditorialMedia"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"image"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"desktop"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ImageFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"mobile"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ImageFields"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"video"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"desktop"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"VideoFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"mobile"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"VideoFields"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"config"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"alt"}},{"kind":"Field","name":{"kind":"Name","value":"fit"}},{"kind":"Field","name":{"kind":"Name","value":"autoplay"}},{"kind":"Field","name":{"kind":"Name","value":"muted"}},{"kind":"Field","name":{"kind":"Name","value":"loop"}}]}},{"kind":"Field","name":{"kind":"Name","value":"overlay"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"content"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ContentFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"settings"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"OverlaySettingsFields"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"linkRef"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"_naturalKey"}}]}},{"kind":"Field","name":{"kind":"Name","value":"linkUrl"}},{"kind":"Field","name":{"kind":"Name","value":"linkOpenInNewTab"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PassageFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Passage"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"Field","name":{"kind":"Name","value":"_id"}},{"kind":"Field","name":{"kind":"Name","value":"kind"}},{"kind":"Field","name":{"kind":"Name","value":"token"}},{"kind":"Field","name":{"kind":"Name","value":"align"}},{"kind":"Field","name":{"kind":"Name","value":"list"}},{"kind":"Field","name":{"kind":"Name","value":"level"}},{"kind":"Field","name":{"kind":"Name","value":"language"}},{"kind":"Field","name":{"kind":"Name","value":"markDefs"}},{"kind":"Field","name":{"kind":"Name","value":"spans"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"text"}},{"kind":"Field","name":{"kind":"Name","value":"marks"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"CtaFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Cta"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"label"}},{"kind":"Field","name":{"kind":"Name","value":"href"}},{"kind":"Field","name":{"kind":"Name","value":"variant"}},{"kind":"Field","name":{"kind":"Name","value":"openInNewTab"}},{"kind":"Field","name":{"kind":"Name","value":"pageRef"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"_naturalKey"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ImageFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Image"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"alt"}},{"kind":"Field","name":{"kind":"Name","value":"width"}},{"kind":"Field","name":{"kind":"Name","value":"height"}},{"kind":"Field","name":{"kind":"Name","value":"blurhash"}},{"kind":"Field","name":{"kind":"Name","value":"dominantColor"}},{"kind":"Field","name":{"kind":"Name","value":"crop"}},{"kind":"Field","name":{"kind":"Name","value":"variants"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"thumbnail"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"url"}}]}},{"kind":"Field","name":{"kind":"Name","value":"small"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"url"}}]}},{"kind":"Field","name":{"kind":"Name","value":"medium"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"url"}}]}},{"kind":"Field","name":{"kind":"Name","value":"large"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"url"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"VideoFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Video"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"width"}},{"kind":"Field","name":{"kind":"Name","value":"height"}},{"kind":"Field","name":{"kind":"Name","value":"blurhash"}},{"kind":"Field","name":{"kind":"Name","value":"dominantColor"}},{"kind":"Field","name":{"kind":"Name","value":"thumbnailUrl"}},{"kind":"Field","name":{"kind":"Name","value":"previewUrl"}},{"kind":"Field","name":{"kind":"Name","value":"hlsManifestUrl"}},{"kind":"Field","name":{"kind":"Name","value":"duration"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ContentFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Content"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","alias":{"kind":"Name","value":"contentAlign"},"name":{"kind":"Name","value":"align"}},{"kind":"Field","name":{"kind":"Name","value":"ctaLayout"}},{"kind":"Field","name":{"kind":"Name","value":"richtext"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"html"}},{"kind":"Field","name":{"kind":"Name","value":"entries"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"PassageFields"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"ctas"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"CtaFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"OverlaySettingsFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"OverlaySettings"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"position"}},{"kind":"Field","name":{"kind":"Name","value":"theme"}},{"kind":"Field","name":{"kind":"Name","value":"scrimColor"}},{"kind":"Field","name":{"kind":"Name","value":"scrimOpacity"}}]}}]} as unknown as DocumentNode<MediaFieldsFragment, unknown>;
export const GetCookieConsentDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetCookieConsent"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"naturalKey"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"locale"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"preview"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"cookieConsent"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"naturalKey"},"value":{"kind":"Variable","name":{"kind":"Name","value":"naturalKey"}}},{"kind":"Argument","name":{"kind":"Name","value":"locale"},"value":{"kind":"Variable","name":{"kind":"Name","value":"locale"}}},{"kind":"Argument","name":{"kind":"Name","value":"preview"},"value":{"kind":"Variable","name":{"kind":"Name","value":"preview"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"_id"}},{"kind":"Field","name":{"kind":"Name","value":"_naturalKey"}},{"kind":"Field","name":{"kind":"Name","value":"consentTitle"}},{"kind":"Field","name":{"kind":"Name","value":"consentDescription"}},{"kind":"Field","name":{"kind":"Name","value":"acceptAllLabel"}},{"kind":"Field","name":{"kind":"Name","value":"rejectAllLabel"}},{"kind":"Field","name":{"kind":"Name","value":"manageLabel"}},{"kind":"Field","name":{"kind":"Name","value":"preferencesTitle"}},{"kind":"Field","name":{"kind":"Name","value":"saveLabel"}},{"kind":"Field","name":{"kind":"Name","value":"sections"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"categoryKey"}},{"kind":"Field","name":{"kind":"Name","value":"enabled"}},{"kind":"Field","name":{"kind":"Name","value":"readOnly"}}]}}]}}]}}]} as unknown as DocumentNode<GetCookieConsentQuery, GetCookieConsentQueryVariables>;
export const GetMenuDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetMenu"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"naturalKey"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"locale"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"preview"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"menu"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"naturalKey"},"value":{"kind":"Variable","name":{"kind":"Name","value":"naturalKey"}}},{"kind":"Argument","name":{"kind":"Name","value":"locale"},"value":{"kind":"Variable","name":{"kind":"Name","value":"locale"}}},{"kind":"Argument","name":{"kind":"Name","value":"preview"},"value":{"kind":"Variable","name":{"kind":"Name","value":"preview"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"_id"}},{"kind":"Field","name":{"kind":"Name","value":"_naturalKey"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"label"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"openInNewTab"}},{"kind":"Field","name":{"kind":"Name","value":"pageRef"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"_naturalKey"}}]}},{"kind":"Field","name":{"kind":"Name","value":"children"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"label"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"openInNewTab"}},{"kind":"Field","name":{"kind":"Name","value":"pageRef"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"_naturalKey"}}]}}]}}]}}]}}]}}]} as unknown as DocumentNode<GetMenuQuery, GetMenuQueryVariables>;
export const GetPageDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetPage"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"naturalKey"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"locale"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"preview"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"page"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"naturalKey"},"value":{"kind":"Variable","name":{"kind":"Name","value":"naturalKey"}}},{"kind":"Argument","name":{"kind":"Name","value":"locale"},"value":{"kind":"Variable","name":{"kind":"Name","value":"locale"}}},{"kind":"Argument","name":{"kind":"Name","value":"preview"},"value":{"kind":"Variable","name":{"kind":"Name","value":"preview"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"_id"}},{"kind":"Field","name":{"kind":"Name","value":"_naturalKey"}},{"kind":"Field","name":{"kind":"Name","value":"_modelKey"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"blocks"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"entries"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"PassageFields"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Content"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ContentFields"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"EditorialMedia"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"MediaFields"}}]}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"seo"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"metaTitle"}},{"kind":"Field","name":{"kind":"Name","value":"metaDescription"}},{"kind":"Field","name":{"kind":"Name","value":"canonicalUrl"}},{"kind":"Field","name":{"kind":"Name","value":"robots"}},{"kind":"Field","name":{"kind":"Name","value":"ogTitle"}},{"kind":"Field","name":{"kind":"Name","value":"ogDescription"}},{"kind":"Field","name":{"kind":"Name","value":"ogImage"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"width"}},{"kind":"Field","name":{"kind":"Name","value":"height"}},{"kind":"Field","name":{"kind":"Name","value":"alt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"ogType"}},{"kind":"Field","name":{"kind":"Name","value":"twitterCard"}},{"kind":"Field","name":{"kind":"Name","value":"twitterTitle"}},{"kind":"Field","name":{"kind":"Name","value":"twitterDescription"}},{"kind":"Field","name":{"kind":"Name","value":"twitterImage"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"width"}},{"kind":"Field","name":{"kind":"Name","value":"height"}},{"kind":"Field","name":{"kind":"Name","value":"alt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"jsonLd"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PassageFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Passage"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"Field","name":{"kind":"Name","value":"_id"}},{"kind":"Field","name":{"kind":"Name","value":"kind"}},{"kind":"Field","name":{"kind":"Name","value":"token"}},{"kind":"Field","name":{"kind":"Name","value":"align"}},{"kind":"Field","name":{"kind":"Name","value":"list"}},{"kind":"Field","name":{"kind":"Name","value":"level"}},{"kind":"Field","name":{"kind":"Name","value":"language"}},{"kind":"Field","name":{"kind":"Name","value":"markDefs"}},{"kind":"Field","name":{"kind":"Name","value":"spans"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"text"}},{"kind":"Field","name":{"kind":"Name","value":"marks"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"CtaFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Cta"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"label"}},{"kind":"Field","name":{"kind":"Name","value":"href"}},{"kind":"Field","name":{"kind":"Name","value":"variant"}},{"kind":"Field","name":{"kind":"Name","value":"openInNewTab"}},{"kind":"Field","name":{"kind":"Name","value":"pageRef"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"_naturalKey"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ImageFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Image"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"alt"}},{"kind":"Field","name":{"kind":"Name","value":"width"}},{"kind":"Field","name":{"kind":"Name","value":"height"}},{"kind":"Field","name":{"kind":"Name","value":"blurhash"}},{"kind":"Field","name":{"kind":"Name","value":"dominantColor"}},{"kind":"Field","name":{"kind":"Name","value":"crop"}},{"kind":"Field","name":{"kind":"Name","value":"variants"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"thumbnail"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"url"}}]}},{"kind":"Field","name":{"kind":"Name","value":"small"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"url"}}]}},{"kind":"Field","name":{"kind":"Name","value":"medium"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"url"}}]}},{"kind":"Field","name":{"kind":"Name","value":"large"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"url"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"VideoFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Video"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"width"}},{"kind":"Field","name":{"kind":"Name","value":"height"}},{"kind":"Field","name":{"kind":"Name","value":"blurhash"}},{"kind":"Field","name":{"kind":"Name","value":"dominantColor"}},{"kind":"Field","name":{"kind":"Name","value":"thumbnailUrl"}},{"kind":"Field","name":{"kind":"Name","value":"previewUrl"}},{"kind":"Field","name":{"kind":"Name","value":"hlsManifestUrl"}},{"kind":"Field","name":{"kind":"Name","value":"duration"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ContentFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Content"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","alias":{"kind":"Name","value":"contentAlign"},"name":{"kind":"Name","value":"align"}},{"kind":"Field","name":{"kind":"Name","value":"ctaLayout"}},{"kind":"Field","name":{"kind":"Name","value":"richtext"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"html"}},{"kind":"Field","name":{"kind":"Name","value":"entries"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"PassageFields"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"ctas"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"CtaFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"OverlaySettingsFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"OverlaySettings"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"position"}},{"kind":"Field","name":{"kind":"Name","value":"theme"}},{"kind":"Field","name":{"kind":"Name","value":"scrimColor"}},{"kind":"Field","name":{"kind":"Name","value":"scrimOpacity"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"MediaFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"EditorialMedia"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"image"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"desktop"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ImageFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"mobile"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ImageFields"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"video"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"desktop"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"VideoFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"mobile"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"VideoFields"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"config"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"alt"}},{"kind":"Field","name":{"kind":"Name","value":"fit"}},{"kind":"Field","name":{"kind":"Name","value":"autoplay"}},{"kind":"Field","name":{"kind":"Name","value":"muted"}},{"kind":"Field","name":{"kind":"Name","value":"loop"}}]}},{"kind":"Field","name":{"kind":"Name","value":"overlay"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"content"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ContentFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"settings"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"OverlaySettingsFields"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"linkRef"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"_naturalKey"}}]}},{"kind":"Field","name":{"kind":"Name","value":"linkUrl"}},{"kind":"Field","name":{"kind":"Name","value":"linkOpenInNewTab"}}]}}]} as unknown as DocumentNode<GetPageQuery, GetPageQueryVariables>;
export const GetDesignTokensDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetDesignTokens"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"designTokens"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"colors"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"value"}}]}},{"kind":"Field","name":{"kind":"Name","value":"spacings"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"value"}}]}},{"kind":"Field","name":{"kind":"Name","value":"radii"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"value"}}]}}]}}]}}]} as unknown as DocumentNode<GetDesignTokensQuery, GetDesignTokensQueryVariables>;