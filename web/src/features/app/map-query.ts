import { activeCaptureTags, readCanonicalPhotos } from './captures'
import type { AppClient, Encounter } from './data'
import { readFeed } from './data'
import { viewerBlocks } from './safety-data'
import { collectPages, likeGroups } from './feed-sources'
import { appImage } from './media'
import {
  cellBounds,
  intersects,
  viewportPlan,
  type Cell,
  type Viewport,
} from './viewport'
const pieces = <T>(values: T[], size = 100) =>
  Array.from({ length: Math.ceil(values.length / size) }, (_, i) =>
    values.slice(i * size, (i + 1) * size),
  )
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Unexpected location search response.')
  return value as Record<string, unknown>
}
export function locationPage(value: unknown) {
  const page = object(value),
    info = object(page.pageInfo)
  if (
    !Array.isArray(page.edges) ||
    typeof info.hasNextPage !== 'boolean' ||
    (info.endCursor !== null && typeof info.endCursor !== 'string')
  )
    throw new Error('Unexpected location search page.')
  const rows = page.edges
    .map((edge) => {
      const node = object(object(edge).node),
        content = object(node.content)
      const reference =
        content.cat &&
        typeof content.cat === 'object' &&
        !Array.isArray(content.cat)
          ? object(content.cat)
          : null
      const key = content.catKey ?? reference?.id
      if (
        typeof node.recordId !== 'string' ||
        (key != null && typeof key !== 'string')
      )
        throw new Error('Unexpected location search result.')
      return typeof key === 'string' ? key : null
    })
    .filter((key): key is string => !!key)
  if (info.hasNextPage && !info.endCursor)
    throw new Error('The location search has no continuation cursor.')
  return { rows, next: info.hasNextPage ? String(info.endCursor) : null }
}

/** Cats tagged near here; readable active associations are verified during hydration. */
export async function nearbyCatKeys(client: AppClient, center: { lat: number; lng: number }, radiusMeters: number) {
  const keys = await collectPages(async after => locationPage(await client.ns.search.searchByLocation({
    ...center, radiusMeters, modelKey: 'capture-cat-tag', key: 'area', first: 100, after,
  })))
  return [...new Set(keys)]
}

/** Find candidate cats by location, then their newest readable photo anywhere. */
export async function latestForCats(
  client: AppClient,
  keys: string[],
  locale?: string,
) {
  const blocked = await viewerBlocks(client)
  const latest = []
  for (const ids of pieces([...new Set(keys)])) {
    const pending = new Set(ids)
    const seen = new Set<string>()
    let after: string | undefined
    for (let i = 0; i < 200 && pending.size; i++) {
      const page = await client['capture-cat-tag'].findMany({ first: 100, after,
        where: { ...activeCaptureTags, catKey: { in: ids } }, orderBy: [{ capturedAt: 'DESC' }],
        pick: ['_id', '_ownerId', 'photoKey', 'catKey', 'revision'],
      })
      const captures = await readCanonicalPhotos(client, page.edges.flatMap(({ node }) => node.photoKey ? [node.photoKey] : []))
      const byId = new Map(captures.map(capture => [capture._id, capture]))
      for (const { node: tag } of page.edges) {
        const capture = byId.get(tag.photoKey ?? '')
        if (!capture || (capture._ownerId && blocked.has(capture._ownerId)) || !tag.catKey || !pending.has(tag.catKey) || capture.tagRevision !== tag.revision || capture._ownerId !== tag._ownerId ||
          !capture.area || typeof capture.area.lat !== 'number' || typeof capture.area.lng !== 'number') continue
        pending.delete(tag.catKey)
        latest.push({ ...capture, catKey: tag.catKey })
      }
      if (!page.pageInfo.hasNextPage || !pending.size) break
      const next = page.pageInfo.endCursor
      if (!next || seen.has(next)) throw new Error('The tagged sightings did not advance.')
      seen.add(next)
      after = next
      if (i === 199) throw new Error('Too many sightings to load completely. Zoom in.')
    }
  }
  const [cats, posts] = await Promise.all([
    Promise.all(
      pieces(latest.flatMap((row) => (row.catKey ? [row.catKey] : []))).map(
        (ids) =>
          collectPages(async (after) => {
            const page = await client.cat.findMany({
              locale,
              first: 100,
              after,
              where: { id: { in: ids } },
              pick: ['_id', 'name'],
            })
            return {
              rows: page.edges.map((e) => e.node),
              next: page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null,
            }
          }),
      ),
    ),
    Promise.all(
      pieces(latest.map((row) => row._id)).map((ids) =>
        collectPages((after) =>
          readFeed(client, {
            after,
            originals: true,
            visible: true,
            where: { photoKey: { in: ids } },
          }),
        ),
      ),
    ),
  ])
  const names = new Map(cats.flat().map((cat) => [cat._id, cat.name])),
    byPhoto = new Map(posts.flat().map((row) => [row.photoKey, row]))
  return latest
    .map((photo): Encounter => {
      const post = byPhoto.get(photo._id)
      return {
        ...post,
        id: photo._id,
        photoKey: photo._id,
        catId: photo.catKey,
        cat: names.get(photo.catKey ?? '') || '',
        photo: appImage(photo.photo),
        area: { lat: photo.area!.lat!, lng: photo.area!.lng! },
        postedAt: photo._createdAt,
        authorId: post?.authorId ?? null,
        author: post?.author ?? '',
        avatar: post?.avatar ?? null,
        art: post?.art ?? null,
        note: post?.note ?? null,
        audience: post?.audience ?? null,
        reshare: false,
      }
    })
    .sort((a, b) => (b.postedAt ?? '').localeCompare(a.postedAt ?? ''))
}

export async function readViewport(
  client: AppClient,
  bounds: Viewport,
  locale?: string,
): Promise<{ rows: Encounter[]; cells: Cell[] }> {
  const plan = viewportPlan(bounds)
  if (!plan.wide) {
    const keys = await nearbyCatKeys(client, { lat: plan.lat, lng: plan.lng }, plan.radius)
    return { rows: await latestForCats(client, keys, locale), cells: [] }
  }
  const field = `cell${plan.precision}`,
    parent = `cell${plan.precision - 1}`
  // Eight parent cells have at most 256 children, below the 500-group cap.
  // Aggregates have no cursor, so partition by parent instead of truncating.
  const batches = plan.prefixes.length ? pieces(plan.prefixes, 8) : [null]
  const aggregated: Array<{ key: string | null; count: number }> = []
  for (const prefixes of batches) {
    const value = await client.raw(
      `query Areas($where: CatWhereInput, $group: CatAggregatableField!) {
        catAggregate(where: $where, groupBy: $group, limit: 500) { truncated groups { key count } }
      }`,
      {
        where: prefixes ? { [parent]: { in: prefixes } } : null,
        group: field.toUpperCase(),
      },
    )
    const result = likeGroups({
      captureLikeAggregate: object(value).catAggregate,
    })
    if (result.truncated)
      throw new Error('Area counts are incomplete. Zoom in and try again.')
    aggregated.push(...result.groups)
  }
  const groups = aggregated.filter(
    (group): group is { key: string; count: number } =>
      !!group.key &&
      group.key.length === plan.precision &&
      /^[0123456789bcdefghjkmnpqrstuvwxyz]+$/.test(group.key) &&
      intersects(plan.box, cellBounds(group.key)),
  )
  const settings = await client['app-settings'].findUnique({
    naturalKey: 'app',
    pick: ['_id', 'clusterAt'],
  })
  const clusterAt = Math.max(2, settings?.clusterAt ?? 10)
  const cells = groups
    .filter((group) => group.count >= clusterAt)
    .map((group) => {
      const box = cellBounds(group.key)
      return {
        hash: group.key,
        count: group.count,
        lat: (box.south + box.north) / 2,
        lng: (box.west + box.east) / 2,
        bounds: box,
      }
    })
  const sparse = groups
    .filter((group) => group.count < clusterAt)
    .map((group) => group.key)
  const keys = (
    await Promise.all(
      pieces(sparse).map((ids) =>
        collectPages(async (after) => {
          const page = await client.cat.findMany({
            first: 100,
            after,
            where: { [field]: { in: ids } },
            pick: ['_id'],
          })
          return {
            rows: page.edges.map((edge) => edge.node._id),
            next: page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null,
          }
        }),
      ),
    )
  ).flat()
  return { rows: await latestForCats(client, keys, locale), cells }
}
