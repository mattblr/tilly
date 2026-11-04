import { createFoirClient } from '@foir/sdk/data'
import { continueRun } from '@foir/sdk/server'
import { operationApi } from './environment'
import { save_profile, serveProfilePhoto, share_capture, showPost } from './social'
import { chosenPrivacy, audienceFor, privacyOf, setAudiencePrivacy, setFollowerAccess, showCatch, type Privacy } from './audience'
import { withContentSafety } from './content-safety'
import * as profileModule from './generated/foir.op.tilly.save-profile.generated'
import * as repairModule from './generated/foir.op.tilly.post-my-catches.generated'
import * as shareModule from './generated/foir.op.tilly.share-capture.generated'
import type { Connection, DispatchEnvelope, OperationIngress, OperationResponse, QueryClient, SocialInput, GeneratedOperation } from './types'

/**
 * A profile's Public or Private switch, and the repair run, as one bounded
 * walk over the user's catches, one per dispatch.
 *
 * Catch records are read through the user's audience record (audience.ts),
 * so switching takes effect for them at once: the audience record goes public
 * or private before the walk starts. The walk then brings each catch's files
 * in line, and going private first grants the current followers, who keep
 * seeing the user's catches. The repair run (`records`) also points every
 * catch's records, and the user's reposts, at the audience.
 */
type Kind = 'save_profile' | 'post_my_catches' | 'share_capture'
type Phase = 'followers' | 'captures' | 'reposts'
type Cursor = { v: 2; owner: string; resultId: string; privacy: Privacy; records: boolean; phase: Phase; after?: string }
const phases: Phase[] = ['followers', 'captures', 'reposts']
const goodId = (id: unknown): id is string => typeof id === 'string' && /^[a-z0-9]{10,40}$/.test(id)
const next = (cursor: Cursor) => continueRun({ cursor: JSON.stringify(cursor) })
const lists: Record<Phase, [field: string, node: string, where: string, types: string]> = {
  followers: ['followApprovals', '_id _ownerId followerId status', '{ownerId: {eq: $me}, status: {eq: "accepted"}}', '$me: ID'],
  captures: ['capturePhotos', '_id _ownerId state fileId', '{ownerId: {eq: $me}, state: {eq: "ready"}}', '$me: ID'],
  reposts: ['capturePosts', '_id _ownerId', '{ownerId: {eq: $me}, reshareOf: {isNull: false}}', '$me: ID'],
}
type Row = { _id: string; _ownerId: string | null; fileId?: string; status?: string | null; followerId?: string | null }

async function page(foir: QueryClient, phase: Phase, owner: string, after?: string) {
  const [field, node, where, types] = lists[phase]
  const data = await foir.raw<{ page: Connection<Row> }>(
    `query PublicationPage($after: String, ${types}) { page: ${field}(first: 1, after: $after, orderBy: [{createdAt: ASC}, {id: ASC}], where: ${where}) { edges { node { ${node} } } totalCount pageInfo { hasNextPage endCursor } } }`,
    { me: owner, after })
  const info = data.page.pageInfo
  // Counts contain no identities or record payload. They let an operator tell
  // an empty scan from a completed walk without logging private data.
  console.info('Tilly publication scan', { field, returned: data.page.edges.length, total: data.page.totalCount ?? null, more: info?.hasNextPage ?? null })
  if (!after && data.page.edges.length === 0 && (data.page.totalCount ?? 0) > 0)
    throw new Error('The publication list is incomplete. Retry these settings.')
  if (!info || (info.hasNextPage && (!info.endCursor || info.endCursor === after))) throw new Error('The publication list did not advance.')
  return { row: data.page.edges[0]?.node, after: info.hasNextPage ? info.endCursor! : undefined }
}
async function fileVisibility(foir: QueryClient, id: string, visibility: 'PRIVATE' | 'PUBLIC') {
  if (!goodId(id)) throw new Error('The photo has no valid backing file.')
  const result = await foir.raw<{ setFileVisibility: string }>('mutation PublicationFile($id: ID!, $visibility: Visibility!) { setFileVisibility(id: $id, visibility: $visibility) }', { id, visibility })
  if (result.setFileVisibility !== visibility) throw new Error('The photo audience was not saved.')
}
function decode(value: string, owner: string): Cursor {
  const c = JSON.parse(value) as Cursor
  if (c.v !== 2 || c.owner !== owner || !goodId(c.resultId) || !['public', 'private'].includes(c.privacy) ||
    typeof c.records !== 'boolean' || !order(c).includes(c.phase) || (c.after !== undefined && typeof c.after !== 'string'))
    throw new Error('Invalid publication continuation.')
  return c
}
/** Going private keeps current followers (a public profile needs no grants);
 * only the repair run revisits reposts. */
const order = (c: Pick<Cursor, 'privacy' | 'records'>) =>
  phases.filter(phase => (phase !== 'followers' || c.privacy === 'private') && (phase !== 'reposts' || c.records))

/** The cursor arrives only in verified Fóir dispatch. Every slice re-reads the
 * owner's setting; IDs never confer authority. */
export async function publicationSlice(kind: Kind, input: SocialInput,
  envelope: DispatchEnvelope, ingress: OperationIngress): Promise<OperationResponse | Response> {
  const owner = ingress.userId
  if (!owner || !envelope.callback) return { status: 403, body: { ok: false, error: 'A signed-in asynchronous dispatch is required.' } }
  if (kind === 'share_capture') return share_capture(input, envelope, ingress)
  const foir = withContentSafety(createFoirClient({ apiUrl: operationApi(ingress.apiUrl), dispatch: ingress.dispatch,
    generated: (kind === 'save_profile' ? profileModule : repairModule) as GeneratedOperation }), ingress)
  if (envelope.continuation?.cursor) return resumePublication(kind, foir, decode(envelope.continuation.cursor, owner))
  if (kind === 'save_profile') {
    const saved = await save_profile(input, envelope, ingress)
    if (saved.body.ok !== true) return saved
    // Every profile has its audience record from the start: following a
    // public user approves through it.
    const privacy = input.privacy == null ? await chosenPrivacy(foir, owner) : privacyOf(String(input.privacy))
    const audience = await audienceFor(foir, owner, privacy)
    if (audience.privacy === privacy && !audience.created) return saved
    // Catch records follow the audience record at once; files follow in the walk.
    if (audience.privacy !== privacy) await setAudiencePrivacy(foir, audience.id, privacy)
    return next({ v: 2, owner, resultId: String(saved.body.id), privacy, records: audience.created, phase: order({ privacy, records: audience.created })[0] })
  }
  const answer = await foir.raw<{ profiles: { edges: { node: { _id: string; photo: { url: string | null } | null } }[] } }>(
    'query RepairProfile($me: ID) { profiles(first: 1, where: {ownerId: {eq: $me}}) { edges { node { _id photo { url } } } } }', { me: owner })
  const profile = answer.profiles.edges[0]?.node
  if (!profile) throw new Error('Set up your profile first.')
  await serveProfilePhoto(foir, { url: profile.photo?.url, profileId: profile._id })
  const privacy = await chosenPrivacy(foir, owner)
  const audience = await audienceFor(foir, owner, privacy)
  if (audience.privacy !== privacy) await setAudiencePrivacy(foir, audience.id, privacy)
  return next({ v: 2, owner, resultId: profile._id, privacy, records: true, phase: order({ privacy, records: true })[0] })
}

export async function resumePublication(kind: Kind, foir: QueryClient, c: Cursor): Promise<OperationResponse | Response> {
  const owner = c.owner
  // A newer switch owns the walk from here: stop rather than undo it.
  const audience = await audienceFor(foir, owner, c.privacy)
  if (await chosenPrivacy(foir, owner) !== c.privacy || audience.privacy !== c.privacy) throw new Error('The audience changed. Retry the latest settings.')
  const { row, after } = await page(foir, c.phase, owner, c.after)
  if (row) {
    if (row._ownerId !== owner) throw new Error('The publication record has another owner.')
    if (c.phase === 'followers' && row.followerId && row.status === 'accepted')
      await setFollowerAccess(foir, audience.id, row.followerId, true)
    if (c.phase === 'captures' && row.fileId) await showCatch(foir, audience, { _id: row._id, _ownerId: owner, fileId: row.fileId }, { records: c.records })
    if (c.phase === 'reposts' && c.records) await showPost(foir, owner, row._id)
  }
  if (after) return next({ ...c, after })
  const phase = order(c)[order(c).indexOf(c.phase) + 1]
  if (phase) return next({ ...c, phase, after: undefined })
  return { status: 200, body: { ok: true, id: c.resultId } }
}
