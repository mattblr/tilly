import { createContext, useContext, type ReactNode } from 'react'
import { useAppSession } from './session'
import { useResource } from './use-resource'
import { collectPages, readLikeCounts } from './feed-sources'

const Context = createContext<ReturnType<typeof useLikes> | null>(null)
function useLikes(keys: string[]) {
  const { client, user, revision } = useAppSession()
  const selection = [...new Set(keys)].sort().join(',')
  return useResource(async () => {
    const ids = selection.split(',').filter(Boolean)
    const [counts, mine, reposts, profile] = await Promise.all([
      readLikeCounts(client, ids),
      user
        ? Promise.all(
            Array.from({ length: Math.ceil(ids.length / 100) }, (_, i) =>
              ids.slice(i * 100, (i + 1) * 100),
            ).map((keys) =>
              collectPages(async (after) => {
                const page = await client['capture-like'].findMany({
                  first: 100,
                  after,
                  where: { ownerId: { eq: user.id }, photoKey: { in: keys } },
                  pick: ['_id', 'photoKey'],
                })
                return {
                  rows: page.edges.map((edge) => edge.node.photoKey),
                  next: page.pageInfo.hasNextPage
                    ? page.pageInfo.endCursor
                    : null,
                }
              }),
            ),
          ).then((pages) => pages.flat())
        : [],
      user
        ? Promise.all(
            Array.from({ length: Math.ceil(ids.length / 100) }, (_, i) =>
              ids.slice(i * 100, (i + 1) * 100),
            ).map((keys) =>
              collectPages(async (after) => {
                const page = await client['capture-post'].findMany({
                  first: 100,
                  after,
                  where: {
                    ownerId: { eq: user.id },
                    photoKey: { in: keys },
                    reshareOf: { isNull: false },
                  },
                  pick: ['_id', 'photoKey'],
                })
                return {
                  rows: page.edges.map((edge) => edge.node.photoKey),
                  next: page.pageInfo.hasNextPage
                    ? page.pageInfo.endCursor
                    : null,
                }
              }),
            ),
          ).then((pages) => pages.flat())
        : [],
      user
        ? client.profile.findManyMine({ first: 1, pick: ['privacy'] })
        : null,
    ])
    return {
      counts,
      mine: new Set(mine),
      reposts: new Set(reposts),
      privacy: profile?.edges[0]?.node.privacy ?? 'public',
    }
  }, [client, user?.id, revision, selection])
}
/** One aggregate and paged own-like read per list, shared by all its cards. */
export function Likes({
  photoKeys,
  children,
}: {
  photoKeys: string[]
  children: ReactNode
}) {
  const resource = useLikes(photoKeys)
  return <Context.Provider value={resource}>{children}</Context.Provider>
}
export function useCatchLikes(photoKey: string | null) {
  const context = useContext(Context)
  if (!context) throw new Error('Catch actions require Likes')
  return {
    count: context.data?.counts.get(photoKey ?? '') ?? 0,
    mine: context.data?.mine.has(photoKey) ?? false,
    reposted: context.data?.reposts.has(photoKey) ?? false,
    privacy: context.data?.privacy ?? 'public',
    busy: context.busy,
    error: context.error,
    reload: context.reload,
  }
}
