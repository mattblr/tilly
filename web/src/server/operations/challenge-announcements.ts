import { challengeCriteriaDigest, challengeDigest, photoChallenge, type PhotoChallenge } from './challenge-contract'

export interface AnnouncementPage<T> { edges: { node: T }[]; pageInfo: { hasNextPage: boolean; endCursor: string | null } }
export interface AnnouncementRecipient { _id: string; _ownerId: string; communityUpdates: boolean }
export interface AnnouncementStore {
  audienceScope?: string
  challenges(after?: string): Promise<AnnouncementPage<PhotoChallenge>>
  challenge(key: string): Promise<PhotoChallenge | null>
  settings(after?: string): Promise<AnnouncementPage<AnnouncementRecipient>>
  ownSettings(owner: string): Promise<AnnouncementRecipient | null>
  send(input: { userId: string; category: 'community_updates'; title: string; message: string; actionUrl: `/people/${string}`; idempotencyKey: string; expiresAt: string }): Promise<void>
}
interface Cursor {
  v: 1; after?: string; finished: boolean; eligible: number
  current?: { key: string; identity: string; digest: string }
  recipientAfter?: string
}
const key = /^[a-z][a-z0-9-]{0,39}$/
const actor = /^[a-z0-9]{10,40}$/
const digest = /^[a-f0-9]{64}$/
export function announcementCursor(value?: string): Cursor {
  if (value === undefined) return { v: 1, finished: false, eligible: 0 }
  if (!value || value.length > 4096) throw new Error('Invalid challenge announcement continuation.')
  const parsed = JSON.parse(value) as Cursor
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed) || parsed.v !== 1 ||
    Object.keys(parsed).some(name => !['v', 'after', 'finished', 'eligible', 'current', 'recipientAfter'].includes(name)) ||
    typeof parsed.finished !== 'boolean' || !Number.isSafeInteger(parsed.eligible) || parsed.eligible < 0 ||
    [parsed.after, parsed.recipientAfter].some(v => v !== undefined && (typeof v !== 'string' || !v || v.length > 1500)) ||
    (parsed.current !== undefined && (!parsed.current || typeof parsed.current !== 'object' || Array.isArray(parsed.current) ||
      Object.keys(parsed.current).sort().join(',') !== 'digest,identity,key' || !key.test(parsed.current.key) ||
      !digest.test(parsed.current.identity) || !digest.test(parsed.current.digest))) ||
    (parsed.recipientAfter !== undefined && parsed.current === undefined)) throw new Error('Invalid challenge announcement continuation.')
  return parsed
}
function next<T>(page: AnnouncementPage<T>, before?: string) {
  if (!page || !Array.isArray(page.edges) || page.edges.length > 1 || !page.pageInfo || typeof page.pageInfo.hasNextPage !== 'boolean') throw new Error('Challenge announcement page is unavailable.')
  if (!page.pageInfo.hasNextPage) return undefined
  const cursor = page.pageInfo.endCursor
  if (typeof cursor !== 'string' || !cursor || cursor === before || cursor.length > 1500) throw new Error('Challenge announcement paging did not advance.')
  return cursor
}
export const announcementIdentity = (challenge: PhotoChallenge, audienceScope = 'all-opted-in') => challengeDigest([
  'challenge-start-v1', audienceScope, challenge._naturalKey, challenge.criteriaVersion, challenge.startsAt, challenge.endsAt,
])
export function challengeActive(challenge: PhotoChallenge, now: Date) {
  return challenge.enabled && Date.parse(challenge.startsAt) <= now.getTime() && now.getTime() < Date.parse(challenge.endsAt)
}
/** One catalogue row or recipient page per awaited native continuation. Fóir
 * owns execution progress and delivery deduplication; there is no app run record
 * or election. Retries and overlapping schedules reuse each recipient send key. */
export async function challengeAnnouncementSlice(store: AnnouncementStore, dryRun: boolean, cursor?: string, clock = () => new Date()) {
  const state = announcementCursor(cursor)
  const more = () => ({ cursor: JSON.stringify(state) })
  const finish = () => ({ result: { ok: true as const, eligible: state.eligible, dryRun } })
  const leaveChallenge = () => { delete state.current; delete state.recipientAfter; return state.finished ? finish() : more() }
  if (!state.current) {
    if (state.finished) return finish()
    const page = await store.challenges(state.after)
    state.after = next(page, state.after); state.finished = !state.after
    const row = page.edges[0]?.node
    if (row) {
      const challenge = photoChallenge(row)
      if (challengeActive(challenge, clock())) state.current = { key: challenge._naturalKey,
        identity: await announcementIdentity(challenge, store.audienceScope), digest: await challengeCriteriaDigest(challenge) }
    }
    return state.current || !state.finished ? more() : finish()
  }
  const binding = state.current
  const latest = await store.challenge(binding.key)
  if (!latest || !challengeActive(photoChallenge(latest), clock())) return leaveChallenge()
  const challenge = photoChallenge(latest)
  if (await announcementIdentity(challenge, store.audienceScope) !== binding.identity || await challengeCriteriaDigest(challenge) !== binding.digest)
    throw new Error('Challenge rules changed while announcing.')
  const page = await store.settings(state.recipientAfter), recipientAfter = next(page, state.recipientAfter)
  const recipient = page.edges[0]?.node
  if (recipient) {
    if (!actor.test(recipient._ownerId)) throw new Error('Challenge recipient identity is unavailable.')
    const intent = await store.ownSettings(recipient._ownerId)
    if (intent && (intent._ownerId !== recipient._ownerId || intent._id !== recipient._id)) throw new Error('Challenge notification settings changed owner.')
    // Recheck published rules and opt-in after earlier awaited reads. The native
    // send also applies current platform category preferences at delivery time.
    const current = await store.challenge(binding.key)
    const live = current ? photoChallenge(current) : null
    if (!live || !challengeActive(live, clock())) return leaveChallenge()
    if (await announcementIdentity(live, store.audienceScope) !== binding.identity || await challengeCriteriaDigest(live) !== binding.digest)
      throw new Error('Challenge rules changed while announcing.')
    if (!challengeActive(live, clock())) return leaveChallenge()
    if (intent?.communityUpdates === true) {
      if (!dryRun) await store.send({ userId: recipient._ownerId, category: 'community_updates',
        title: live.title.slice(0, 100), message: live.description, actionUrl: `/people/${recipient._ownerId}`, expiresAt: live.endsAt,
        idempotencyKey: `challenge-start:${binding.identity}:${recipient._ownerId}` })
      state.eligible++
    }
  }
  if (recipientAfter) state.recipientAfter = recipientAfter
  else { delete state.current; delete state.recipientAfter }
  return state.current || !state.finished ? more() : finish()
}
