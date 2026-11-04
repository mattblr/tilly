import type { AppClient, Encounter } from './data'
import { collectPages } from './paging'
const viewers = new WeakMap<AppClient, { id: string | null; pending?: Promise<Set<string>> }>()
const identities = new WeakMap<AppClient, () => Promise<string | null>>()
export const setSafetyIdentity = (client: AppClient, identity: () => Promise<string | null>) => identities.set(client, identity)
export function setSafetyViewer(client: AppClient, id: string | null) { viewers.set(client, { id }) }
export function setViewerBlocks(client: AppClient, blocked: Set<string>) {
  const current = viewers.get(client)
  if (current) current.pending = Promise.resolve(blocked)
}
/** Fóir gap (docs/known-gaps.md, "Reciprocal blocks"): an operation couldn't
 * read a block owned by the other user, so blocks aren't enforced both ways.
 * Here: each viewer hides the people they blocked. Closes when an operation's
 * declared grants decide what it reads and access rules can express a block. */
export async function viewerBlocks(client: AppClient): Promise<Set<string>> {
  const identity = identities.get(client)
  if (identity) {
    const id = await identity()
    if (viewers.get(client)?.id !== id) setSafetyViewer(client, id)
  }
  const current = viewers.get(client)
  if (!current?.id) return new Set()
  if (!current.pending) current.pending = collectPages(async after => {
    const result = await client.raw<{ myUserBlocks: { edges: { node: { blockedUserId: string | null } }[]; pageInfo: { hasNextPage: boolean; endCursor: string | null } } }>(
      'query MyBlocks($after: String) { myUserBlocks(first: 100, after: $after) { edges { node { blockedUserId } } pageInfo { hasNextPage endCursor } } }', { after })
    return { rows: result.myUserBlocks.edges.flatMap(({ node }) => node.blockedUserId ? [node.blockedUserId] : []), next: result.myUserBlocks.pageInfo.hasNextPage ? result.myUserBlocks.pageInfo.endCursor : null }
  }).then(ids => new Set(ids)).catch(error => { current.pending = undefined; throw error })
  const result = await current.pending
  if (viewers.get(client) !== current) throw new Error('The signed-in account changed.')
  return result
}
export const allowedEncounter = (row: Encounter, blocked: ReadonlySet<string>) =>
  !(row.authorId && blocked.has(row.authorId)) && !(row.repostedBy?.id && blocked.has(row.repostedBy.id))

