import { createFoirClient } from '@foir/sdk/data'
import { continueRun } from '@foir/sdk/server'
import { captureDigest, taggedCaptureInput, CaptureRefusal } from './capture-contract'
import { createOwned } from './social'
import { publicationHeld, withContentSafety } from './content-safety'
import { chosenPrivacy, audienceFor, viewers, type Privacy } from './audience'
import { beginTaggedCapture, canonicalCapture, captureTags, captureResult, originalPost, prepareCaptureTag, type CanonicalCapture, type StoredCatTag } from './tagged-captures'
import { operationApi } from './environment'
import * as generated from './generated/foir.op.tilly.save-catch.generated'
import type { Audience, CatchInput, DispatchEnvelope, OperationIngress, OperationResponse, QueryClient } from './types'

/** A save prepares each cat's tag, then publishes the catch in one pass.
 * Fóir gap (docs/known-gaps.md, "Multi-record writes"): an operation can't
 * change several records atomically. Here: every write is repeatable (an
 * idempotency key or a conditional where) and a retried run completes the
 * rest. Closes with atomic multi-record writes. */
type Cursor = { v: 1; capture: string; phase: 'tag' | 'publish'; index: number }
type Stage = OperationResponse | { next: Cursor }
const ID = /^[a-z0-9]{10,40}$/
const next = (cursor: Cursor): Stage => ({ next: cursor })
/** Fóir requests one dispatch may make. Stages run back to back while the next
 * one's worst case still fits; the rest continues in a platform slice. */
const requestBudget = 30
const stageCost = (cursor: Cursor, cats: number) => cursor.phase === 'tag' ? 14 : cats + 16
/** The native run owns all slices. No upload bytes, credentials, provider
 * verdict or caller-selected owner crosses a continuation boundary. */
export async function captureSaveStep(foir: QueryClient, raw: Record<string, unknown>, owner: string | null, cursor?: string,
  spent: () => number = () => requestBudget, runId = ''): Promise<OperationResponse | Response> {
  const cats = taggedCaptureInput(raw).cats.length
  for (let at = cursor; ;) {
    const out = await captureSaveStage(foir, raw, owner, at, runId)
    if (!('next' in out)) return out
    if (spent() + stageCost(out.next, cats) > requestBudget) return continueRun({ cursor: JSON.stringify(out.next) })
    at = JSON.stringify(out.next)
  }
}
async function captureSaveStage(foir: QueryClient, raw: Record<string, unknown>, owner: string | null, cursor: string | undefined, runId: string): Promise<Stage> {
  if (!owner || !ID.test(owner)) throw new CaptureRefusal(403, 'Sign in to save your photo.')
  const input = taggedCaptureInput(raw)
  let c: Cursor
  if (!cursor) {
    const { capture } = await beginTaggedCapture(foir, raw, owner)
    c = { v: 1, capture: capture._id, phase: 'tag', index: 0 }
  } else {
    c = JSON.parse(cursor) as Cursor
    if (c.v !== 1 || !ID.test(c.capture) || !['tag', 'publish'].includes(c.phase) ||
      !Number.isInteger(c.index) || c.index < 0 || c.index > 10) throw new Error('Invalid photo save continuation.')
  }
  const capture = await canonicalCapture(foir, c.capture)
  if (!capture || capture._ownerId !== owner || capture.fileId !== input.photoFileId ||
    capture.clientKey !== `${owner}~${input.captureKey}` || capture.payloadHash !== await captureDigest(input))
    throw new CaptureRefusal(409, 'This save belongs to another photo or selection.')
  if (capture.tagRevision !== input.captureKey) throw new CaptureRefusal(409, 'The cats changed. Reload this capture.')
  if (capture.state === 'ready') {
    const tags = await captureTags(foir, capture._id, capture.tagRevision)
    if (tags.length !== input.cats.length) throw new Error('The saved cats are incomplete.')
    // A retry after the request write failed must still start the checks.
    await requestChecks(foir, capture, capture.audience, runId)
    return { status: 200, body: { ok: true, ...captureResult(capture, tags, await originalPost(foir, capture, tags[0].catKey)) } }
  }
  if (capture.state !== 'saving') throw new CaptureRefusal(409, 'Finish the active capture change first.')
  if (c.phase === 'tag') {
    if (c.index >= input.cats.length) return next({ ...c, phase: 'publish', index: 0 })
    await prepareCaptureTag(foir, capture, input.cats[c.index], c.index)
    return next({ ...c, index: c.index + 1 })
  }
  const tags = await captureTags(foir, capture._id, capture.tagRevision)
  if (tags.length !== input.cats.length || tags.some((tag, index) => tag.key !== input.cats[index].key || tag.positionIndex !== index))
    throw new Error('The photo’s saved cat selection changed.')
  const post = await originalPost(foir, capture, tags[0].catKey)
  return await publishNow(foir, capture, tags, post, await chosenPrivacy(foir, owner), owner, runId)
}
/** Starts the background checks for a saved catch: moderation of anything
 * shared, then photo challenges. The private request's record hook runs
 * `tilly.check-capture` as its owner; one request per capture revision. */
async function requestChecks(foir: QueryClient, capture: CanonicalCapture, audience: Audience, runId: string) {
  await createOwned(foir, 'CaptureCheck', { photoKey: capture._id, fileId: capture.fileId, revision: capture.tagRevision,
    audience, sourceExecutionId: runId || 'replay' }, capture._ownerId, `capture-check-${capture._id}-${capture.tagRevision}`)
}

/** A catch publishes in one pass. Its records stay private and are read through
 * `viewers`, the owner's audience: public, or their accepted followers. The
 * file's bytes are public only for a public profile. Moderation follows in the
 * background and hides the catch if its photo is flagged. A hold, or a switch
 * to private while this ran, leaves the catch to its owner. */
async function publishNow(foir: QueryClient, capture: CanonicalCapture, tags: StoredCatTag[], post: string,
  privacy: Privacy, owner: string, runId: string): Promise<OperationResponse> {
  const audience = await audienceFor(foir, owner, privacy)
  const file = async (value: 'PUBLIC' | 'PRIVATE') => {
    const result = await foir.raw<{ setFileVisibility: string }>(
      'mutation SaveFileVisibility($id: ID!, $visibility: Visibility!) { setFileVisibility(id: $id, visibility: $visibility) }', { id: capture.fileId, visibility: value })
    if (result.setFileVisibility !== value) throw new Error('The photo audience was not saved.')
  }
  try {
    await file(privacy === 'public' ? 'PUBLIC' : 'PRIVATE')
    let shownTo: string | null = audience.id, final: Privacy = privacy
    if (privacy === 'public' && await publicationHeld(foir, 'CapturePhoto', capture._id, capture.fileId)) {
      await file('PRIVATE'); shownTo = null; final = 'private'
    }
    if (await chosenPrivacy(foir, owner) !== privacy) throw new Error('The audience changed. Retry the latest settings.')
    // One write per record: each tag goes live already pointing at its audience.
    for (const tag of tags) await foir.raw('mutation SaveActiveTag($id: ID, $data: CaptureCatTagUpdateInput!) { updateCaptureCatTag(where: {id: {eq: $id}}, data: $data) { record { _id } } }',
      { id: tag._id, data: { active: { set: true }, viewers: viewers(shownTo) } })
    await foir.raw('mutation SavePostAudience($id: ID, $data: CapturePostUpdateInput!) { updateCapturePost(where: {id: {eq: $id}}, data: $data) { record { _id } } }',
      { id: post, data: { audience: { set: final }, viewers: viewers(shownTo) } })
    const result = await foir.raw<{ updateCapturePhoto: { record: { _id: string } | null } }>(
      'mutation SaveReadyCapture($id: ID, $revision: String, $hash: String, $data: CapturePhotoUpdateInput!) { updateCapturePhoto(where: {id: {eq: $id}, state: {eq: "saving"}, tagRevision: {eq: $revision}, payloadHash: {eq: $hash}}, data: $data) { record { _id } } }',
      { id: capture._id, revision: capture.tagRevision, hash: capture.payloadHash,
        data: { cat: { connect: { id: tags[0].catKey } }, catKey: { set: tags[0].catKey }, state: { set: 'ready' }, audience: { set: final }, viewers: viewers(shownTo) } })
    if (!result.updateCapturePhoto.record) throw new Error('The capture changed before saving finished.')
    await requestChecks(foir, capture, final, runId)
    return { status: 200, body: { ok: true, ...captureResult({ ...capture, state: 'ready', audience: final }, tags, post) } }
  } catch (error) {
    await file('PRIVATE')
    throw error
  }
}

export async function saveCatchSlice(input: CatchInput, envelope: DispatchEnvelope, ingress: OperationIngress) {
  const base = createFoirClient({ apiUrl: operationApi(ingress.apiUrl), dispatch: ingress.dispatch, generated })
  // Counts this dispatch's Fóir requests, so stages share one slice while they fit.
  let requests = 0
  const counted = { raw: ((...args: Parameters<typeof base.raw>) => { requests++; return base.raw(...args) }) as typeof base.raw }
  const foir = withContentSafety(counted, ingress)
  const started = Date.now()
  try { return await captureSaveStep(foir, { ...input }, ingress.userId ?? null, envelope.continuation?.cursor, () => requests, envelope.executionId) }
  // One line per slice, naming only its phase: how long a save spends in
  // each slice, and (from the log times) waiting between them.
  finally { console.info('Tilly save slice', { step: sliceName(envelope.continuation?.cursor), requests, ms: Date.now() - started }) }
}
function sliceName(cursor?: string) {
  if (!cursor) return 'begin'
  try {
    const c = JSON.parse(cursor) as Partial<Cursor>
    return `${c.phase}:${c.index}`
  } catch { return 'unknown' }
}
