import { collectConnection } from './paging'
import { runAppOperation } from './operations'
import type { AppClient } from './data'

/**
 * A follow has two halves: the asker's request (follow-request, theirs) and the
 * answer of the user asked (follow-approval, theirs). It is on while the
 * request stands and the answer is accepted. Only a record's owner may change
 * it, so each user writes their own half through `follow_user`.
 */
export type FollowState = 'none' | 'requested' | 'following'

export type Circle = {
  following: Set<string>
  /** Asked, not yet answered. */
  requested: Set<string>
  followers: Set<string>
  /** Asking to follow me, oldest first. */
  requests: string[]
}

/** The signed-in user's follows, followers and requests either way. */
export async function readCircle(client: AppClient, me: string): Promise<Circle> {
  const [mine, answers, toMe, myAnswers] = await Promise.all([
    collectConnection(after => client['follow-request'].findMany({ first: 100, after, where: { ownerId: { eq: me } }, pick: ['_id', 'followeeId'] })),
    collectConnection(after => client['follow-approval'].findMany({ first: 100, after, where: { followerId: { eq: me } }, pick: ['_id', 'requestId', 'status'] })),
    collectConnection(after => client['follow-request'].findMany({ first: 100, after, where: { followeeId: { eq: me } }, pick: ['_id', '_ownerId'] })),
    collectConnection(after => client['follow-approval'].findMany({ first: 100, after, where: { ownerId: { eq: me } }, pick: ['_id', 'followerId', 'requestId', 'status'] })),
  ])
  const answerTo = new Map(answers.flatMap(row => row.requestId ? [[row.requestId, row.status] as const] : []))
  const standing = new Set(toMe.map(row => row._id))
  const following = new Set(mine.flatMap(row => answerTo.get(row._id) === 'accepted' && row.followeeId ? [row.followeeId] : []))
  const requested = new Set(mine.flatMap(row => !answerTo.has(row._id) && row.followeeId && !following.has(row.followeeId) ? [row.followeeId] : []))
  const followers = new Set(myAnswers.flatMap(row => row.status === 'accepted' && row.requestId && standing.has(row.requestId) && row.followerId ? [row.followerId] : []))
  const requests = openRequests(toMe, myAnswers)
  // Someone stopped following: only this account can take back the access
  // they still hold, so start the tidy in the background.
  if (myAnswers.some(row => row.status === 'accepted' && row.requestId && !standing.has(row.requestId))) tidyFollowers(client)
  return { following, requested, followers, requests }
}

/** Who has asked to follow me and not been answered yet, once each. */
function openRequests(toMe: { _id: string; _ownerId?: string | null }[], myAnswers: { requestId?: string | null }[]) {
  const answered = new Set(myAnswers.flatMap(row => row.requestId ? [row.requestId] : []))
  return [...new Set(toMe.flatMap(row => !answered.has(row._id) && row._ownerId ? [row._ownerId] : []))]
}

/** How many people are waiting for the signed-in user to accept or decline,
 * for the badge on the profile button. Two reads, and no tidy-up. */
export async function requestCount(client: AppClient, me: string): Promise<number> {
  const [toMe, myAnswers] = await Promise.all([
    collectConnection(after => client['follow-request'].findMany({ first: 100, after, where: { followeeId: { eq: me } }, pick: ['_id', '_ownerId'] })),
    collectConnection(after => client['follow-approval'].findMany({ first: 100, after, where: { ownerId: { eq: me } }, pick: ['_id', 'requestId'] })),
  ])
  return openRequests(toMe, myAnswers).length
}

export function followState(circle: Circle | undefined, userId: string): FollowState {
  return circle?.following.has(userId) ? 'following' : circle?.requested.has(userId) ? 'requested' : 'none'
}

/** Follows or unfollows. A private user is asked first. */
export async function setFollow(client: AppClient, userId: string, following: boolean): Promise<FollowState> {
  const { result } = await runAppOperation(client, 'execute.follow_user', { userId, following }, { concurrencyKey: `follow:${userId}` })
  if (result.active !== true) return 'none'
  return result.status === 'requested' ? 'requested' : 'following'
}

/** Accepts or declines someone's request, or removes a follower. */
export async function answerFollower(client: AppClient, userId: string, follower: 'accept' | 'decline' | 'remove') {
  await runAppOperation(client, 'execute.follow_user', { userId, follower }, { concurrencyKey: `follower:${userId}` })
}

export type Counts = { followers: number; following: number; cats: number; catches: number }
/** Anyone signed in may see a user's counts; the lists follow their privacy. */
export async function profileCounts(client: AppClient, userId: string): Promise<Counts> {
  const { result } = await runAppOperation(client, 'execute.profile_counts', { userId })
  const n = (value: unknown) => typeof value === 'number' ? value : 0
  return { followers: n(result.followers), following: n(result.following), cats: n(result.cats), catches: n(result.catches) }
}

/** Another user's followers, or who they follow, as far as the viewer may read them. */
export async function theirPeople(client: AppClient, userId: string, kind: 'followers' | 'following') {
  const ids = kind === 'followers'
    ? (await collectConnection(after => client['follow-approval'].findMany({ first: 100, after, where: { ownerId: { eq: userId }, status: { eq: 'accepted' } }, pick: ['_id', 'followerId'] }))).map(row => row.followerId)
    : (await collectConnection(after => client['follow-approval'].findMany({ first: 100, after, where: { followerId: { eq: userId }, status: { eq: 'accepted' } }, pick: ['_id', '_ownerId'] }))).map(row => row._ownerId)
  return [...new Set(ids.filter((id): id is string => !!id))]
}

/** One background run at a time; Fóir owns its execution. */
function tidyFollowers(client: AppClient) {
  void Promise.resolve(client.ns.operations['execute.tidy_followers']({ input: {}, mode: 'ASYNC', concurrencyKey: 'tidy-followers' })).catch(() => {})
}

/** Where the signed-in user stands with one other user. */
export async function relationTo(client: AppClient, me: string, userId: string): Promise<FollowState> {
  const requests = await client['follow-request'].findMany({ first: 5, where: { ownerId: { eq: me }, followeeId: { eq: userId } }, pick: ['_id'] })
  const ids = requests.edges.map(edge => edge.node._id)
  if (!ids.length) return 'none'
  const answers = await client['follow-approval'].findMany({ first: 5, where: { followerId: { eq: me }, requestId: { in: ids } }, pick: ['_id', 'status'] })
  const statuses = answers.edges.map(edge => edge.node.status)
  return statuses.includes('accepted') ? 'following' : statuses.length < ids.length ? 'requested' : 'none'
}

/** Who the signed-in user follows: their requests that were accepted. */
export async function myFollowing(client: AppClient, me: string) {
  const [mine, answers] = await Promise.all([
    collectConnection(after => client['follow-request'].findMany({ first: 100, after, where: { ownerId: { eq: me } }, pick: ['_id', 'followeeId'] })),
    collectConnection(after => client['follow-approval'].findMany({ first: 100, after, where: { followerId: { eq: me }, status: { eq: 'accepted' } }, pick: ['_id', 'requestId'] })),
  ])
  const accepted = new Set(answers.flatMap(row => row.requestId ? [row.requestId] : []))
  return [...new Set(mine.flatMap(row => accepted.has(row._id) && row.followeeId ? [row.followeeId] : []))]
}
