import { activeCaptureTags } from './captures'
import { readFeed, type Encounter, type AppClient } from './data'
import { cursorSource, mergedSource, type PageSource } from './paging'
import { myFollowing } from './follows'
const pieces = <T>(values: T[], size = 100) =>
  Array.from({ length: Math.ceil(values.length / size) }, (_, i) =>
    values.slice(i * size, (i + 1) * size),
  )

export { collectPages } from './paging'
import { collectPages } from './paging'
export async function followingSource(
  client: AppClient,
  me: string,
  locale?: string,
): Promise<PageSource<Encounter>> {
  const [profiles, cats] = await Promise.all([
    // A follow is on once the user asked accepted it.
    myFollowing(client, me),
    collectPages(async (after) => {
      const p = await client['cat-follow'].findMany({
        first: 100,
        after,
        where: { ownerId: { eq: me } },
        pick: ['_id', 'catKey'],
      })
      return {
        rows: p.edges.map((e) => e.node.catKey),
        next: p.pageInfo.hasNextPage ? p.pageInfo.endCursor : null,
      }
    }),
  ])
  const people = [
    ...new Set([me, ...profiles.filter((id): id is string => !!id)]),
  ]
  const catIds = [...new Set(cats.filter((id): id is string => !!id))]
  return mergedSource([
    ...pieces(people).map(
      (ids) => (after?: string) =>
        readFeed(client, {
          locale,
          after,
          visible: true,
          where: { ownerId: { in: ids } },
        }),
    ),
    ...pieces(catIds).map(
      (ids) => (after?: string) =>
        readFeed(client, { locale, after, where: { catKey: { in: ids } } }),
    ),
    ...pieces(catIds).map(ids => async (after?: string) => {
      const tags = await client['capture-cat-tag'].findMany({ first: 24, after,
        where: { ...activeCaptureTags, catKey: { in: ids } }, orderBy: [{ capturedAt: 'DESC' }], pick: ['_id', 'photoKey'],
      })
      const keys = [...new Set(tags.edges.flatMap(({ node }) => node.photoKey ? [node.photoKey] : []))]
      const rows = keys.length ? await collectPages(cursor => readFeed(client, { after: cursor, locale, originals: true, visible: true, where: { photoKey: { in: keys } } })) : []
      return { rows: rows.filter(row => row.cats?.some(cat => ids.includes(cat.catId))), next: tags.pageInfo.hasNextPage ? tags.pageInfo.endCursor : null }
    }),
  ])
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Unexpected like counts response.')
  return value as Record<string, unknown>
}
export function likeGroups(value: unknown) {
  const aggregate = record(record(value).captureLikeAggregate)
  if (
    typeof aggregate.truncated !== 'boolean' ||
    !Array.isArray(aggregate.groups)
  )
    throw new Error('Unexpected like counts response.')
  const groups = aggregate.groups.map((value) => {
    const group = record(value)
    if (
      (group.key !== null && typeof group.key !== 'string') ||
      typeof group.count !== 'number' ||
      !Number.isSafeInteger(group.count) ||
      group.count < 0
    )
      throw new Error('Unexpected like counts response.')
    return { key: group.key as string | null, count: group.count }
  })
  return { groups, truncated: aggregate.truncated }
}
/** Raw is the SDK's documented escape hatch for nested aggregate selections. */
export async function readLikeCounts(
  client: AppClient,
  photoKeys: string[],
  since?: string,
) {
  const groups = await Promise.all(
    pieces([...new Set(photoKeys)]).map(async (keys) => {
      const result = likeGroups(
        await client.raw(
          `query Likes($keys: [String]${since ? ', $since: DateTime' : ''}) {
      captureLikeAggregate(where: {photoKey: {in: $keys}${since ? ', createdAt: {gte: $since}' : ''}}, groupBy: PHOTOKEY, limit: 100) { truncated groups { key count } }
    }`,
          { keys, ...(since ? { since } : {}) },
        ),
      )
      if (result.truncated)
        throw new Error('Like counts are incomplete. Try again.')
      return result.groups
    }),
  )
  return new Map(
    groups
      .flat()
      .filter((g): g is { key: string; count: number } => g.key !== null)
      .map((g) => [g.key, g.count]),
  )
}

/** Worldwide ranking uses all aggregate groups, then the period's unranked originals. */
export async function trendingSource(
  client: AppClient,
  since: string,
  locale?: string,
): Promise<PageSource<Encounter>> {
  const [aggregate, settings] = await Promise.all([
    client
      .raw(
        `query Trending($since: DateTime) {
      captureLikeAggregate(where: {createdAt: {gte: $since}}, groupBy: PHOTOKEY, limit: 1000) { truncated groups { key count } }
    }`,
        { since },
      )
      .then(likeGroups),
    client['app-settings'].findUnique({
      naturalKey: 'app',
      pick: ['_id', 'trendingPerCat'],
    }),
  ])
  if (aggregate.truncated)
    throw new Error(
      'The worldwide ranking is incomplete. Try a shorter period.',
    )
  const ranked = aggregate.groups
    .filter((g): g is { key: string; count: number } => !!g.key)
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key))
    .map((g) => g.key)
  const perCat = Math.max(1, settings?.trendingPerCat ?? 2)
  let index = 0,
    waiting: Encounter[] = [],
    after: string | undefined,
    restDone = false,
    seen = new Set<string>(),
    shown = new Map<string, number>()
  return {
    async next() {
      let position = index,
        buffer = [...waiting],
        cursor = after,
        done = restDone
      const visited = new Set(seen),
        counts = new Map(shown),
        rows: Encounter[] = []
      let reads = 0
      while (rows.length < 24) {
        if (!buffer.length) {
          if (++reads > 200)
            throw new Error('Too many pages to rank. Try a shorter period.')
          if (position < ranked.length) {
            const keys = ranked.slice(position, position + 50)
            const posts = await collectPages((next) =>
              readFeed(client, {
                locale,
                after: next,
                originals: true,
                where: { photoKey: { in: keys }, postedAt: { gte: since } },
              }),
            )
            const order = new Map(keys.map((key, i) => [key, i]))
            buffer = posts.sort(
              (a, b) =>
                (order.get(a.photoKey ?? '') ?? Infinity) -
                (order.get(b.photoKey ?? '') ?? Infinity),
            )
            position += keys.length
          } else if (!done) {
            const page = await readFeed(client, {
              locale,
              after: cursor,
              originals: true,
              where: { postedAt: { gte: since } },
            })
            if (page.next && page.next === cursor)
              throw new Error('The ranking did not advance.')
            buffer = page.rows
            cursor = page.next ?? undefined
            done = !page.next
          } else break
        }
        const row = buffer.shift()
        if (!row) continue
        const photo = row.photoKey ?? row.id,
          cats = row.cats?.map(cat => cat.catId) ?? [row.catId ?? row.id]
        if (visited.has(photo)) continue
        visited.add(photo)
        if (cats.some(cat => (counts.get(cat) ?? 0) >= perCat)) continue
        for (const cat of cats) counts.set(cat, (counts.get(cat) ?? 0) + 1)
        rows.push(row)
      }
      index = position
      waiting = buffer
      after = cursor
      restDone = done
      seen = visited
      shown = counts
      return {
        rows,
        next: buffer.length || index < ranked.length || !done ? 'more' : null,
      }
    },
  }
}
export const latestSource = (
  client: AppClient,
  mine?: string,
  locale?: string,
) => cursorSource((after) => readFeed(client, { locale, after, mine }))

/** Native Nearby parity: paged post locations, readable originals, period likes and per-cat cap. */
export async function nearbyTrendingSource(
  client: AppClient,
  center: { lat: number; lng: number },
  radiusMeters: number,
  since: string,
  locale?: string,
): Promise<PageSource<Encounter>> {
  const ids = await collectPages(async (after) => {
    const page = record(
      await client.ns.search.searchByLocation({
        lat: center.lat,
        lng: center.lng,
        radiusMeters,
        modelKey: 'capture-post',
        key: 'area',
        first: 100,
        after,
      }),
    )
    const info = record(page.pageInfo)
    if (
      !Array.isArray(page.edges) ||
      typeof info.hasNextPage !== 'boolean' ||
      (info.hasNextPage && typeof info.endCursor !== 'string')
    )
      throw new Error('Unexpected nearby page.')
    return {
      rows: page.edges.map((edge) => {
        const id = record(record(edge).node).recordId
        if (typeof id !== 'string') throw new Error('Unexpected nearby post.')
        return id
      }),
      next: info.hasNextPage ? String(info.endCursor) : null,
    }
  })
  const posts = (
    await Promise.all(
      pieces([...new Set(ids)]).map((ids) =>
        collectPages((after) =>
          readFeed(client, {
            after,
            locale,
            originals: true,
            where: { id: { in: ids }, postedAt: { gte: since } },
          }),
        ),
      ),
    )
  ).flat()
  const [likes, settings] = await Promise.all([
    readLikeCounts(
      client,
      posts.flatMap((post) => (post.photoKey ? [post.photoKey] : [])),
      since,
    ),
    client['app-settings'].findUnique({
      naturalKey: 'app',
      pick: ['_id', 'trendingPerCat'],
    }),
  ])
  const perCat = Math.max(1, settings?.trendingPerCat ?? 2),
    counts = new Map<string, number>(),
    seen = new Set<string>()
  const board = posts
    .sort(
      (a, b) =>
        (likes.get(b.photoKey ?? '') ?? 0) -
          (likes.get(a.photoKey ?? '') ?? 0) ||
        Date.parse(b.postedAt ?? '') - Date.parse(a.postedAt ?? '') ||
        a.id.localeCompare(b.id),
    )
    .filter((post) => {
      if (seen.has(post.id)) return false
      seen.add(post.id)
      const cats = post.cats?.map(cat => cat.catId) ?? [post.catId ?? post.id]
      if (cats.some(cat => (counts.get(cat) ?? 0) >= perCat)) return false
      for (const cat of cats) counts.set(cat, (counts.get(cat) ?? 0) + 1)
      return true
    })
  let shown = 0
  return {
    next: async () => {
      const rows = board.slice(shown, shown + 24)
      shown += rows.length
      return { rows, next: shown < board.length ? 'more' : null }
    },
  }
}
