import { createFoirClient } from '@foir/sdk/data'
import { continueRun } from '@foir/sdk/server'
import { operationApi } from './environment'
import { nodes, tidyFollowers } from './social'
import { privacyOf } from './audience'
import * as tidyModule from './generated/foir.op.tidy_followers.generated'
import * as countsModule from './generated/foir.op.profile_counts.generated'
import type { Connection, DispatchEnvelope, OperationIngress, OperationResponse, QueryClient } from './types'

const ID = /^[a-z0-9]{10,40}$/

/** Run from the user's own app: takes back access left by people who stopped
 * following them, a page per dispatch (see tidyFollowers). */
export async function tidyFollowersSlice(envelope: DispatchEnvelope, ingress: OperationIngress): Promise<OperationResponse | Response> {
  const me = ingress.userId
  if (!me || !envelope.callback) return { status: 403, body: { ok: false, error: 'A signed-in asynchronous dispatch is required.' } }
  const foir = createFoirClient({ apiUrl: operationApi(ingress.apiUrl), dispatch: ingress.dispatch, generated: tidyModule })
  let after: string | undefined
  if (envelope.continuation?.cursor) {
    const cursor = JSON.parse(envelope.continuation.cursor) as { after?: unknown }
    if (typeof cursor.after !== 'string' || !cursor.after) throw new Error('Invalid tidy continuation.')
    after = cursor.after
  }
  const next = await tidyFollowers(foir, me, after)
  return next.after ? continueRun({ cursor: JSON.stringify({ after: next.after }) }) : { status: 200, body: { ok: true } }
}

/**
 * A user's counts: followers, following, cats met and catches. Numbers only;
 * Fóir counts the records without returning them.
 *
 * Counts are meant for everyone, with only the lists kept private. For now
 * they're answered only where they can be counted: anyone for a public
 * profile, and the user and their accepted followers for a private one. Fóir
 * confines a run to the rows its user may read, whatever its grants say, and
 * an operation can't yet keep counters on other users' profiles (Fóir gap,
 * docs/known-gaps.md). Anyone else is refused. Closes when an operation's
 * declared grants decide what it reads and writes.
 *
 * A follow counts while its approval is accepted. Someone who unfollows still
 * counts until the followed user's app tidies (see tidyFollowers), as they
 * keep that user's read grant until then. A user's own page counts their exact
 * lists instead.
 */
export async function profile_counts(input: { userId?: string }, _envelope: DispatchEnvelope, ingress: OperationIngress): Promise<OperationResponse> {
  if (!ingress.userId) return { status: 403, body: { ok: false, error: 'Sign in to see someone’s profile.' } }
  const them = String(input.userId ?? '')
  if (!ID.test(them)) return { status: 400, body: { ok: false, error: 'userId is not an id' } }
  const foir = createFoirClient({ apiUrl: operationApi(ingress.apiUrl), dispatch: ingress.dispatch, generated: countsModule })
  if (!await maySeeCounts(foir, ingress.userId, them)) return { status: 403, body: { ok: false, error: 'This account is private.' } }
  return { status: 200, body: { ok: true, ...await countsOf(foir, them) } }
}

/** Whether `me` sees `them`'s catches: theirs, a public profile, or one whose
 * audience record `me` may read (an accepted follower). */
async function maySeeCounts(foir: QueryClient, me: string, them: string) {
  if (me === them) return true
  const seen = await foir.raw<{ profiles: Connection<{ privacy: string | null }>; audience: Connection<{ _id: string }> }>(
    'query CountsAllowed($p: ID) { profiles(first: 1, where: { ownerId: { eq: $p } }) { edges { node { privacy } } } audience: audiences(first: 1, where: { ownerId: { eq: $p } }) { edges { node { _id } } } }',
    { p: them })
  return privacyOf(nodes(seen.profiles)[0]?.privacy) === 'public' || nodes(seen.audience).length > 0
}

type Groups = { truncated: boolean; groups: { key: string | null; count: number }[] }
/** Records of one model matching `where` (about `$p`, typed `type`), counted by Fóir. */
const count = async (foir: QueryClient, model: string, where: string, type: 'ID' | 'String', p: string) =>
  (await foir.raw<{ n: Groups }>(`query Count($p: ${type}) { n: ${model}Aggregate(where: ${where}) { truncated groups { key count } } }`, { p }))
    .n.groups.reduce((sum, group) => sum + group.count, 0)

export async function countsOf(foir: QueryClient, user: string) {
  const [followers, following, catches, cats] = await Promise.all([
    count(foir, 'followApproval', '{ ownerId: { eq: $p }, status: { eq: "accepted" } }', 'ID', user),
    count(foir, 'followApproval', '{ followerId: { eq: $p }, status: { eq: "accepted" } }', 'String', user),
    count(foir, 'capturePhoto', '{ ownerId: { eq: $p }, state: { eq: "ready" } }', 'ID', user),
    // Cats met: one group per cat tagged in their captures.
    foir.raw<{ n: Groups }>('query CatsMet($p: ID) { n: captureCatTagAggregate(where: { ownerId: { eq: $p }, active: { eq: true } }, groupBy: CATKEY, limit: 1000) { truncated groups { key count } } }', { p: user }),
  ])
  return { followers, following, cats: cats.n.groups.filter(group => group.key).length, catches }
}
