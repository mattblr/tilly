import { createFoirClient } from '@foir/sdk/data'
import { continueRun } from '@foir/sdk/server'
import { operationApi } from './environment'
import { checkSharingContent, readableCaptureContent, withContentSafety } from './content-safety'
import { canonicalCapture } from './tagged-captures'
import { hideHeldPhoto, type HeldRow, type HideCursor } from './safety-handlers'
import { challengeCursor, evaluateCaptureChallenges } from './challenge-workflow'
import { ChallengeRefusal } from './challenge-contract'
import { analysisJpeg, readAppearancePhoto } from './appearance-photo'
import { readOperationPhoto } from './files'
import { operationCredential } from './credentials'
import * as generated from './generated/foir.op.tilly.check-capture.generated'
import type { DispatchEnvelope, OperationIngress, OperationResponse, QueryClient } from './types'

const ID = /^[a-z0-9]{10,40}$/
type Cursor = { v: 1; phase: 'hide' | 'challenges'; hold?: string; hide?: HideCursor; challenge?: string }
type Request = { _id: string; _ownerId: string; photoKey: string; fileId: string; revision: string }
const done = (body: Record<string, unknown>): OperationResponse => ({ status: 200, body: { ok: true, ...body } })
const resume = (cursor: Cursor) => continueRun({ cursor: JSON.stringify(cursor) })

/** A saved catch's background checks, started by its private check request's
 * record hook and run as that request's owner. First, anything shared is
 * moderated; a flagged photo becomes a hold, and the same bounded walk a
 * reviewer's hide uses takes it and everything built on it private. Then,
 * unless hidden, the photo is checked against the photo challenges. */
export async function checkCapture(envelope: DispatchEnvelope, ingress: OperationIngress): Promise<OperationResponse | Response> {
  const owner = ingress.userId
  const event = (envelope.input ?? {}) as Record<string, unknown>, recordId = event.recordId
  if (envelope.operationKey !== 'tilly.check-capture' || envelope.trigger?.type !== 'lifecycle' || !owner || !ID.test(owner) ||
    envelope.context?.userId !== owner || event.modelKey !== 'capture-check' || typeof recordId !== 'string' || !ID.test(recordId))
    return { status: 403, body: { ok: false, error: 'A native capture check hook is required.' } }
  return runCaptureCheck(withContentSafety(createFoirClient({ apiUrl: operationApi(ingress.apiUrl), dispatch: ingress.dispatch, generated }), ingress),
    envelope, ingress, recordId, owner)
}

/** The check itself, given the dispatch's safety-wrapped data client. */
export async function runCaptureCheck(foir: QueryClient, envelope: DispatchEnvelope, ingress: OperationIngress, recordId: string, owner: string): Promise<OperationResponse | Response> {
  const { request } = await foir.raw<{ request: Request | null }>(
    'query CaptureCheckRequest($id: String) { request: captureCheck(id: $id) { _id _ownerId photoKey fileId revision } }', { id: recordId })
  if (!request || request._id !== recordId || request._ownerId !== owner) return { status: 404, body: { ok: false, error: 'The capture check is unavailable.' } }
  const capture = await canonicalCapture(foir, request.photoKey)
  // A deleted or replaced photo has nothing left to check.
  if (!capture || capture._ownerId !== owner || capture.fileId !== request.fileId || capture.state !== 'ready') return done({ skipped: true })
  const cursor = envelope.continuation?.cursor ? JSON.parse(envelope.continuation.cursor) as Cursor : undefined
  if (cursor && (cursor.v !== 1 || !['hide', 'challenges'].includes(cursor.phase))) throw new Error('Invalid capture check continuation.')

  if (!cursor) {
    // Every catch is moderated: a private profile's catches are still seen by
    // the followers it accepts, now or later.
    const media = await readableCaptureContent(foir, capture._id)
    const approved = await checkSharingContent(foir, { targetType: 'CapturePhoto', targetId: capture._id, text: media.text, fileId: media.fileId })
    console.info('Tilly capture moderation', { approved })
    if (!approved) return resume({ v: 1, phase: 'hide', hold: await holdFor(foir, owner, capture._id, media.fileId) })
    return resume({ v: 1, phase: 'challenges' })
  }

  if (cursor.phase === 'hide') {
    if (!cursor.hold || !ID.test(cursor.hold)) throw new Error('Invalid capture check continuation.')
    const { moderationCase: row } = await foir.raw<{ moderationCase: HeldRow | null }>(
      'query CaptureCheckHold($id: String) { moderationCase(id: $id) { _id _ownerId targetType targetId status fileId text digest } }', { id: cursor.hold })
    if (!row || row._ownerId !== owner || row.targetId !== capture._id || row.status !== 'hidden') throw new Error('The capture hold is unavailable.')
    // As the photographer, only their own records can change (Fóir lets only
    // a record's owner write it); others' reposts lose the photo with its file.
    const walk = await hideHeldPhoto(foir, row, cursor.hide, hide => resume({ ...cursor, hide }), { ownerOnly: true })
    return walk ?? done({ moderation: 'hidden' })
  }

  // Photo challenges, one per slice. No credential means unavailable.
  let apiKey: string | undefined
  try { apiKey = await operationCredential(ingress, 'openai') }
  catch { /* No supported credential means unavailable, never an environment fallback. */ }
  try {
    const result = await evaluateCaptureChallenges(foir, { captureId: capture._id, revision: capture.tagRevision }, owner, envelope.executionId,
      { enabled: true, apiKey, filesOrigin: ingress.filesOrigin, readPhoto: checkPhoto }, challengeCursor(cursor.challenge))
    if (result.nextCursor) return resume({ v: 1, phase: 'challenges', challenge: JSON.stringify(result.nextCursor) })
    return done({ moderation: 'approved', challenges: result.state })
  } catch (error) {
    // A tag edit or rule change since the save ends this check; the edit's own
    // save path decides what happens next.
    if (error instanceof ChallengeRefusal) return done({ challenges: 'skipped' })
    throw error
  }
}

/** Turns the flagged check into a hold, which every publish path respects and
 * which a reviewer can release from the console. */
async function holdFor(foir: QueryClient, owner: string, captureId: string, fileId: string) {
  const { page } = await foir.raw<{ page: { edges: { node: { _id: string; status: string } }[] } }>(
    `query CaptureCheckCase($owner: ID, $id: String, $file: String) { page: moderationCases(first: 1, orderBy: [{createdAt: DESC}],
      where: { ownerId: { eq: $owner }, targetType: { eq: "CapturePhoto" }, targetId: { eq: $id }, fileId: { eq: $file }, status: { in: ["flagged", "error", "hidden"] } }) { edges { node { _id status } } } }`,
    { owner, id: captureId, file: fileId })
  const row = page.edges[0]?.node
  if (!row) throw new Error('The flagged check could not be found.')
  if (row.status !== 'hidden') {
    const held = await foir.raw<{ updateModerationCase: { record: { _id: string } | null } }>(
      'mutation CaptureCheckHide($id: ID, $data: ModerationCaseUpdateInput!) { updateModerationCase(where: { id: { eq: $id }, status: { in: ["flagged", "error"] } }, data: $data) { record { _id } } }',
      { id: row._id, data: { status: { set: 'hidden' }, reviewReason: { set: 'Hidden automatically after a flagged moderation check.' } } })
    if (!held.updateModerationCase?.record?._id) throw new Error('The flagged photo could not be held.')
  }
  return row._id
}

/** The capture's small JPEG once Fóir has made it; until then the private
 * upload itself (at most 2048 px from the app), sanitized. Low-detail analysis
 * costs the same either way, and the provider's input count is still checked. */
async function checkPhoto(foir: QueryClient, captureId: string, fileId: string, filesOrigin?: string) {
  try { return await readAppearancePhoto(foir, captureId, fileId, filesOrigin) } catch { /* not made yet */ }
  const { file } = await foir.raw<{ file: { id: string; url: string | null; mimeType: string | null; deletedAt: string | null } | null }>(
    'query CaptureCheckUpload($id: String!) { file(id: $id) { id url mimeType deletedAt } }', { id: fileId })
  if (!file?.url || file.id !== fileId || file.deletedAt || file.mimeType !== 'image/jpeg') throw new Error('The photo is unavailable.')
  const clean = analysisJpeg(await readOperationPhoto(file.url, filesOrigin))
  if (Math.max(clean.width, clean.height) > 2048) throw new Error('The photo is too large to check.')
  return clean.bytes
}
