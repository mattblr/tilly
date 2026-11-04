import { captureCatTags, type CaptureCatTag } from '../../lib/capture-tags'
import { cells } from './area-cells'
import { worldCellOf } from '../../lib/location'
import { captureDigest, captureEditDigest, captureId, captureKey, CaptureRefusal, requireCaptureEditor, taggedCaptureInput } from './capture-contract'
import { all, createOwned } from './social'
import { chosenPrivacy, audienceFor, showCatch } from './audience'
import type { Audience, Area, QueryClient } from './types'
import { checkNewCatName } from './content-safety'

export interface CanonicalCapture {
  _id: string
  _ownerId: string
  _createdAt: string
  clientKey: string
  fileId: string
  payloadHash: string
  tagRevision: string
  state: string
  audience: Audience
  catKey: string | null
  editHash: string | null
  area: Area | null
}
export interface StoredCatTag extends CaptureCatTag {
  _id: string
  catKey: string
  revision: string
  positionIndex: number
  inputHash: string | null
  cat?: { _id: string; name: string } | null
}
const captureFields = '_id _ownerId _createdAt clientKey fileId payloadHash tagRevision state audience catKey editHash area { lat lng }'
const tagFields = '_id tagKey catKey revision positionIndex inputHash position bounds vector vectorModel cat { _id name }'
const reference = (model: string, id: string) => ({ _ref: 'record', model, id })
// Three decimals still meet Apple's Precise Location disclosure threshold.
const fuzz = (value: number) => Math.round(value * 1000) / 1000
async function digest(value: string) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join('')
}
export const updateCaptureState = async (foir: QueryClient, id: string, fields: Record<string, unknown>) => {
  const answer = await foir.raw<{ updateCapturePhoto: { record: { _id: string } | null } }>(
    'mutation CaptureState($id: ID, $data: CapturePhotoUpdateInput!) { updateCapturePhoto(where: { id: { eq: $id } }, data: $data) { record { _id } } }',
    { id, data: Object.fromEntries(Object.entries(fields).map(([key, value]) => [key,
      key === 'cat' ? { connect: { id: (value as { id: string }).id } } : { set: value },
    ])) },
  )
  if (!answer.updateCapturePhoto?.record?._id) throw new Error('The capture state could not be saved.')
}
const update = updateCaptureState
export async function canonicalCapture(foir: QueryClient, id: string): Promise<CanonicalCapture | null> {
  return (await foir.raw<{ capturePhoto: CanonicalCapture | null }>(
    `query CanonicalCapture($id: String) { capturePhoto(id: $id) { ${captureFields} } }`, { id },
  )).capturePhoto
}
export async function captureTags(foir: QueryClient, photoKey: string, revision?: string): Promise<StoredCatTag[]> {
  const tags = await all<StoredCatTag & { tagKey: string }>(foir, {
    field: 'captureCatTags', types: revision ? '$photo: String, $revision: String' : '$photo: String',
    where: `{ photoKey: { eq: $photo }${revision ? ', revision: { eq: $revision }' : ''} }`,
    vars: { photo: photoKey, ...(revision ? { revision } : {}) }, node: tagFields,
  })
  return tags.map(tag => ({ ...tag, key: tag.tagKey, catId: tag.catKey }))
    .sort((a, b) => a.positionIndex - b.positionIndex || a.key.localeCompare(b.key))
}
async function knownCats(foir: QueryClient, tags: CaptureCatTag[]) {
  for (const tag of tags) if (!tag.catId) {
    if (!await checkNewCatName(foir, tag.name ?? 'Cat'))
      throw new CaptureRefusal(409, 'This cat name needs review before entering the public directory. Choose another name or contact support.')
  } else {
    const answer = await foir.raw<{ cat: { _id: string } | null }>(
      'query TaggedCat($id: String) { cat(id: $id) { _id } }', { id: tag.catId },
    )
    if (!answer.cat) throw new CaptureRefusal(400, 'One of those cats is no longer available. Choose again.')
  }
}
async function keepTags(foir: QueryClient, capture: CanonicalCapture, revision: string, tags: CaptureCatTag[], offset = 0, sliced = false) {
  const existing = await captureTags(foir, capture._id, revision)
  if (!sliced && existing.some(tag => !tags.some(wanted => wanted.key === tag.key)))
    throw new CaptureRefusal(409, 'This edit revision already belongs to another cat selection.')
  const result: StoredCatTag[] = []
  for (const [position, tag] of tags.entries()) {
    const index = position + offset
    const inputHash = await digest(JSON.stringify(tag))
    const prior = existing.find(item => item.key === tag.key)
    if (prior) {
      if (prior.inputHash !== inputHash) throw new CaptureRefusal(409, 'This edit key was already used for different cats.')
      result.push(prior)
      continue
    }
    const key = `capture-${(await digest(`${capture._id}:${revision}:${tag.key}`)).slice(0, 40)}`
    let catId = tag.catId
    if (!catId) {
      const made = await foir.raw<{ createCat: { record: { _id: string } | null } }>(
        'mutation TaggedNewCat($input: CreateCatInput!, $key: String) { createCat(input: $input, idempotencyKey: $key) { record { _id } } }',
        { input: { name: tag.name, area: capture.area, ...(capture.area ? cells(capture.area) : {}) }, key: `${key}-cat` },
      )
      catId = made.createCat?.record?._id
      if (!catId) throw new Error('The new cat could not be saved.')
    }
    const id = await createOwned(foir, 'CaptureCatTag', {
      capture: reference('capture-photo', capture._id), cat: reference('cat', catId),
      photoKey: capture._id, catKey: catId, tagKey: tag.key, revision, positionIndex: index, inputHash, active: false, capturedAt: capture._createdAt,
      ...(tag.position ? { position: tag.position } : {}), ...(tag.bounds ? { bounds: tag.bounds } : {}),
      ...(tag.vector ? { vector: tag.vector, vectorModel: tag.vectorModel } : {}), area: capture.area,
    }, capture._ownerId, `${key}-tag`)
    result.push({ ...tag, _id: id, catId, catKey: catId, revision, positionIndex: index, inputHash })
  }
  return result
}
export async function originalPost(foir: QueryClient, capture: CanonicalCapture, firstCat: string) {
  const posts = await all<{ _id: string }>(foir, {
    field: 'capturePosts', where: '{ photoKey: { eq: $photo }, ownerId: { eq: $owner }, reshareOf: { isNull: true } }',
    types: '$photo: String, $owner: ID', vars: { photo: capture._id, owner: capture._ownerId }, node: '_id',
  })
  if (posts[0]) return posts[0]._id
  return createOwned(foir, 'CapturePost', {
    cat: reference('cat', firstCat), catKey: firstCat, photoKey: capture._id,
    area: capture.area, ...(capture.area ? { worldCell: worldCellOf(capture.area) } : {}),
    audience: capture.audience, postedAt: capture._createdAt,
  }, capture._ownerId, `capture-${capture._id}-post`)
}
async function activateTags(foir: QueryClient, tags: StoredCatTag[]) {
  for (const tag of tags) await foir.raw(
    'mutation ActivateCatAssociation($id: ID, $data: CaptureCatTagUpdateInput!) { updateCaptureCatTag(where: { id: { eq: $id } }, data: $data) { record { _id } } }',
    { id: tag._id, data: { active: { set: true } } },
  )
}
/** Marks the catch saved, then shows it by the one rule for catches
 * (audience.ts). Until that finishes, only its owner can see it. */
async function expose(foir: QueryClient, capture: CanonicalCapture, tags: StoredCatTag[]) {
  await activateTags(foir, tags)
  await update(foir, capture._id, { state: 'ready', cat: reference('cat', tags[0].catKey), catKey: tags[0].catKey })
  await showCatch(foir, await audienceFor(foir, capture._ownerId), capture, { records: true })
}
export const captureResult = (capture: CanonicalCapture, tags: StoredCatTag[], post: string) => ({
  catId: tags[0].catKey, captureId: capture._id, revision: capture.tagRevision,
  photo: { _id: capture._id }, post,
  cats: tags.map(tag => ({ key: tag.key, catId: tag.catKey, name: tag.cat?.name ?? tag.name, position: tag.position, bounds: tag.bounds })),
})
const saved = captureResult

/** One tag per native continuation, including a new name's safety check. */
export async function prepareCaptureTag(foir: QueryClient, capture: CanonicalCapture, tag: CaptureCatTag, index: number) {
  await knownCats(foir, [tag])
  return (await keepTags(foir, capture, capture.tagRevision, [tag], index, true))[0]
}

/** Called only with the data client built from this operation's verified dispatch. */
export async function beginTaggedCapture(foir: QueryClient, raw: Record<string, unknown>, actor: string | null | undefined) {
  if (!actor) throw new CaptureRefusal(403, 'Sign in to save your photo.')
  const input = taggedCaptureInput(raw), payloadHash = await captureDigest(input)
  const clientKey = `${actor}~${input.captureKey}`
  const matches = await all<CanonicalCapture>(foir, {
    field: 'capturePhotos', types: '$me: ID, $key: String', where: '{ ownerId: { eq: $me }, clientKey: { eq: $key } }',
    vars: { me: actor, key: clientKey }, node: captureFields,
  })
  if (matches.length > 1) throw new Error('The capture identity is ambiguous.')
  let capture = matches[0]
  if (capture && (capture._ownerId !== actor || capture.payloadHash !== payloadHash || capture.fileId !== input.photoFileId))
    throw new CaptureRefusal(409, 'This capture attempt already belongs to a different photo or selection.')
  if (!capture) {
    const file = (await foir.raw<{ file: { id: string; visibility: string; mimeType: string; deletedAt: string | null } | null }>(
      'query CaptureUpload($id: String!) { file(id: $id) { id visibility mimeType deletedAt } }', { id: input.photoFileId },
    )).file
    if (!file || file.deletedAt || file.visibility !== 'PRIVATE' || file.mimeType !== 'image/jpeg')
      throw new CaptureRefusal(400, 'Save a fresh private camera photo before tagging cats.')
    // A readable file is insufficient authority: the platform must also accept
    // this caller's file write before it can become the caller's capture.
    await foir.raw('mutation OwnCaptureUpload($id: ID!) { setFileVisibility(id: $id, visibility: PRIVATE) }', { id: input.photoFileId })
    const audience = await chosenPrivacy(foir, actor)
    const id = await createOwned(foir, 'CapturePhoto', {
      photo: input.photoFileId, fileId: input.photoFileId, clientKey, payloadHash,
      tagRevision: input.captureKey, state: 'saving', audience, area: { lat: fuzz(input.lat), lng: fuzz(input.lng) },
    }, actor, `capture-${(await digest(clientKey)).slice(0, 40)}`)
    const row = await canonicalCapture(foir, id)
    if (!row || row._ownerId !== actor || row.payloadHash !== payloadHash) throw new Error('The capture could not be read back safely.')
    capture = row
  }
  return { capture, input }
}

export async function saveTaggedCapture(foir: QueryClient, raw: Record<string, unknown>, actor: string | null | undefined) {
  const { capture, input } = await beginTaggedCapture(foir, raw, actor)
  await knownCats(foir, input.cats)
  if (capture.state === 'ready') {
    const tags = await captureTags(foir, capture._id, capture.tagRevision)
    if (!tags.length) throw new Error('The capture has no saved cat associations.')
    return saved(capture, tags, await originalPost(foir, capture, tags[0].catKey))
  }
  if (capture.tagRevision !== input.captureKey)
    throw new CaptureRefusal(409, 'Finish the active tag edit before retrying this save.')
  const tags = await keepTags(foir, capture, capture.tagRevision, input.cats)
  const post = await originalPost(foir, capture, tags[0].catKey)
  await update(foir, capture._id, { cat: reference('cat', tags[0].catKey), catKey: tags[0].catKey })
  await expose(foir, capture, tags)
  return saved(capture, tags, post)
}

export async function editTaggedCapture(foir: QueryClient, raw: Record<string, unknown>, actor: string | null | undefined) {
  const id = captureId(raw.photoKey), expected = captureKey(raw.expectedRevision), revision = captureKey(raw.revision)
  const capture = await canonicalCapture(foir, id)
  requireCaptureEditor(actor, capture ? { ownerId: capture._ownerId, revision: capture.tagRevision } : null, expected, revision)
  if (!capture) throw new CaptureRefusal(403, 'That capture is not yours.')
  if (capture.state !== 'ready' && !(capture.state === 'editing' && capture.tagRevision === revision))
    throw new CaptureRefusal(409, 'Finish saving this capture before editing its cats.')
  let cats: CaptureCatTag[]
  try { cats = captureCatTags(raw.cats) }
  catch (error) { throw new CaptureRefusal(400, error instanceof Error ? error.message : 'Choose the cats in this photo.') }
  const editHash = await captureEditDigest(cats)
  if (capture.tagRevision === revision && capture.editHash !== editHash)
    throw new CaptureRefusal(409, 'This edit revision already belongs to another cat selection.')
  await knownCats(foir, cats)
  const tags = await keepTags(foir, capture, revision, cats)
  if (capture.tagRevision !== revision) {
    const changed = await foir.raw<{ updateCapturePhoto: { record: { _id: string } | null } }>(
      'mutation ActivateCaptureTags($id: ID, $expected: String, $data: CapturePhotoUpdateInput!) { updateCapturePhoto(where: { id: { eq: $id }, tagRevision: { eq: $expected }, state: { eq: "ready" } }, data: $data) { record { _id } } }',
      { id, expected, data: { tagRevision: { set: revision }, editHash: { set: editHash }, state: { set: 'editing' }, cat: { connect: { id: tags[0].catKey } }, catKey: { set: tags[0].catKey } } },
    )
    if (!changed.updateCapturePhoto?.record?._id) throw new CaptureRefusal(409, 'The cats changed in another window. Reload before editing.')
  }
  for (const old of await captureTags(foir, id)) if (old.revision !== revision)
    await foir.raw('mutation RemoveOldCatTag($id: String!) { deleteCaptureCatTag(id: $id) }', { id: old._id })
  const posts = await all<{ _id: string }>(foir, { field: 'capturePosts', where: '{ ownerId: { eq: $me }, photoKey: { eq: $photo }, reshareOf: { isNull: true } }', types: '$me: ID, $photo: String', vars: { me: actor, photo: id }, node: '_id' })
  if (posts.length !== 1) throw new Error('The capture’s original post is unavailable.')
  await foir.raw('mutation RelabelTaggedPost($id: ID, $data: CapturePostUpdateInput!) { updateCapturePost(where: { id: { eq: $id } }, data: $data) { record { _id } } }',
    { id: posts[0]._id, data: { cat: { connect: { id: tags[0].catKey } }, catKey: { set: tags[0].catKey } } })
  await activateTags(foir, tags)
  await update(foir, id, { state: 'ready' })
  // New tags are seen by whoever sees the catch.
  await showCatch(foir, await audienceFor(foir, capture._ownerId), capture, { records: true })
  return { ok: true, ...saved({ ...capture, tagRevision: revision }, tags, posts[0]._id) }
}
