import { verifiedChallengeKeys } from './challenges'
import { readPostHighlights } from './post-highlights'
import type { PostHighlight } from '../../lib/post-highlights'
import { readCaptureAssociations, type NamedCaptureTag } from './captures'
import { collectConnection } from './paging'
import { appImage, type ProgressiveImageSource } from './media'
import type { createWebsiteClients } from '~/lib/foir'
import { viewerBlocks, allowedEncounter } from './safety-data'
export type AppClient = ReturnType<typeof createWebsiteClients>['foir']
export interface Encounter {
  id: string
  photoKey: string | null
  authorId: string | null
  catId: string | null
  cat: string
  author: string
  avatar: ProgressiveImageSource | null
  photo: ProgressiveImageSource | null
  art: ProgressiveImageSource | null
  note: string | null
  postedAt: string | null
  audience: string | null
  repostedBy?: {
    id: string
    name: string
    avatar: ProgressiveImageSource | null
  }
  originalPostId?: string
  cats?: NamedCaptureTag[]
  captureRevision?: string
  highlightKeys?: string[]
  highlights?: PostHighlight[]
  reshare: boolean
  area: { lat: number; lng: number } | null
}
const notNull = <T>(value: T | null | undefined): value is T => value != null
/** The API applies record visibility for this key and, when present, its user session. */
export async function readFeed(
  foir: AppClient,
  options: {
    after?: string
    mine?: string
    originals?: boolean
    cat?: string
    owner?: string
    where?: Record<string, unknown>
    visible?: boolean
    locale?: string
    includeBlocked?: boolean
  } = {},
) {
  const blocked = await viewerBlocks(foir)
  const page = await foir['capture-post'].findMany({
    first: 24,
    after: options.after,
    where: {
      ...(options.mine
        ? { ownerId: { eq: options.mine } }
        : options.visible
          ? {}
          : { audience: { eq: 'public' } }),
      ...(options.cat ? { catKey: { eq: options.cat } } : {}),
      ...(options.owner ? { ownerId: { eq: options.owner } } : {}),
      ...(options.originals ? { reshareOf: { isNull: true } } : {}),
      ...options.where,
    },
    orderBy: [{ postedAt: 'DESC' }],
    pick: [
      '_id',
      '_ownerId',
      'catKey',
      'photoKey',
      'area',
      'audience',
      'note',
      'comment',
      'reshareOf',
      'postedAt',
    ],
  })
  const posts = page.edges.map((edge) => edge.node)
  const highlightCatalog = await readPostHighlights(foir, options.locale).catch(() => null)
  const photos = [...new Set(posts.map((p) => p.photoKey).filter(notNull))]
  // Resolve only originals readable by this viewer; never attribute the photo to its reposter.
  const repostedPhotos = [
    ...new Set(
      posts
        .filter((p) => p.reshareOf)
        .map((p) => p.photoKey)
        .filter(notNull),
    ),
  ]
  const originals = repostedPhotos.length
    ? await collectConnection((after) =>
        foir['capture-post'].findMany({
          first: 100,
          after,
          where: {
            photoKey: { in: repostedPhotos },
            reshareOf: { isNull: true },
          },
          orderBy: [{ postedAt: 'DESC' }],
          pick: ['_id', '_ownerId', 'photoKey', 'reshareOf'],
        }),
      )
    : []
  const originalByPhoto = new Map(originals.map((p) => [p.photoKey, p]))
  const owners = [
    ...new Set([...posts, ...originals].map((p) => p._ownerId).filter(notNull)),
  ]
  const [artRows, profiles, cats, canonical] = await Promise.all([
    photos.length
      ? collectConnection((after) =>
          foir['catch-art'].findMany({
            first: 100,
            after,
            where: { photoKey: { in: photos } },
            pick: ['_id', 'photoKey', 'art'],
          }),
        )
      : [],
    owners.length
      ? collectConnection((after) =>
          foir.profile.findMany({
            first: 100,
            after,
            where: { ownerId: { in: owners } },
            pick: ['_id', '_ownerId', 'displayName', 'username', 'photo'],
          }),
        )
      : [],
    collectConnection((after) =>
      foir.cat.findMany({
        first: 100,
        after,
        locale: options.locale,
        where: {
          id: { in: [...new Set(posts.map((p) => p.catKey).filter(notNull))] },
        },
        pick: ['_id', 'name'],
      }),
    ),
    readCaptureAssociations(foir, photos, options.locale),
  ])
  const catById = new Map(cats.map((node) => [node._id, node.name]))
  const photoById = new Map(canonical.captures.map((node) => [node._id, appImage(node.photo)]))
  const artByPhoto = new Map(
    artRows.map((node) => [node.photoKey, appImage(node.art)]),
  )
  const profileById = new Map(profiles.map((node) => [node._ownerId, node]))
  // Captures become readable only after finalization. Preserve the source
  // cursor even when an interrupted save leaves this page with no rows.
  const readablePosts = posts.filter(post => photoById.has(post.photoKey ?? ''))
  const rows: Encounter[] = readablePosts.map((p) => {
    const original = p.reshareOf ? originalByPhoto.get(p.photoKey) : p
    const authorId = original && !original.reshareOf ? original._ownerId : null
    const author = authorId ? profileById.get(authorId) : null
    const reposter = profileById.get(p._ownerId)
    const capture = canonical.captures.find(capture => capture._id === p.photoKey)
    const area =
      p.area && typeof p.area.lat === 'number' && typeof p.area.lng === 'number'
        ? { lat: p.area.lat, lng: p.area.lng }
        : null
    return {
      id: p._id,
      photoKey: p.photoKey,
      authorId,
      originalPostId:
        original && !original.reshareOf ? original._id : undefined,
      ...(p.reshareOf && p._ownerId
        ? {
            repostedBy: {
              id: p._ownerId,
              name:
                reposter?.username || reposter?.displayName || '',
              avatar: appImage(reposter?.photo),
            },
          }
        : {}),
      cats: canonical.tags.get(p.photoKey ?? ''),
      highlightKeys: verifiedChallengeKeys(capture?.challengeHighlights),
      ...(highlightCatalog ? { highlights: highlightCatalog } : {}),
      captureRevision: capture?.tagRevision ?? undefined,
      catId: p.catKey,
      cat: catById.get(p.catKey ?? '') || '',
      author: author?.username || author?.displayName || '',
      avatar: appImage(author?.photo),
      photo: photoById.get(p.photoKey ?? '') ?? null,
      art: artByPhoto.get(p.photoKey ?? '') ?? null,
      note: p.comment || p.note,
      postedAt: p.postedAt,
      audience: p.audience,
      reshare: !!p.reshareOf,
      area,
    }
  })
  return {
    rows: options.includeBlocked ? rows : rows.filter(row => allowedEncounter(row, blocked)),
    total: page.totalCount,
    next: page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null,
  }
}
/** This query never requests a capture's neighbourhood coordinate or its author. */
export async function readWorldActivity(foir: AppClient) {
  const [cats, captures] = await Promise.all([
    foir.cat.findMany({ first: 1, pick: ['_id'] }),
    foir['capture-post'].findMany({
      first: 16,
      where: { audience: { eq: 'public' }, reshareOf: { isNull: true } },
      orderBy: [{ postedAt: 'DESC' }],
      pick: ['_id', 'postedAt', 'worldCell', 'catKey', 'photoKey'],
    }),
  ])
  // Older captures use the cat’s first-discovery region, also three characters.
  // No neighbourhood coordinates are requested by the homepage.
  const names = await foir.cat.findMany({
    first: 100,
    where: {
      id: { in: captures.edges.map((e) => e.node.catKey).filter(notNull) },
    },
    pick: ['_id', 'name', 'cell3'],
  })
  const byId = new Map(names.edges.map((e) => [e.node._id, e.node]))
  const latestPhotoKey = captures.edges[0]?.node.photoKey
  const latestPhoto = latestPhotoKey
    ? await foir['capture-photo'].findMany({ first: 1, where: { id: { eq: latestPhotoKey }, state: { eq: 'ready' } }, pick: ['_id', 'photo'] })
    : null
  return {
    latestPhoto: appImage(latestPhoto?.edges[0]?.node.photo),
    cats: cats.totalCount,
    catches: captures.totalCount,
    recent: captures.edges.map((e) => ({
      id: e.node._id,
      name: byId.get(e.node.catKey ?? '')?.name || '',
      postedAt: e.node.postedAt,
      cell: e.node.worldCell || byId.get(e.node.catKey ?? '')?.cell3 || null,
    })),
  }
}
export type WorldActivity = Awaited<ReturnType<typeof readWorldActivity>>

/** Data reads keep unknown names empty. Product labels resolve at the current
 * locale/provider boundary rather than freezing English into query results. */
export function encounterCopy(row: Encounter, copy: (key:string)=>string): Encounter {
  return {...row,cat:row.cat || copy('cat.unnamed'),author:row.author || copy('profile.user'),
    ...(row.repostedBy?{repostedBy:{...row.repostedBy,name:row.repostedBy.name || copy('profile.user')}}:{}),
    ...(row.cats?{cats:row.cats.map(cat=>({...cat,name:cat.name || copy('cat.unnamed')}))}:{})}
}
