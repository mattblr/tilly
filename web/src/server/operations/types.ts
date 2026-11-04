import type {
  FoirClient,
  FoirSchemaDefinition,
  FoirOperationGeneratedModule,
} from '@foir/sdk/data'
import type { OperationPayload, ScopedTokenIngress } from '@foir/sdk/server'

/** The platform checks each operation's declared schema before dispatch. */
export interface CatchInput {
  retry?: boolean
  captureId?: string
  photoFileId?: string
  lat?: number
  lng?: number
  captureKey?: string
  expectedRevision?: string
  revision?: string
  cats?: unknown
}
export interface SocialInput {
  enabled?: boolean
  consentVersion?: string
  displayName?: string
  username?: string
  bio?: string
  photoFileId?: string
  privacy?: string
  removePhoto?: boolean
  photoKey?: string
  liked?: boolean
  following?: boolean
  userId?: string
  catId?: string
  text?: string
  tags?: string[]
  audience?: string
  note?: string
  comment?: string
  reshareOf?: string
  reposted?: boolean
}
export interface ArtInput {
  photoKey?: string
  timeZone?: string
  photoUrl?: string
  width?: number
  height?: number
  prompt?: string
  tierDays?: number
  model?: string
  quality?: string
}
export type OperationInput = CatchInput & SocialInput & ArtInput
export type DispatchEnvelope = OperationPayload<OperationInput>
export type OperationIngress = Pick<
  ScopedTokenIngress,
  'dispatch' | 'userId'
> & { apiUrl?: string; filesOrigin?: string; safety?: {
  enabled: boolean
}; challenges?: {enabled:boolean}; appearance?: {enabled:boolean}; artwork?:{enabled:boolean;notify:boolean}; premium?: {acceptTestPurchases:boolean} }
export type OperationResponse = {
  status: number
  body: Record<string, unknown> & { ok?: boolean }
}
export type QueryClient = Pick<FoirClient<FoirSchemaDefinition>, 'raw'>
export type GeneratedOperation = FoirOperationGeneratedModule
export type Connection<T> = {
  edges: { node: T }[]
  totalCount?: number
  pageInfo?: { hasNextPage: boolean; endCursor: string | null }
}
export type RecordId = { _id: string }
export type CreatedRecord = { record: RecordId }
/** Who sees a user's catches: everyone, or the followers they accept. */
export type Audience = 'public' | 'private'
export type Area = { lat: number; lng: number }
export type CatchPhoto = RecordId & {
  _createdAt: string
  catKey: string
  area?: { lat: number | null; lng: number | null } | null
}
export type PhotoValue = {
  url: string
  width?: number | null
  height?: number | null
}
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export type OperationEnv = Pick<
  WorkerBindings,
  | 'TILLY_CANONICAL_ORIGIN'
  | 'FOIR_PROJECT_ID'
  | 'FOIR_TENANT_ID'
  | 'FOIR_API_ORIGIN'
  | 'FOIR_FILES_ORIGIN'
> & { TILLY_CHALLENGE_NOTIFICATION_TEST_USER_ID?: string; TILLY_CHALLENGE_ANNOUNCEMENTS_ENABLED?: string; TILLY_CHALLENGES_ENABLED?: string; TILLY_NOTIFICATIONS_ENABLED?: string; TILLY_MODERATION_ENABLED?: string;
  TILLY_APPEARANCE_ENABLED?: string; TILLY_ARTWORK_ENABLED?:string;
  TILLY_AI_TEST_USER_ID?: string; TILLY_REVENUECAT_TEST_USER_ID?: string }
export interface PageSelection {
  field: string
  where?: string
  types?: string
  vars?: Record<string, unknown>
  node: string
}
