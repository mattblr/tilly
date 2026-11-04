import {operationCredential} from './credentials'
import { checkContent, safetyDigest, SAFETY_MODEL, type CheckedContent, type SafetyCase, type SafetyStore, type SafetyTarget } from './safety-policy'
import { operationPhotoUrl, readOperationPhoto } from './files'
import type { OperationIngress, QueryClient } from './types'
import {artworkProof} from './artwork-access'

type Context = { userId: string; filesOrigin?: string; ingress: OperationIngress;
  photo?: { id: string; mimeType: string; bytes: Uint8Array }
}
const contexts = new WeakMap<QueryClient, Context>()
const socialContexts = new WeakSet<QueryClient>()
export function withContentSafety<T extends QueryClient>(client: T, ingress: OperationIngress): T {
  if (!ingress.userId) throw new Error('Content publication requires an authenticated creator.')
  socialContexts.add(client)
  contexts.set(client, { userId: ingress.userId, filesOrigin: ingress.filesOrigin, ingress })
  return client
}
export const hasContentSafety = (foir: QueryClient) => contexts.has(foir)
export function backingFileId(url: string) {
  const id = new URL(url).pathname.split('/').pop()
  if (!id || !/^[a-z0-9]{10,40}$/.test(id)) throw new Error('The photo has no backing file identity.')
  return id
}
async function rows<T>(foir: QueryClient, field: string, where: string, vars: Record<string, unknown>, node: string, types: string) {
  const result: T[] = [], seen = new Set<string>(); let after: string | null = null
  do {
    const data: { page: { edges: { node: T }[]; pageInfo: { hasNextPage: boolean; endCursor: string | null } } } = await foir.raw(
      `query SafetyRows($after: String, ${types}) { page: ${field}(first: 100, after: $after, where: ${where}) { edges { node { ${node} } } pageInfo { hasNextPage endCursor } } }`, { ...vars, after })
    result.push(...data.page.edges.map(edge => edge.node))
    if (!data.page.pageInfo.hasNextPage) break
    after = data.page.pageInfo.endCursor
    if (!after || seen.has(after)) throw new Error('The safety list did not advance.')
    seen.add(after)
  } while (after)
  return result
}
/** Existence checks never drain historical verdict pages inside a publisher. */
async function firstSafety<T>(foir: QueryClient, where: string, vars: Record<string, unknown>, node: string, types: string): Promise<T | undefined> {
  const data = await foir.raw<{ page: { edges: { node: T }[] } }>(
    `query SafetyRows(${types}) { page: moderationCases(first: 1, where: ${where}) { edges { node { ${node} } } } }`, vars)
  return data.page.edges[0]?.node
}
export function safetyStore(foir: QueryClient, actor: string): SafetyStore {
  const fields = '_id digest status targetType targetId fileId'
  return {
    async holds(content) {
      return !!await firstSafety(foir,
        '{ status: { eq: "hidden" }, OR: [{ targetType: { eq: $kind }, targetId: { eq: $id } }, { fileId: { eq: $file } }] }',
        { kind: content.targetType, id: content.targetId, file: content.fileId ?? '__no_file__' }, '_id', '$kind: String, $id: String, $file: String')
    },
    async matching(_content, digest) {
      // Approval has precedence, then a previous refusal. No need to enumerate
      // every target that reused this creator's immutable image/text digest.
      for (const status of ['approved', 'flagged']) {
        const found = await firstSafety<SafetyCase & { _id: string }>(foir,
          '{ ownerId: { eq: $owner }, digest: { eq: $digest }, status: {eq: $status} }',
          { owner: actor, digest, status }, fields, '$owner: ID, $digest: String, $status: String')
        if (found) return [{ ...found, id: found._id }]
      }
      return []
    },
    async keep(content, digest, status, categories) {
      const vars = { owner: actor, kind: content.targetType, id: content.targetId, digest }
      const where = '{ ownerId: { eq: $owner }, targetType: { eq: $kind }, targetId: { eq: $id }, digest: { eq: $digest }'
      const types = '$owner: ID, $kind: String, $id: String, $digest: String'
      // A concurrent reviewer must not be overwritten by a late model result.
      if (await firstSafety(foir, `${where}, status: {in: ["hidden", "approved"]} }`, vars, '_id status', types)) return
      const row = await firstSafety<{ _id: string; status: string }>(foir, `${where} }`, vars, '_id status', types)
      const existing = row ? [row] : []
      const data = { targetType: content.targetType, targetId: content.targetId, digest, status, text: content.text.normalize('NFC'),
        ...(content.fileId ? { fileId: content.fileId } : {}), model: SAFETY_MODEL, categories }
      if (existing[0]) {
        const answer = await foir.raw<{ updateModerationCase: { record: { _id: string } | null } }>(`mutation SafetyResult($id: ID, $data: ModerationCaseUpdateInput!) {
          updateModerationCase(where: { id: { eq: $id }, status: { in: ["error", "flagged"] } }, data: $data) { record { _id } }
        }`, { id: existing[0]._id, data: Object.fromEntries(Object.entries(data).map(([key, value]) => [key, { set: value }])) })
        if (!answer.updateModerationCase?.record?._id) throw new Error('The safety result changed before it could be saved.')
      } else {
        const answer = await foir.raw<{ createModerationCase: { record: { _id: string } | null } }>(`mutation SafetyCase($input: CreateModerationCaseInput!, $owner: ID, $key: String) {
          createModerationCase(input: $input, ownerId: $owner, idempotencyKey: $key) { record { _id } }
        }`, { input: data, owner: actor, key: `safety-${actor}-${content.targetType}-${content.targetId}-${digest}` })
        if (!answer.createModerationCase?.record?._id) throw new Error('The safety result was not saved.')
      }
    },
  }
}
async function moderationKey(_foir: QueryClient, context: Context) {
  // The installed business operation owns this Fóir credential while config-
  // owned reads are unavailable. No environment or broader-token fallback.
  return operationCredential(context.ingress, 'moderationOpenAI')
}
async function moderate(foir: QueryClient, context: Context, content: CheckedContent) {
  const key = await moderationKey(foir, context)
  const input: ({ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } })[] = []
  if (content.text.trim()) input.push({ type: 'text', text: content.text })
  if (content.image) input.push({ type: 'image_url', image_url: { url: `data:${content.mimeType ?? 'image/jpeg'};base64,${Buffer.from(content.image).toString('base64')}` } })
  const reply = await fetch('https://api.openai.com/v1/moderations', { method: 'POST', redirect: 'manual',
    headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({ model: SAFETY_MODEL, input }), signal: AbortSignal.timeout(12_000) })
  if (!reply.ok) {
    console.warn('Tilly moderation provider refused the request', { status: reply.status })
    throw new Error('The safety check could not finish.')
  }
  return reply.json()
}
export async function checkSharingContent(foir: QueryClient, content: Omit<CheckedContent, 'image'>) {
  const context = contexts.get(foir)
  if (!context) return true
  let checked: CheckedContent = content
  if (content.fileId) {
    const file = (await foir.raw<{ file: { id: string; url: string | null; mimeType: string | null; deletedAt: string | null } | null }>(
      'query SafetyFile($id: String!) { file(id: $id) { id url mimeType deletedAt } }', { id: content.fileId })).file
    if (!file?.url || file.id !== content.fileId || file.deletedAt || !['image/jpeg', 'image/png', 'image/webp'].includes(file.mimeType ?? ''))
      throw new Error('The shared photo is unavailable.')
    operationPhotoUrl(file.url, context.filesOrigin)
    // Reuse an approval only for this creator's exact immutable upload, text
    // and moderation model. This also avoids depending on a just-changed CDN
    // URL being immediately readable in the next platform dispatch. Holds are
    // always read afresh; no caller-supplied verdict or URL is trusted.
    const store = safetyStore(foir, context.userId)
    if (await store.holds(content)) return false
    const approved = await firstSafety(foir,
      '{ownerId: {eq: $owner}, fileId: {eq: $file}, text: {eq: $text}, model: {eq: $model}, status: {eq: "approved"}}',
      { owner: context.userId, file: file.id, text: content.text.normalize('NFC'), model: SAFETY_MODEL },
      '_id', '$owner: ID, $file: String, $text: String, $model: String')
    if (approved) return !await store.holds(content)
    // File identities describe immutable uploads. Keep only the most recent
    // bounded image in this dispatch: publishing changes its CDN access URL,
    // which need not be readable immediately after the visibility mutation.
    // No byte cache crosses dispatches. Persistent approvals above require
    // the same immutable file identity and exact text/model/creator.
    const cached = context.photo
    const bytes = cached?.id === file.id && cached.mimeType === file.mimeType
      ? cached.bytes : await readOperationPhoto(file.url, context.filesOrigin)
    context.photo = { id: file.id, mimeType: file.mimeType!, bytes }
    checked = { ...content, image: bytes, mimeType: file.mimeType ?? 'image/jpeg' }
  }
  if (!checked.text.trim() && !checked.image) return true
  const store = safetyStore(foir, context.userId)
  const decision = await checkContent(store, checked, async () => {
    try { return await moderate(foir, context, checked) }
    catch (error) {
      // Never log a provider response, credential, dispatch or checked content.
      const message = error instanceof Error ? error.message : ''
      const reason = /(?:cannot query field|unknown field)[\s\S]*(?:getSecret|appCredential)/i.test(message) ? 'secret_schema'
        : /(?:not.found|no install)/i.test(message) ? 'credential_owner_unavailable'
        : /(?:secrets:read|permission denied|forbidden)/i.test(message) ? 'secret_permission' : 'provider_or_transport'
      console.warn('Tilly moderation could not finish', { reason })
      throw error
    }
  }, stage => console.warn('Tilly moderation check refused', { stage }))
  // A digest approval may originate from an identical earlier upload. Bind the
  // verified result to this file/text before its public URL is ever opened.
  if (decision.approved && content.fileId)
    await store.keep(checked, decision.digest, 'approved', [])
  return decision.approved && !await store.holds(checked)
}

/** Cat names enter a public directory even when the creator keeps the photo
 * private. Check that text before creating its shared record; never attach the
 * private photo to this request. Exact-name approvals are reusable per creator.
 */
export async function checkNewCatName(foir: QueryClient, name: string) {
  const digest = await safetyDigest({ targetType: 'input', targetId: 'new-cat-name', text: name })
  return checkSharingContent(foir, { targetType: 'input', targetId: `cat-name-${digest.slice(0, 40)}`, text: name })
}

export async function readableCaptureContent(foir: QueryClient, id: string) {
  const capture = (await foir.raw<{ capturePhoto: { _id: string; fileId: string; cat: { name: string | null } | null } | null }>(
    'query SafetyCapture($id: String) { capturePhoto(id: $id) { _id fileId cat { name } } }', { id })).capturePhoto
  if (!capture) throw new Error('The shared capture is unavailable.')
  if (typeof capture.cat?.name !== 'string') throw new Error('The capture’s cat name could not be checked.')
  return { fileId: capture.fileId, text: capture.cat.name }
}
export async function checkedAudience(foir: QueryClient, type: string, id: string, wanted: string) {
  if (!contexts.has(foir) || wanted === 'private') return wanted
  if (type === 'CatchArt') {
    const proof=await artworkProof(foir,contexts.get(foir)!.userId,id)
    if (!proof || proof.source.audience==='private' || (wanted==='public' && proof.source.audience!=='public')) return 'private'
    // This output is bound to the trusted image-edit attempt and provider's
    // built-in filtering. No second output-moderation request is introduced.
    return await publicationHeld(foir,type,id) ? 'private' : wanted
  }
  let targetType = type as SafetyTarget, targetId = id, text = '', fileId: string | undefined
  if (type === 'CaptureCatTag') {
    const { captureCatTag: tag } = await foir.raw<{ captureCatTag: { photoKey: string } | null }>('query SafetyTag($id: String) { captureCatTag(id: $id) { photoKey } }', { id })
    if (!tag) throw new Error('The cat tag is unavailable.')
    targetType = 'CapturePhoto'; targetId = tag.photoKey
  }
  if (targetType === 'CapturePhoto') ({ text, fileId } = await readableCaptureContent(foir, targetId))
  else if (type === 'CapturePost') {
    const { capturePost: post } = await foir.raw<{ capturePost: { photoKey: string; note: string | null; comment: string | null } | null }>(
      'query SafetyPost($id: String) { capturePost(id: $id) { photoKey note comment } }', { id })
    if (!post) throw new Error('The post is unavailable.')
    const media = await readableCaptureContent(foir, post.photoKey)
    fileId = media.fileId; text = [media.text, post.note, post.comment].filter(Boolean).join('\n')
  } else if (type === 'FieldNote') {
    const { fieldNote: note } = await foir.raw<{ fieldNote: { text: string | null } | null }>('query SafetyNote($id: String) { fieldNote(id: $id) { text } }', { id })
    if (!note) throw new Error('The note is unavailable.')
    text = note.text ?? ''
  } else if (type === 'Profile') {
    const { profile } = await foir.raw<{ profile: { displayName: string; username: string; bio: string | null; photo: { url: string | null } | null } | null }>(
      'query SafetyProfile($id: String) { profile(id: $id) { displayName username bio photo { url } } }', { id })
    if (!profile) throw new Error('The profile is unavailable.')
    text = [profile.displayName, profile.username, profile.bio].filter(Boolean).join('\n')
    fileId = profile.photo?.url ? backingFileId(profile.photo.url) : undefined
  } else if (type !== 'CaptureCatTag') throw new Error('This content kind cannot be shared unchecked.')
  return await checkSharingContent(foir, { targetType, targetId, text, fileId }) ? wanted : 'private'
}

/** Re-read holds after widening access. Review writes its hold before narrowing;
 * a publisher that finishes later must compensate instead of undoing that hide.
 * This reads identities only, never re-runs a provider or trusts a caller verdict.
 */
export async function publicationHeld(foir: QueryClient, type: string, id: string, fileId?: string) {
  const context = contexts.get(foir)
  if (!context) return false
  if (type === 'CatchArt') {
    const proof=await artworkProof(foir,context.userId,id)
    if (!proof || (fileId && fileId!==proof.job.outputFileId)) return true
    const store=safetyStore(foir,context.userId)
    return await store.holds({targetType:'CapturePhoto',targetId:proof.source._id,text:'',fileId:proof.source.fileId}) ||
      await store.holds({targetType:'CatchArt',targetId:id,text:'',fileId:proof.job.outputFileId})
  }
  let targetType = type as SafetyTarget, targetId = id
  if (type === 'CaptureCatTag') {
    const { captureCatTag } = await foir.raw<{ captureCatTag: { photoKey: string } | null }>(
      'query PublicationTag($id: String) { captureCatTag(id: $id) { photoKey } }', { id })
    if (!captureCatTag) throw new Error('The cat tag is unavailable.')
    targetType = 'CapturePhoto'; targetId = captureCatTag.photoKey
  }
  if (!fileId && targetType === 'CapturePhoto')
    fileId = (await readableCaptureContent(foir, targetId)).fileId
  else if (!fileId && ['CapturePost', 'FieldNote'].includes(type)) {
    const field = type === 'CapturePost' ? 'capturePost' : 'fieldNote'
    const answer = await foir.raw<Record<string, { photoKey: string | null } | null>>(
      `query PublicationSource($id: String) { ${field}(id: $id) { photoKey } }`, { id })
    if (!answer[field]) throw new Error('The shared content is unavailable.')
    if (answer[field].photoKey) fileId = (await readableCaptureContent(foir, answer[field].photoKey)).fileId
  } else if (!fileId && type === 'Profile') {
    const { profile } = await foir.raw<{ profile: { photo: { url: string | null } | null } | null }>(
      'query PublicationProfile($id: String) { profile(id: $id) { photo { url } } }', { id })
    if (!profile) throw new Error('The profile is unavailable.')
    if (profile.photo?.url) fileId = backingFileId(profile.photo.url)
  }
  return safetyStore(foir, context.userId).holds({ targetType, targetId, text: '', fileId })
}

/** Called only after the revision's moderation check. Every public file write
 * has a final hold read; a failed read also narrows before propagating failure.
 * Record and file changes remain separate, not an atomic transaction.
 */
export async function publishCheckedFile(foir: QueryClient, fileId: string, type: string, id: string) {
  const visibility = async (value: 'PUBLIC' | 'PRIVATE') => {
    const result = await foir.raw<{ setFileVisibility: string }>(
      'mutation CheckedFileVisibility($id: ID!, $visibility: Visibility!) { setFileVisibility(id: $id, visibility: $visibility) }',
      { id: fileId, visibility: value })
    if (result?.setFileVisibility !== value) throw new Error('The photo visibility change was refused.')
  }
  if (await publicationHeld(foir, type, id, fileId)) { await visibility('PRIVATE'); return false }
  try {
    await visibility('PUBLIC')
    if (await publicationHeld(foir, type, id, fileId)) { await visibility('PRIVATE'); return false }
    return true
  } catch (error) {
    await visibility('PRIVATE')
    throw error
  }
}

export async function assertSocialAllowed(foir: QueryClient, actor: string, other: string | null | undefined) {
  if (!socialContexts.has(foir) || !other || other === actor) return
  // Check each direction explicitly; one bounded existence read per owner.
  // A failed check propagates, so the action cannot bypass a refused read.
  for (const [owner, target] of [[actor, other], [other, actor]]) {
    const result = await foir.raw<{ userBlocks: { edges: { node: { _id: string } }[] } }>(
      `query SocialBlock($owner: ID, $target: String) {
        userBlocks(first: 1, where: {ownerId: {eq: $owner}, blockedUserId: {eq: $target}}) { edges { node { _id } } }
      }`, { owner, target }, { strict: true })
    if (result.userBlocks.edges.length) throw new Error('This interaction is unavailable.')
  }
}
