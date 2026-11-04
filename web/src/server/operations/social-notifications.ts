import { createAppClient, type AppClient } from '@foir/sdk/app'
import defaults from '../../../../ios/Tilly/Resources/Copy.json'
import { operationApi } from './environment'
import type { DispatchEnvelope, OperationIngress, OperationResponse } from './types'

type SocialModel = 'capture-like' | 'follow-request' | 'capture-post'
type Kind = 'like' | 'repost' | 'follow' | 'request'
export type SocialNotice = { kind: Kind; actor: string; recipient: string; actionId: string; catKey?: string; imageUrl?: string | null }
type Source = { _id: string; _ownerId: string | null; catKey?: string | null; photoKey?: string | null;
  followeeId?: string | null; status?: string | null; reshareOf?: string | null; audience?: string | null }
type Media = { _ownerId: string | null; catKey: string | null; state?: string; photo: { url: string | null } | null }
const id = (value: unknown): value is string => typeof value === 'string' && /^[a-z0-9]{10,40}$/.test(value)
const models: Record<SocialModel, { field: string; fields: string; kind: Kind }> = {
  'capture-like': { field: 'captureLike', fields: 'catKey photoKey', kind: 'like' },
  'follow-request': { field: 'followRequest', fields: 'followeeId status', kind: 'follow' },
  'capture-post': { field: 'capturePost', fields: 'catKey photoKey reshareOf audience', kind: 'repost' },
}

/** Re-read the persisted record under verified hook identity, including after an undo. */
export async function socialNotificationEvent(app: Pick<AppClient, 'request' | 'notifications'>,
  envelope: Pick<DispatchEnvelope, 'trigger' | 'input' | 'context'>, actor: string | null | undefined): Promise<boolean> {
  const { recordId, modelKey } = envelope.input as Record<string, unknown>
  if (envelope.trigger.type !== 'lifecycle' || !id(actor) || envelope.context.userId !== actor ||
    !id(recordId) || typeof modelKey !== 'string' || !Object.hasOwn(models, modelKey))
    throw new Error('A native social record hook is required.')
  const model = models[modelKey as SocialModel]
  const { source } = await app.request<{ source: Source | null }>(
    `query SocialSource($id: String) { source: ${model.field}(id: $id) { _id _ownerId ${model.fields} } }`, { id: recordId })
  if (!source) return false
  if (source._id !== recordId || source._ownerId !== actor) throw new Error('The social record owner changed.')
  let recipient: string, catKey: string | undefined, imageUrl: string | null | undefined
  let kind = model.kind
  if (model.kind === 'follow') {
    if (!id(source.followeeId)) throw new Error('The follow has no valid recipient.')
    recipient = source.followeeId
    // A private user is asked; a public one is told.
    if (source.status === 'requested') kind = 'request'
  } else {
    if (model.kind === 'repost' && (!source.reshareOf || source.audience !== 'public')) return false
    if (!id(source.photoKey)) throw new Error('The social action has no valid photo.')
    const media = (await app.request<{ media: Media | null }>(
      `query SocialCanonicalMedia($id: String) { media: capturePhoto(id: $id) { _ownerId catKey state photo { url } } }`, { id: source.photoKey })).media
    if (!media || media.state !== 'ready') return false
    const author = media._ownerId
    if (!id(author) || !id(media.catKey)) throw new Error('The original photo owner could not be verified.')
    recipient = author; catKey = media.catKey; imageUrl = media.photo?.url
  }
  if (recipient === actor) return false
  for (const [owner, target] of [[actor, recipient], [recipient, actor]]) {
    const blocks = await app.request<{ userBlocks: { edges: unknown[] } }>(
      `query SocialNotificationBlock($owner: ID, $target: String) {
        userBlocks(first: 1, where: {ownerId: {eq: $owner}, blockedUserId: {eq: $target}}) { edges { node { _id } } }
      }`, { owner, target })
    if (blocks.userBlocks.edges.length) return false
  }
  return notifySocial(app, { kind, actor, recipient, actionId: recordId, catKey, imageUrl })
}

/** Failed delivery propagates to Fóir's hook/run retries. No mirror or second queue. */
export async function notifySocial(app: Pick<AppClient, 'request' | 'notifications'>, notice: SocialNotice): Promise<boolean> {
  if (notice.actor === notice.recipient) return false
  if (!id(notice.actor) || !id(notice.recipient) || !id(notice.actionId) ||
    (notice.kind !== 'follow' && notice.kind !== 'request' && !id(notice.catKey))) throw new Error('Invalid social destination.')
  const result = await app.request<{
    profiles: { edges: { node: { displayName: string | null; username: string | null; photo: { url: string | null } | null } }[] }
    uiCopy: { entries: { key: string; value: string }[] } | null
  }>(`query SocialNotificationCopy($actor: ID) {
    profiles(first: 1, where: {ownerId: {eq: $actor}}) { edges { node { displayName username photo { url } } } }
    uiCopy(naturalKey: "social-notifications") { entries { key value } }
  }`, { actor: notice.actor })
  const profile = result.profiles.edges[0]?.node
  const words: Record<string, string> = { ...defaults['social-notifications'], ...Object.fromEntries((result.uiCopy?.entries ?? []).map(entry => [entry.key, entry.value])) }
  const name = profile?.displayName?.trim() || profile?.username?.trim() || words.someone
  const person = notice.kind === 'follow' || notice.kind === 'request'
  const imageUrl = person ? profile?.photo?.url : notice.imageUrl
  await app.notifications.send({
    userId: notice.recipient, category: 'community_updates',
    idempotencyKey: `social:${notice.kind}:${notice.actionId}:${notice.recipient}`,
    title: words[`${notice.kind}.title`].replaceAll('{name}', name), message: words[`${notice.kind}.body`],
    actionUrl: person ? `tilly://person/${notice.actor}` : `tilly://cat/${notice.catKey}`,
    ...(imageUrl ? { imageUrl } : {}),
  })
  return true
}

export async function socialNotification(envelope: DispatchEnvelope, ingress: OperationIngress): Promise<OperationResponse> {
  const app = createAppClient({ apiUrl: operationApi(ingress.apiUrl), dispatch: ingress.dispatch,
    requestInit: { signal: AbortSignal.timeout(40_000) } })
  const notified = await socialNotificationEvent(app, envelope, ingress.userId)
  return { status: 200, body: { ok: true, notified } }
}
