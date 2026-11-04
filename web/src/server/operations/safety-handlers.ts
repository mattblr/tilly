import { createFoirClient } from '@foir/sdk/data'
import { continueRun } from '@foir/sdk/server'
import { operationApi } from './environment'
import { all, createOwned, endFollows } from './social'
import { backingFileId, readableCaptureContent } from './content-safety'
import { readOperationPhoto } from './files'
import { safetyDigest, type SafetyTarget } from './safety-policy'
import { invalidateChallengeCapture, restoreChallengeCapture } from './challenge-workflow'
import { hideRecord } from './audience'
import * as blockModule from './generated/foir.op.set_user_block.generated'
import * as reportModule from './generated/foir.op.report_content.generated'
import * as reviewModule from './generated/foir.op.review_content.generated'
import type { DispatchEnvelope, OperationIngress, OperationResponse, QueryClient, GeneratedOperation } from './types'

const valid = (value: unknown): value is string => typeof value === 'string' && /^[a-z0-9]{10,40}$/.test(value)
const ok = (body: Record<string, unknown> = {}): OperationResponse => ({ status: 200, body: { ok: true, ...body } })
const no = (status: number, error: string): OperationResponse => ({ status, body: { ok: false, error } })
const client = (ingress: OperationIngress, generated: GeneratedOperation) =>
  createFoirClient({ apiUrl: operationApi(ingress.apiUrl), dispatch: ingress.dispatch, generated })
type Target = { _id: string; _ownerId: string | null; photoKey?: string | null; photo?: { url: string | null } | null; fileId?: string | null }
const targets = { post: ['CapturePost', 'capturePost'], note: ['FieldNote', 'fieldNote'], profile: ['Profile', 'profile'] } as const
export async function reportTarget(foir: QueryClient, type: string, id: string): Promise<{ model: string; row: Target } | null> {
  const mapping = targets[type as keyof typeof targets]
  if (!mapping) return null
  const [model, field] = mapping
  const extra = type === 'profile' ? 'photo { url }' : 'photoKey'
  const answer = await foir.raw<Record<string, Target | null>>(`query ReportTarget($id: String) { ${field}(id: $id) { _id _ownerId ${extra} } }`, { id })
  if (!answer[field] && type === 'profile') {
    const fallback = await foir.raw<{ profiles: { edges: { node: Target }[] } }>(
      'query ReportProfileOwner($id: ID) { profiles(first: 1, where: { ownerId: { eq: $id } }) { edges { node { _id _ownerId photo { url } } } } }', { id })
    return fallback.profiles.edges[0] ? { model, row: fallback.profiles.edges[0].node } : null
  }
  return answer[field] ? { model, row: answer[field] } : null
}
export async function setUserBlock(input: Record<string, unknown>, envelope: DispatchEnvelope, ingress: OperationIngress) {
  const actor = ingress.userId
  if (!actor) return no(403, 'Sign in to block an account.')
  if (!valid(input.userId) || typeof input.blocked !== 'boolean' || input.userId === actor) return no(400, 'Choose another account.')
  const foir = client(ingress, blockModule)
  const existing = await all<{ _id: string; _ownerId: string }>(foir, { field: 'userBlocks', where: '{ ownerId: { eq: $me }, blockedUserId: { eq: $them } }',
    vars: { me: actor, them: input.userId }, types: '$me: ID, $them: String', node: '_id _ownerId' })
  if (!input.blocked) {
    for (const row of existing) if (row._ownerId === actor) await foir.raw('mutation Unblock($id: String!) { deleteUserBlock(id: $id) }', { id: row._id })
    return ok({ active: false })
  }
  const profiles = await foir.raw<{ profiles: { totalCount: number } }>('query BlockProfile($id: ID) { profiles(first: 1, where: { ownerId: { eq: $id } }) { totalCount } }', { id: input.userId })
  if (!profiles.profiles.totalCount) return no(404, 'That account is unavailable.')
  if (!existing.length) await createOwned(foir, 'UserBlock', { blockedUserId: input.userId }, actor, `${envelope.executionId}-block`)
  await endFollows(foir, actor, input.userId)
  return ok({ active: true })
}
export async function reportContent(input: Record<string, unknown>, envelope: DispatchEnvelope, ingress: OperationIngress) {
  if (!ingress.userId) return no(403, 'Sign in to report content.')
  if (!valid(input.targetId) || !Object.hasOwn(targets, String(input.targetType)) || !['unsafe', 'harassment', 'spam', 'privacy', 'other'].includes(String(input.reason)) ||
      (input.details !== undefined && (typeof input.details !== 'string' || input.details.length > 1000))) return no(400, 'Choose the content and a reason.')
  const foir = client(ingress, reportModule), target = await reportTarget(foir, String(input.targetType), input.targetId)
  if (!target) return no(404, 'That content is unavailable.')
  if (target.row._ownerId === ingress.userId) return no(400, 'You can edit your own content.')
  const id = await createOwned(foir, 'ContentReport', { targetType: input.targetType, targetId: target.row._id,
    targetOwnerId: target.row._ownerId, reason: input.reason, details: typeof input.details === 'string' ? input.details.trim() : '', status: 'open' },
  ingress.userId, `${envelope.executionId}-report`)
  return ok({ id })
}
type QueueRow = { _id: string; _ownerId: string; targetType: string; targetId: string; targetOwnerId?: string | null; fileId?: string | null; text?: string | null; digest?: string; status: string }
async function queueRow(foir: QueryClient, queue: string, id: string) {
  const field = queue === 'report' ? 'contentReport' : 'moderationCase'
  return (await foir.raw<Record<string, QueueRow | null>>(`query ReviewItem($id: String) { ${field}(id: $id) { _id _ownerId targetType targetId status ${queue === 'check' ? 'fileId text digest' : 'targetOwnerId'} } }`, { id }))[field]
}
async function set(foir: QueryClient, model: string, id: string, values: Record<string, unknown>) {
  const result = await foir.raw<{ changed: { record: { _id: string } | null } }>(
    `mutation ReviewState($id: ID, $data: ${model}UpdateInput!) { changed: update${model}(where: { id: { eq: $id } }, data: $data) { record { _id } } }`,
    { id, data: Object.fromEntries(Object.entries(values).map(([key, value]) => [key, { set: value }])) })
  if (result.changed?.record?._id !== id) throw new Error('The review decision was not saved.')
}
async function narrowFile(foir: QueryClient, fileId?: string | null) {
  if (fileId) {
    const result = await foir.raw<{ setFileVisibility: string }>('mutation HideReviewedFile($id: ID!) { setFileVisibility(id: $id, visibility: PRIVATE) }', { id: fileId })
    if (result.setFileVisibility !== 'PRIVATE') throw new Error('The reviewed photo could not be hidden.')
  }
}
async function resolveCheckTarget(foir: QueryClient, row: QueueRow): Promise<{ model: string; target: Target } | null> {
  const map: Record<string, string> = { CapturePhoto: 'capturePhoto', CapturePost: 'capturePost', FieldNote: 'fieldNote', Profile: 'profile' }
  const field = map[row.targetType]
  if (!field || !valid(row.targetId)) return null
  const photo = ['Profile', 'CapturePhoto'].includes(row.targetType) ? 'photo { url }' : 'photoKey'
  const result = await foir.raw<Record<string, Target | null>>(`query HeldTarget($id: String) { ${field}(id: $id) { _id _ownerId ${photo} ${row.targetType === 'CapturePhoto' ? 'fileId' : ''} } }`, { id: row.targetId })
  return result[field] ? { model: row.targetType, target: result[field] } : null
}
/** All pages finish before response or return a platform continuation. No detached work. */
export async function reviewContent(input: Record<string, unknown>, envelope: DispatchEnvelope, ingress: OperationIngress): Promise<OperationResponse | Response> {
  if (ingress.userId || !envelope.callback) return no(403, 'An authorized operator dispatch is required.')
  if (!valid(input.id) || !['report', 'check'].includes(String(input.queue)) || !['preview', 'dismiss', 'approve', 'hide', 'hide_photo', 'release'].includes(String(input.action)) ||
      typeof input.reason !== 'string' || (input.action !== 'preview' && !input.reason.trim()) || input.reason.length > 1000) return no(400, 'Choose a review decision and reason.')
  if (input.queue === 'report' && input.action === 'approve') return no(400, 'Reports can be dismissed or their content hidden.')
  if (input.queue === 'check' && input.action === 'dismiss') return no(400, 'A safety check needs approval or hiding.')
  const foir = client(ingress, reviewModule), row = await queueRow(foir, String(input.queue), input.id)
  if (!row) return no(404, 'That review item is unavailable.')
  if (input.action === 'hide_photo') {
    if (input.queue !== 'report') return no(400, 'Choose a photo report.')
    const item = await reportTarget(foir, row.targetType, row.targetId)
    const photoKey = item?.row.photoKey
    if (!photoKey) return no(400, 'This report has no capture photo.')
    const { capturePhoto } = await foir.raw<{ capturePhoto: { _id: string; _ownerId: string } | null }>(
      'query ReviewedCaptureOwner($id: String) { capturePhoto(id: $id) { _id _ownerId } }', { id: photoKey })
    const originals = await all<{ _ownerId: string }>(foir, { field: 'capturePosts',
      where: '{ photoKey: { eq: $photo }, reshareOf: { isNull: true } }', types: '$photo: String', vars: { photo: photoKey }, node: '_ownerId' })
    const owner = capturePhoto?._ownerId
    if (!owner || originals.some(post => post._ownerId !== owner)) return no(409, 'The photo creator could not be verified.')
    const media = await readableCaptureContent(foir, photoKey)
    const hold = await createOwned(foir, 'ModerationCase', { targetType: 'CapturePhoto', targetId: photoKey,
      fileId: media.fileId, digest: `operator-${envelope.executionId}`, text: media.text, status: 'hidden', model: 'operator' }, owner, `${envelope.executionId}-photo-hold`)
    await set(foir, 'ContentReport', row._id, { status: 'hidden', resolution: input.reason })
    // Reuse the same bounded, platform-resumed media walk as a checked photo.
    // A repost's author must never be mistaken for the original photo owner.
    return reviewContent({ ...input, queue: 'check', id: hold, action: 'hide' }, envelope, ingress)
  }
  if (input.action === 'preview') {
    let text = row.text ?? '', fileId = row.fileId, owner = input.queue === 'check' ? row._ownerId : row.targetOwnerId
    const item = input.queue === 'report' ? await reportTarget(foir, row.targetType, row.targetId) : null
    if (item) {
      owner = item.row._ownerId
      if (item.model === 'CapturePost') {
        const { capturePost } = await foir.raw<{ capturePost: { photoKey: string; note: string | null; comment: string | null } | null }>(
          'query ReviewPost($id: String) { capturePost(id: $id) { photoKey note comment } }', { id: row.targetId })
        if (capturePost) { const source = await readableCaptureContent(foir, capturePost.photoKey); fileId = source.fileId; text = [source.text, capturePost.note, capturePost.comment].filter(Boolean).join('\n') }
      } else if (item.model === 'FieldNote') {
        const { fieldNote } = await foir.raw<{ fieldNote: { text: string | null; photoKey: string } | null }>('query ReviewNote($id: String) { fieldNote(id: $id) { text photoKey } }', { id: row.targetId })
        if (fieldNote) { text = fieldNote.text ?? ''; fileId = (await readableCaptureContent(foir, fieldNote.photoKey)).fileId }
      } else {
        const { profile } = await foir.raw<{ profile: { displayName: string; username: string; bio: string | null } | null }>('query ReviewProfile($id: String) { profile(id: $id) { displayName username bio } }', { id: row.targetId })
        if (profile) text = [profile.displayName, profile.username, profile.bio].filter(Boolean).join('\n')
        fileId = item.row.photo?.url ? backingFileId(item.row.photo.url) : undefined
      }
    }
    let author = ''
    if (owner) {
      const { profiles } = await foir.raw<{ profiles: { edges: { node: { displayName: string; username: string } }[] } }>(
        'query ReviewAuthor($id: ID) { profiles(first: 1, where: { ownerId: { eq: $id } }) { edges { node { displayName username } } } }', { id: owner })
      const person = profiles.edges[0]?.node; author = person ? `${person.displayName} · @${person.username}` : ''
    }
    let photoUrl = ''
    if (fileId) photoUrl = (await foir.raw<{ file: { url: string | null } | null }>('query ReviewFile($id: String!) { file(id: $id) { url } }', { id: fileId })).file?.url ?? ''
    return ok({ preview: { text, author, photoUrl } })
  }
  const cursor = envelope.continuation?.cursor ? JSON.parse(envelope.continuation.cursor) as HideCursor : undefined
  const model = input.queue === 'report' ? 'ContentReport' : 'ModerationCase'
  if (!cursor) {
    if (input.action === 'release') {
      if (input.queue !== 'check' || !['hidden','released'].includes(row.status)) return no(409, 'Only an active or already released hold can be released.')
      await set(foir, model, row._id, { status: 'released', reviewReason: input.reason, reviewedBy: envelope.executionId, reviewedAt: new Date().toISOString() })
    } else if (input.action === 'approve') {
      let image: Uint8Array | undefined
      if (row.fileId) {
        const { file } = await foir.raw<{ file: { url: string | null } | null }>('query ReviewPhoto($id: String!) { file(id: $id) { url } }', { id: row.fileId })
        if (!file?.url) return no(409, 'The checked photo is unavailable.')
        image = await readOperationPhoto(file.url, ingress.filesOrigin)
      }
      const digest = await safetyDigest({ targetType: row.targetType as SafetyTarget, targetId: row.targetId, text: row.text ?? '', image, fileId: row.fileId ?? undefined })
      if (digest !== row.digest) return no(409, 'The checked content changed. It needs a new check.')
      await set(foir, model, row._id, { status: 'approved', reviewReason: input.reason, reviewedBy: envelope.executionId, reviewedAt: new Date().toISOString() })
    } else if (input.action === 'dismiss') await set(foir, model, row._id, { status: 'dismissed', resolution: input.reason })
    else {
      // Persist the hold before narrowing media. Future save/audience paths see it.
      if (input.queue === 'check') await set(foir, model, row._id, { status: 'hidden', reviewReason: input.reason, reviewedBy: envelope.executionId, reviewedAt: new Date().toISOString() })
      else {
        const target = await reportTarget(foir, row.targetType, row.targetId)
        if (target) {
          await createOwned(foir, 'ModerationCase', { targetType: target.model, targetId: target.row._id, digest: `operator-${envelope.executionId}`, text: '', status: 'hidden', model: 'operator' }, row.targetOwnerId ?? target.row._ownerId, `${envelope.executionId}-hold`)
          await hideRecord(foir, target.model, target.row._id)
          if (target.model === 'Profile') await narrowFile(foir, target.row.photo?.url ? backingFileId(target.row.photo.url) : undefined)
        }
        await set(foir, model, row._id, { status: 'hidden', resolution: input.reason })
      }
    }
    const audit = await foir.raw<{ createModerationAction: { record: { _id: string } | null } }>(`mutation ReviewAudit($input: CreateModerationActionInput!, $key: String) {
      createModerationAction(input: $input, idempotencyKey: $key) { record { _id } }
    }`, { input: { targetType: row.targetType, targetId: row.targetId, action: input.action, reason: input.reason.trim(), actor: `execution:${envelope.executionId}` }, key: `${envelope.executionId}-audit` })
    if (!audit.createModerationAction?.record?._id) throw new Error('The review decision was not audited.')
  }
  if (input.action === 'release' && input.queue === 'check' && row.targetType === 'CapturePhoto') {
    const target = await resolveCheckTarget(foir, row)
    const owner = target?.target._ownerId ?? row._ownerId
    if (!valid(owner) || (target && owner !== row._ownerId)) throw new Error('The released photo owner could not be verified.')
    const result = await restoreChallengeCapture(foir, owner, row.targetId, new Date(), cursor?.after ?? undefined)
    return result.nextDigest ? continueRun({cursor:JSON.stringify({phase:'ChallengeRestore',after:result.nextDigest})}) : ok()
  }
  if (input.action !== 'hide' || input.queue !== 'check') return ok()
  if (row.targetType !== 'CapturePhoto') {
    const target = await resolveCheckTarget(foir, row)
    if (target) await hideRecord(foir, target.model, target.target._id)
    if (['input', 'Profile'].includes(row.targetType)) await narrowFile(foir, row.fileId)
    return ok()
  }
  if (cursor?.phase && !hidePhases.some(([name]) => name === cursor.phase)) return no(400, 'Invalid review continuation.')
  return await hideHeldPhoto(foir, row, cursor, next => continueRun({ cursor: JSON.stringify(next) })) ?? ok()
}

export type HeldRow = QueueRow
export type HideCursor = { after?: string | null; phase?: string }
const hidePhases = [
  ['root', ''], ['ChallengeAwards', ''], ['CapturePost', 'capturePosts'], ['FieldNote', 'fieldNotes'], ['CaptureCatTag', 'captureCatTags'], ['CatchArt', 'catchArts'],
] as const
/** Takes a held photo and everything built on it out of sight: its file
 * first, then its capture, challenge awards, posts (reposts too), notes, tags
 * and art. One record per dispatch keeps a heavily reposted photo inside the
 * network budget. Answers the next continuation, or null once the walk is done. */
export async function hideHeldPhoto(foir: QueryClient, row: HeldRow, cursor: HideCursor | undefined,
  resume: (next: HideCursor) => Response, { ownerOnly = false }: { ownerOnly?: boolean } = {}): Promise<Response | null> {
  const target = await resolveCheckTarget(foir, row)
  await narrowFile(foir, row.fileId)
  const phase = cursor?.phase ? hidePhases.findIndex(([name]) => name === cursor.phase) : 0
  if (phase < 0) throw new Error('Invalid review continuation.')
  const advance = () => hidePhases[phase + 1] ? resume({ phase: hidePhases[phase + 1][0] }) : null
  if (hidePhases[phase][0] === 'ChallengeAwards') {
    if (row.targetType !== 'CapturePhoto') return advance()
    // The hold was attributed to the verified original photographer when it
    // was created. Never substitute the operator, report author or input owner.
    const owner = target?.target._ownerId ?? row._ownerId
    if (!valid(owner) || (target && owner !== row._ownerId)) throw new Error('The held photo owner could not be verified.')
    const result = await invalidateChallengeCapture(foir, owner, row.targetId, new Date(), cursor?.after ?? undefined)
    return result.nextDigest ? resume({ phase: 'ChallengeAwards', after: result.nextDigest }) : advance()
  }
  if (phase === 0) {
    if (target) await hideRecord(foir, target.model, target.target._id)
    return advance()
  }
  const [type, field] = hidePhases[phase]
  const answer = await foir.raw<{ page: { edges: { node: { _id: string; art?: { url: string | null } | null } }[]; pageInfo: { hasNextPage: boolean; endCursor: string | null } } }>(
    `query HidePhotoReferences($photo: String, $after: String${ownerOnly ? ', $owner: ID' : ''}) { page: ${field}(first: 1, after: $after, orderBy: [{createdAt: ASC}, {id: ASC}], where: { photoKey: { eq: $photo }${ownerOnly ? ', ownerId: {eq: $owner}' : ''} }) { edges { node { _id ${type === 'CatchArt' ? 'art { url }' : ''} } } pageInfo { hasNextPage endCursor } } }`,
    { photo: row.targetId, after: cursor?.after, ...(ownerOnly ? { owner: row._ownerId } : {}) })
  const node = answer.page.edges[0]?.node, page = answer.page.pageInfo
  if (!node) return advance()
  if (node.art?.url) await narrowFile(foir, backingFileId(node.art.url))
  await hideRecord(foir, type, node._id)
  if (!page.hasNextPage) return advance()
  if (!page.endCursor || page.endCursor === cursor?.after) throw new Error('The review list did not advance.')
  return resume({ phase: type, after: page.endCursor })
}
