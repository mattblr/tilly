import { captureCatTags, type CaptureCatTag } from '../../lib/capture-tags'

export class CaptureRefusal extends Error {
  constructor(public status: number, message: string) { super(message) }
}
const ID = /^[a-z0-9]{10,40}$/
const KEY = /^[a-zA-Z0-9-]{1,80}$/
export interface TaggedCaptureInput {
  photoFileId: string
  captureKey: string
  cats: CaptureCatTag[]
  lat: number
  lng: number
}
export function captureKey(value: unknown): string {
  if (typeof value !== 'string' || !KEY.test(value))
    throw new CaptureRefusal(400, 'The capture attempt needs a stable key.')
  return value
}
export function captureId(value: unknown): string {
  if (typeof value !== 'string' || !ID.test(value))
    throw new CaptureRefusal(400, 'The capture id is invalid.')
  return value
}
export function taggedCaptureInput(value: Record<string, unknown>): TaggedCaptureInput {
  const photoFileId = captureId(value.photoFileId), key = captureKey(value.captureKey)
  if (typeof value.lat !== 'number' || !Number.isFinite(value.lat) || Math.abs(value.lat) > 90 ||
      typeof value.lng !== 'number' || !Number.isFinite(value.lng) || Math.abs(value.lng) > 180)
    throw new CaptureRefusal(400, 'A valid capture location is required.')
  let cats: CaptureCatTag[]
  try { cats = captureCatTags(value.cats) }
  catch (error) { throw new CaptureRefusal(400, error instanceof Error ? error.message : 'Choose the cats in this photo.') }
  return { photoFileId, captureKey: key, cats, lat: value.lat, lng: value.lng }
}

/** A revision token is compared with saved state, never treated as authority. */
export function requireCaptureEditor(
  actor: string | null | undefined,
  capture: { ownerId: string; revision: string } | null,
  expectedRevision: string,
  nextRevision: string,
) {
  if (!actor || !capture || actor !== capture.ownerId)
    throw new CaptureRefusal(403, 'Only the person who took this photo can edit its cats.')
  captureKey(expectedRevision)
  captureKey(nextRevision)
  // A replay of the same edit may finish its interrupted visibility work.
  if (capture.revision !== expectedRevision && capture.revision !== nextRevision)
    throw new CaptureRefusal(409, 'The cats changed in another window. Reload before editing.')
  if (expectedRevision === nextRevision)
    throw new CaptureRefusal(400, 'A new tag edit needs its own revision.')
}

export async function captureDigest(input: TaggedCaptureInput): Promise<string> {
  // Only the validated, explicitly ordered fields participate. Caller-supplied
  // owner/audience fields cannot change identity or widen access.
  const bytes = new TextEncoder().encode(JSON.stringify(input))
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), b => b.toString(16).padStart(2, '0')).join('')
}

/** Binds an edit revision to its cat selection, so a replay can't change it. */
export async function captureEditDigest(cats: CaptureCatTag[]): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(cats)))
  return Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, '0')).join('')
}
