import { captureRequestEvent, FinalizationRefusal } from './capture-finalization-contract'
import type {OperationPayload} from '@foir/sdk/server'
import { appearanceConsentVersion } from './appearance-contract'
import { requireAppearanceAccess } from './appearance-policy'
import { canonicalCapture } from './tagged-captures'
import { all, createOwned } from './social'
import { publicationHeld } from './content-safety'
import type { QueryClient } from './types'

const ID = /^[a-z0-9]{10,40}$/
export function finalizationRequest(raw: Record<string, unknown>) {
  if (Object.keys(raw).some(key => !['captureId', 'timeZone'].includes(key)) ||
    typeof raw.captureId !== 'string' || !ID.test(raw.captureId) || typeof raw.timeZone !== 'string' || raw.timeZone.length > 100)
    throw new FinalizationRefusal('Choose a saved capture to finish.')
  try { new Intl.DateTimeFormat('en', { timeZone: raw.timeZone }).format() }
  catch { throw new FinalizationRefusal('Choose a valid time zone.') }
  return { captureId: raw.captureId, timeZone: raw.timeZone }
}
export interface FinalizationReceipt {
  _id: string; _ownerId: string; photoKey: string; fileId: string; revision: string; phase: string;
  runId: string | null; timeZone: string; finalizedAt:string|null; appearanceRequested: boolean; artworkRequested: boolean
}
export async function finalizationReceipt(foir: QueryClient, owner: string, photo: string) {
  const rows = await all<FinalizationReceipt>(foir, { field: 'captureFinalizations',
    where: '{ownerId: {eq: $owner}, photoKey: {eq: $photo}}', types: '$owner: ID, $photo: String', vars: { owner, photo },
    node: '_id _ownerId photoKey fileId revision phase runId timeZone finalizedAt appearanceRequested artworkRequested' })
  if (rows.length > 1 || rows.some(row => row._ownerId !== owner)) throw new FinalizationRefusal('This capture’s finalization is unavailable.')
  return rows[0]
}
/** Fóir gap (docs/known-gaps.md, "Operation-terminal subject"): an
 * operation-completed hook arrives without the user who started the run. Here:
 * admission reads the user's own finalized request record and checks its
 * receipt, never identity from event input. Closes when those hooks carry the
 * user's signed identity. */
export async function finalizedRequest(foir:QueryClient,envelope:OperationPayload,owner:string|null,purpose:'appearance'|'artwork') {
  const id=captureRequestEvent(envelope,owner,purpose),field=purpose==='appearance'?'appearanceRequest':'artworkRequest'
  const answer=await foir.raw<{request:{_id:string;_ownerId:string;photoKey:string;fileId:string;revision:string;finalizationId:string;sourceExecutionId:string;timeZone:string}|null}>(
    `query FinalizedRequest($id: String) { request: ${field}(id: $id) { _id _ownerId photoKey fileId revision finalizationId sourceExecutionId timeZone } }`,{id})
  const request=answer.request
  if(!request||request._id!==id||request._ownerId!==owner) throw new FinalizationRefusal('The private finalized request is unavailable.')
  const receipt=await finalizationReceipt(foir,owner!,request.photoKey)
  if(!receipt||receipt._id!==request.finalizationId||receipt.phase!=='finalized'||receipt.runId!==request.sourceExecutionId||
    receipt.fileId!==request.fileId||receipt.revision!==request.revision||receipt.timeZone!==request.timeZone||
    !(purpose==='appearance'?receipt.appearanceRequested:receipt.artworkRequested))
    throw new FinalizationRefusal('The private request does not match its finalization.')
  return{captureId:request.photoKey,revision:request.revision,timeZone:request.timeZone,sourceExecutionId:request.sourceExecutionId}
}
/** Called only after scoped-token verification. The winning execution owns the
 * idempotent intent; a new client retry repairs the same private requests.
 * Private run/consent metadata lives in its own owned receipt, never on the
 * public canonical capture or in a browser token store. */
export async function finalizeCapture(foir: QueryClient, raw: Record<string, unknown>, owner: string | null, executionId: string) {
  if (!owner || !ID.test(owner) || !ID.test(executionId)) throw new FinalizationRefusal('Sign in to finish your capture.')
  const input = finalizationRequest(raw), capture = await canonicalCapture(foir, input.captureId)
  if (!capture || capture._ownerId !== owner || capture.state !== 'ready') throw new FinalizationRefusal('Only your completed capture can be finalized.')
  let receipt = await finalizationReceipt(foir, owner, capture._id)
  if (!receipt) {
    const id = await createOwned(foir, 'CaptureFinalization', { photoKey: capture._id, fileId: capture.fileId,
      revision: capture.tagRevision, phase: 'reserved', timeZone: input.timeZone, appearanceRequested: false, artworkRequested: false },
    owner, `finalize-${capture._id}`)
    receipt = await finalizationReceipt(foir, owner, capture._id)
    if (!receipt || receipt._id !== id) throw new FinalizationRefusal('The capture finalization could not be saved.')
  }
  if (receipt.fileId !== capture.fileId || receipt.revision !== capture.tagRevision)
    throw new FinalizationRefusal('This capture changed after its finalization.')
  if (receipt.phase === 'reserved') {
    const settings = (await foir.raw<{appSettings: {appearanceEligibility: string | null} | null}>(
      'query FinalizationSettings { appSettings(naturalKey: "app") { appearanceEligibility } }')).appSettings
    const preferences = await all<{enabled: boolean; consentVersion: string | null}>(foir, {
      field: 'appearanceAccounts', where: '{ownerId: {eq: $owner}}', types: '$owner: ID', vars: {owner}, node: 'enabled consentVersion',
    })
    const grants = await all<{_ownerId: string | null; until: string | null}>(foir, {
      field: 'premiumGrants', where: '{ownerId: {eq: $owner}}', types: '$owner: ID', vars: {owner}, node: '_ownerId until',
    })
    const held = await publicationHeld(foir, 'CapturePhoto', capture._id, capture.fileId)
    let appearanceRequested = false
    if (!held && preferences.length === 1 && preferences[0].enabled && preferences[0].consentVersion === appearanceConsentVersion) {
      try { requireAppearanceAccess(owner, settings?.appearanceEligibility ?? null, grants, new Date()); appearanceRequested = true }
      catch { /* Ineligible/invalid configuration emits no metered request. */ }
    }
    const artworkRequested = !held && grants.some(grant => grant._ownerId === owner && grant.until && Date.parse(grant.until) > Date.now())
    await foir.raw('mutation FinalizeCaptureOnce($id: ID, $data: CaptureFinalizationUpdateInput!) { updateCaptureFinalization(where: {id: {eq: $id}, phase: {eq: "reserved"}}, data: $data) { record { _id } } }',
      {id: receipt._id, data: {phase: {set: 'finalized'}, runId: {set: executionId}, finalizedAt: {set: new Date().toISOString()},
        appearanceRequested: {set: appearanceRequested}, artworkRequested: {set: artworkRequested}}})
    receipt = await finalizationReceipt(foir, owner, capture._id)
  }
  if (!receipt || receipt.phase !== 'finalized') throw new FinalizationRefusal('The capture finalization is pending.')
  // The private record is the metered intent. RECORD_CREATED carries its owner
  // in signed dispatch; OPERATION_COMPLETED currently does not. Native subject
  // propagation is the intended replacement and is still in progress. Retrying this
  // boundary repairs a lost create response without producing another event.
  const request={photoKey:receipt.photoKey,fileId:receipt.fileId,revision:receipt.revision,finalizationId:receipt._id,
    sourceExecutionId:receipt.runId,timeZone:receipt.timeZone}
  if(receipt.appearanceRequested) await createOwned(foir,'AppearanceRequest',request,owner,`appearance-request-${receipt._id}`)
  if(receipt.artworkRequested) await createOwned(foir,'ArtworkRequest',request,owner,`artwork-request-${receipt._id}`)
  const ownsEvent = receipt.runId === executionId
  return {ok: true, captureId: capture._id, revision: receipt.revision, timeZone: receipt.timeZone,
    appearanceRequested: ownsEvent && receipt.appearanceRequested, artworkRequested: ownsEvent && receipt.artworkRequested}
}
