import type { AppClient } from './data'
import { collectConnection } from './paging'
import { captureCatTags, type CaptureCatTag } from '../../lib/capture-tags'

// Platform integration in progress: a nested capture.state filter returned no
// associations for a verified ready parent. Read the active candidates directly
// and validate the readable parent's state/revision/owner below. Replace this
// join when the nested predicate is verified; never relax record visibility.
export const activeCaptureTags = { active: { eq: true } }
const chunks = <T,>(values: T[]) => Array.from({ length: Math.ceil(values.length / 100) }, (_, i) => values.slice(i * 100, i * 100 + 100))

export async function readCanonicalPhotos(client: AppClient, keys: string[]) {
  return (await Promise.all(chunks([...new Set(keys)]).map(ids => collectConnection(after => client['capture-photo'].findMany({
    first: 100, after, where: { id: { in: ids }, state: { eq: 'ready' } },
    pick: ['_id', '_ownerId', '_createdAt', 'photo', 'tagRevision', 'area', 'audience', 'challengeHighlights'],
  }))))).flat()
}

export interface NamedCaptureTag extends CaptureCatTag { catId: string; name: string }
/** Active alone is insufficient: validate the parent revision as well, so an
 * abandoned or interrupted edit never leaks into a readable photo's labels. */
export async function readCaptureAssociations(client: AppClient, keys: string[], locale?: string) {
  const captures = await readCanonicalPhotos(client, keys)
  const byId = new Map(captures.map(capture => [capture._id, capture]))
  const tags = (await Promise.all(chunks(captures.map(capture => capture._id)).map(ids => collectConnection(after => client['capture-cat-tag'].findMany({
    first: 100, after, where: { ...activeCaptureTags, photoKey: { in: ids } },
    orderBy: [{ positionIndex: 'ASC' }],
    pick: ['_id', '_ownerId', 'photoKey', 'catKey', 'tagKey', 'revision', 'position', 'bounds', 'positionIndex'],
  }))))).flat().filter(tag => {
    const parent = byId.get(tag.photoKey ?? '')
    return parent && parent.tagRevision === tag.revision && parent._ownerId === tag._ownerId && tag.catKey && tag.tagKey
  })
  const cats = (await Promise.all(chunks([...new Set(tags.map(tag => tag.catKey!))]).map(ids => collectConnection(after => client.cat.findMany({
    first: 100, after, locale, where: { id: { in: ids } }, pick: ['_id', 'name'],
  }))))).flat()
  const names = new Map(cats.map(cat => [cat._id, cat.name]))
  const result = new Map<string, NamedCaptureTag[]>()
  for (const tag of tags) {
    const validated = captureCatTags([{ key: tag.tagKey, catId: tag.catKey,
      ...(tag.position ? { position: tag.position } : {}), ...(tag.bounds ? { bounds: tag.bounds } : {}) }])[0]
    const named = { ...validated, catId: tag.catKey!, name: names.get(tag.catKey!) ?? '' }
    result.set(tag.photoKey!, [...(result.get(tag.photoKey!) ?? []), named])
  }
  return { captures, tags: result }
}

/** Cat-story order follows capture time rather than the time of a correction. */
export async function readTaggedCatPhotos(client: AppClient, catId: string, after?: string) {
  const page = await client['capture-cat-tag'].findMany({ first: 20, after,
    where: { ...activeCaptureTags, catKey: { eq: catId } }, orderBy: [{ capturedAt: 'DESC' }],
    pick: ['_id', '_ownerId', 'photoKey', 'revision'],
  })
  const captures = await readCanonicalPhotos(client, page.edges.flatMap(({ node }) => node.photoKey ? [node.photoKey] : []))
  const tags = new Map(page.edges.map(({ node }) => [node.photoKey, node]))
  return { rows: captures.filter(capture => {
    const tag = tags.get(capture._id)
    return tag?.revision === capture.tagRevision && tag._ownerId === capture._ownerId
  }).sort((a, b) => b._createdAt.localeCompare(a._createdAt)),
    next: page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null }
}

/** Count validated canonical photos, including all candidate pages. A staged
 * association or stale edit revision must not inflate a cat's encounter count. */
export async function countTaggedCatPhotos(client: AppClient, catId: string, ownerId?: string) {
  const tags = await collectConnection(after => client['capture-cat-tag'].findMany({ first: 100, after,
    where: { ...activeCaptureTags, catKey: { eq: catId }, ...(ownerId ? { ownerId: { eq: ownerId } } : {}) },
    pick: ['_id', '_ownerId', 'photoKey', 'revision'],
  }))
  const captures = await readCanonicalPhotos(client, tags.flatMap(tag => tag.photoKey ? [tag.photoKey] : []))
  return captures.filter(capture => tags.some(tag => tag.photoKey === capture._id && tag.revision === capture.tagRevision && tag._ownerId === capture._ownerId)).length
}
