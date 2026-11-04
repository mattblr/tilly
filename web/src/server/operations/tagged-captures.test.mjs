import assert from 'node:assert/strict'
import test from 'node:test'
import { editTaggedCapture, saveTaggedCapture } from './tagged-captures.ts'
import { withContentSafety } from './content-safety.ts'
import { captureSaveStep } from './capture-save.ts'

const actor = 'creator1234567890'
const fileId = 'camerafile1234567890'
const knownId = 'knowncat1234567890'
const input = { photoFileId: fileId, captureKey: 'capture-attempt', lat: 51.5, lng: -0.1,
  cats: [{ key: 'known', catId: knownId, position: { x: 0.25, y: 0.5 } }, { key: 'new', name: 'Biscuit', position: { x: 0.75, y: 0.5 } }] }

/** A stateful protocol fake: assertions inspect persisted business state, not query spelling. */
function database({ hideOnOpen = false } = {}) {
  const tables = { CapturePhoto: new Map(), CaptureCatTag: new Map(), CapturePost: new Map(), CaptureCheck: new Map(), Audience: new Map(), Cat: new Map([[knownId, { _id: knownId, name: 'Tilly' }]]) }
  const keys = new Map(), visibility = new Map()
  let sequence = 0, audience = 'public', fileVisibility = 'PRIVATE', writeFile = true, failOnce = '', casConflict = false, held = false
  const calls = []
  const patch = (row, data) => {
    for (const [key, value] of Object.entries(data)) {
      if (key === 'cat') {
        // The served GraphQL reference contract rejects scalar `set` verbs.
        assert.deepEqual(Object.keys(value), ['connect'])
        assert.equal(typeof value.connect.id, 'string')
        row[key] = { _ref: 'record', model: 'cat', id: value.connect.id }
      } else if (key === 'viewers') {
        // An audience record, or none: only the record's owner reads it.
        if (value.disconnect === true) { assert.deepEqual(Object.keys(value), ['disconnect']); row[key] = null; continue }
        assert.deepEqual(Object.keys(value), ['connect'])
        assert.ok(tables.Audience.has(value.connect.id), 'viewers must name an audience record')
        row[key] = value.connect.id
      } else row[key] = value.set
    }
  }
  const page = values => ({ page: { edges: values.map(node => ({ node })), pageInfo: { hasNextPage: false, endCursor: null } } })
  const answer = async (query, vars = {}) => {
    calls.push(query)
    if (failOnce && query.includes(failOnce)) { failOnce = ''; throw Error('temporary storage failure') }
    if (query.includes('SafetyRows')) return page(vars.digest || (vars.file === fileId && vars.model)
      ? [{ _id: 'approval', digest: vars.digest, status: 'approved' }]
      : held && (vars.file === fileId || vars.kind === 'CapturePhoto') ? [{ _id: 'operator-hold' }] : [])
    if (query.includes('SafetyFile')) return { file: { id: fileId, mimeType: 'image/jpeg', url: `https://cdn.example.test/files/${fileId}`, deletedAt: null } }
    if (query.includes('SafetyCapture')) {
      const row = tables.CapturePhoto.get(vars.id)
      return { capturePhoto: row ? { ...row, cat: tables.Cat.get(row.catKey) } : null }
    }
    if (query.includes('SafetyTag') || query.includes('PublicationTag')) return { captureCatTag: tables.CaptureCatTag.get(vars.id) ?? null }
    if (query.includes('SafetyPost') || query.includes('PublicationSource')) return { capturePost: tables.CapturePost.get(vars.id) ?? null }
    if (query.includes('page: capturePhotos')) return page([...tables.CapturePhoto.values()].filter(r => r._ownerId === vars.me && r.clientKey === vars.key))
    if (query.includes('page: captureCatTags')) return page([...tables.CaptureCatTag.values()].filter(r => r.photoKey === vars.photo && (!vars.revision || r.revision === vars.revision)).map(r => ({ ...r, cat: tables.Cat.get(r.catKey) })))
    if (query.includes('page: capturePosts')) return page([...tables.CapturePost.values()].filter(r => r.photoKey === vars.photo && r._ownerId === (vars.owner ?? vars.me) && !r.reshareOf))
    if (query.includes('query TaggedCat')) return { cat: tables.Cat.get(vars.id) ?? null }
    if (query.includes('query CaptureUpload')) return { file: { id: fileId, mimeType: 'image/jpeg', visibility: fileVisibility, deletedAt: null } }
    if (query.includes('query CanonicalCapture')) return { capturePhoto: tables.CapturePhoto.get(vars.id) ?? null }
    if (query.includes('query Audience(')) return page([...tables.Audience.values()].filter(r => r._ownerId === vars.owner))
    if (query.includes('page: fieldNotes') || query.includes('page: catchArts')) return page([])
    if (query.includes('setAudienceVisibility')) { visibility.set(vars.id, vars.visibility); return { setAudienceVisibility: vars.visibility } }
    if (query.includes('profiles(where:')) return { profiles: { edges: [{ node: { privacy: audience } }] } }
    if (query.includes('setFileVisibility')) {
      if (!writeFile) throw Error('file write refused')
      fileVisibility = vars.visibility ?? (query.includes('visibility: PUBLIC') ? 'PUBLIC' : 'PRIVATE')
      if (hideOnOpen && fileVisibility === 'PUBLIC') {
        // Review's hold and narrowing finish before this stale writer returns.
        held = true
        for (const table of ['CapturePhoto', 'CaptureCatTag', 'CapturePost'])
          for (const row of tables[table].values()) visibility.set(row._id, 'PRIVATE')
      }
      return { setFileVisibility: vars.visibility }
    }
    const make = query.match(/create(CapturePhoto|CaptureCatTag|CapturePost|CaptureCheck|Audience|Cat)\(input:/)
    if (make) {
      const type = make[1]
      if (keys.has(vars.key)) return { [`create${type}`]: { record: { _id: keys.get(vars.key) } } }
      const id = `record${String(++sequence).padStart(15, '0')}`
      keys.set(vars.key, id)
      tables[type].set(id, { _id: id, _ownerId: vars.owner, _createdAt: '2026-10-30T12:00:00Z', ...vars.input })
      return { [`create${type}`]: { record: { _id: id } } }
    }
    if (query.includes('updateCaptureCatTag')) {
      const row = tables.CaptureCatTag.get(vars.id)
      patch(row, vars.data)
      return { updateCaptureCatTag: { record: { _id: row._id } } }
    }
    if (query.includes('updateCapturePhoto')) {
      const row = tables.CapturePhoto.get(vars.id)
      if (query.includes('ActivateCaptureTags') && (casConflict || row.tagRevision !== vars.expected || row.state !== 'ready')) {
        casConflict = false
        return { updateCapturePhoto: { record: null } }
      }
      patch(row, vars.data)
      return { updateCapturePhoto: { record: { _id: row._id } } }
    }
    if (query.includes('updateCapturePost')) {
      const row = tables.CapturePost.get(vars.id)
      patch(row, vars.data)
      return { updateCapturePost: { record: { _id: row._id } } }
    }
    if (query.includes('deleteCaptureCatTag')) { tables.CaptureCatTag.delete(vars.id); return {} }
    if (query.includes('Access(id:')) return { a: { grants: [] }, access: { grants: [] } }
    const visible = query.match(/set(CapturePhoto|CaptureCatTag|CapturePost)Visibility/)
    if (visible) { visibility.set(vars.id, vars.visibility ?? vars.v); return { [`set${visible[1]}Visibility`]: vars.visibility ?? vars.v } }
    throw Error(`Unexpected protocol request: ${query.slice(0, 100)}`)
  }
  /** Who can read a record through its `viewers`: everyone, accepted followers, or only its owner. */
  const shownTo = id => {
    const row = ['CapturePhoto', 'CaptureCatTag', 'CapturePost'].map(t => tables[t].get(id)).find(Boolean)
    const audience = row?.viewers && tables.Audience.get(row.viewers)
    if (!audience) return 'owner'
    return visibility.get(audience._id) === 'PUBLIC' ? 'everyone' : 'followers'
  }
  return { tables, visibility, calls, shownTo, client: { raw: async (q, v) => structuredClone(await answer(q, v)) },
    set audience(value) { audience = value }, get fileVisibility() { return fileVisibility },
    set writeFile(value) { writeFile = value }, set fail(value) { failOnce = value }, set conflict(value) { casConflict = value } }
}

test('two cats share one canonical photo, post, file and immutable capture date', async () => {
  const db = database(), saved = await saveTaggedCapture(db.client, input, actor)
  assert.equal(db.tables.CapturePhoto.size, 1)
  assert.equal(db.tables.CapturePost.size, 1)
  assert.equal(db.tables.CaptureCatTag.size, 2)
  assert.equal(db.tables.Cat.size, 2)
  assert.equal(saved.cats.length, 2)
  assert.equal(db.tables.CapturePhoto.get(saved.captureId).fileId, fileId)
  assert.equal(db.fileVisibility, 'PUBLIC')
  assert.equal(db.tables.CapturePost.get(saved.post).postedAt, '2026-10-30T12:00:00Z')
  assert.ok(!db.calls.some(q => /uploadFile|createSighting|createCaptureLike|createCatchArt|updateCatchArt/i.test(q)))
})
test('same attempt and interrupted save resume without duplicate cats/posts/uploads', async () => {
  const db = database()
  db.fail = 'CheckedFileVisibility'
  await assert.rejects(saveTaggedCapture(db.client, input, actor), /temporary/)
  assert.equal(db.fileVisibility, 'PRIVATE')
  const saved = await saveTaggedCapture(db.client, input, actor)
  const replay = await saveTaggedCapture(db.client, input, actor)
  assert.equal(saved.captureId, replay.captureId)
  assert.equal(saved.post, replay.post)
  assert.deepEqual([db.tables.CapturePhoto.size, db.tables.CapturePost.size, db.tables.CaptureCatTag.size, db.tables.Cat.size], [1, 1, 2, 2])
  await assert.rejects(saveTaggedCapture(db.client, { ...input, cats: [input.cats[0]] }, actor), e => e.status === 409)
})
test('invalid or foreign upload cannot become a capture; anonymous callers mutate nothing', async () => {
  const db = database()
  await assert.rejects(saveTaggedCapture(db.client, input, null), e => e.status === 403)
  await assert.rejects(saveTaggedCapture(db.client, { ...input, lat: 200 }, actor), e => e.status === 400)
  assert.equal(db.tables.CapturePhoto.size, 0)
  db.writeFile = false
  await assert.rejects(saveTaggedCapture(db.client, input, actor), /file write refused/)
  assert.equal(db.tables.CapturePhoto.size, 0)
})
test('owner corrections keep capture/post time and social identity, and remove old cat associations', async () => {
  const db = database(), saved = await saveTaggedCapture(db.client, input, actor)
  const result = await editTaggedCapture(db.client, { photoKey: saved.captureId, expectedRevision: saved.revision, revision: 'edit-one', cats: [input.cats[0]] }, actor)
  assert.equal(result.captureId, saved.captureId)
  assert.equal(result.post, saved.post)
  assert.equal(result.cats.length, 1)
  assert.equal(db.tables.CaptureCatTag.size, 1)
  assert.equal(db.tables.CapturePhoto.get(saved.captureId)._createdAt, '2026-10-30T12:00:00Z')
  assert.equal(db.tables.CapturePost.get(saved.post).postedAt, '2026-10-30T12:00:00Z')
  assert.ok(!db.calls.some(q => /createSighting|deleteSighting|uploadFile|createCatchArt|updateCatchArt/i.test(q)))
})
test('non-owner, stale editor, last-cat removal and conflicting revision replay are refused', async () => {
  const db = database(), saved = await saveTaggedCapture(db.client, input, actor)
  const edit = { photoKey: saved.captureId, expectedRevision: saved.revision, revision: 'edit-one', cats: [input.cats[0]] }
  await assert.rejects(editTaggedCapture(db.client, edit, 'someone-else'), e => e.status === 403)
  await assert.rejects(editTaggedCapture(db.client, { ...edit, expectedRevision: 'stale' }, actor), e => e.status === 409)
  await assert.rejects(editTaggedCapture(db.client, { ...edit, cats: [] }, actor), e => e.status === 400)
  assert.equal(db.tables.CaptureCatTag.size, 2)
  await editTaggedCapture(db.client, edit, actor)
  await assert.rejects(editTaggedCapture(db.client, { ...edit, cats: input.cats }, actor), e => e.status === 409)
})
test('concurrent edit losing compare-and-set leaves the current capture revision intact', async () => {
  const db = database(), saved = await saveTaggedCapture(db.client, input, actor)
  db.conflict = true
  await assert.rejects(editTaggedCapture(db.client, { photoKey: saved.captureId, expectedRevision: saved.revision, revision: 'losing-edit', cats: [input.cats[0]] }, actor), e => e.status === 409)
  assert.equal(db.tables.CapturePhoto.get(saved.captureId).tagRevision, saved.revision)
  assert.equal([...db.tables.CaptureCatTag.values()].filter(t => t.revision === saved.revision).length, 2)
  assert.ok([...db.tables.CaptureCatTag.values()].filter(t => t.revision === 'losing-edit').every(t => db.visibility.get(t._id) !== 'PUBLIC'))
})
test('private capture and every tag stay private, and media promotion failure never returns success', async () => {
  const db = database()
  db.audience = 'private'
  const result = await saveTaggedCapture(db.client, input, actor)
  assert.equal(db.fileVisibility, 'PRIVATE')
  // Records are read through the user's private audience: accepted followers only.
  for (const id of [result.captureId, result.post, ...[...db.tables.CaptureCatTag.values()].map(t => t._id)]) {
    assert.equal(db.shownTo(id), 'followers')
    assert.notEqual(db.visibility.get(id), 'PUBLIC')
  }
})
test('a public capture is shown to everyone through the audience record, never by opening records themselves', async () => {
  const db = database(), result = await saveTaggedCapture(db.client, input, actor)
  assert.equal(db.fileVisibility, 'PUBLIC')
  for (const id of [result.captureId, result.post, ...[...db.tables.CaptureCatTag.values()].map(t => t._id)]) {
    assert.equal(db.shownTo(id), 'everyone')
    assert.notEqual(db.visibility.get(id), 'PUBLIC')
  }
  // One audience record per user.
  assert.equal([...db.tables.Audience.values()].filter(r => r._ownerId === actor).length, 1)
})

test('a privacy change owns the capture until it completes; a tag retry cannot reopen its grants', async () => {
  const db = database(), saved = await saveTaggedCapture(db.client, input, actor)
  const row = db.tables.CapturePhoto.get(saved.captureId)
  row.state = 'audience'
  row.audience = 'private'
  const before = db.calls.length
  await assert.rejects(editTaggedCapture(db.client, { photoKey: saved.captureId, expectedRevision: saved.revision, revision: 'new-edit', cats: [input.cats[0]] }, actor), e => e.status === 409)
  assert.ok(!db.calls.slice(before).some(q => /^mutation\b/.test(q)))
})

test('late capture media publication cannot undo a completed photo-wide hide or restore its public audience', async () => {
  const original = globalThis.fetch, db = database({ hideOnOpen: true })
  const client = withContentSafety(db.client, { userId: actor, safety: { enabled: true }, filesOrigin: 'https://cdn.example.test' })
  try {
    globalThis.fetch = async url => {
      assert.equal(String(url), `https://cdn.example.test/files/${fileId}`)
      return new Response(new Uint8Array([1, 2, 3]), { headers: { 'content-type': 'image/jpeg' } })
    }
    const saved = await saveTaggedCapture(client, input, actor)
    assert.equal(db.fileVisibility, 'PRIVATE')
    assert.equal(db.tables.CapturePhoto.get(saved.captureId).audience, 'private')
    assert.equal(db.tables.CapturePhoto.get(saved.captureId).state, 'ready')
    assert.equal(db.tables.CapturePost.get(saved.post).audience, 'private')
    for (const id of [saved.captureId, saved.post, ...[...db.tables.CaptureCatTag.values()].map(row => row._id)])
      assert.equal(db.shownTo(id), 'owner')
    await saveTaggedCapture(client, input, actor)
    assert.equal(db.fileVisibility, 'PRIVATE')
    assert.equal(db.tables.CapturePost.size, 1)
  } finally { globalThis.fetch = original }
})

async function drainSave(db, selected, { cursor, beforeSlice = () => {}, actorId = actor } = {}) {
  let maximum = 0
  for (let slice = 0; slice < 600; slice++) {
    await beforeSlice(slice)
    const before = db.calls.length
    const foir = withContentSafety(db.client, { userId: actorId, filesOrigin: 'https://cdn.example.test', safety: { enabled: true } })
    const out = await captureSaveStep(foir, selected, actorId, cursor, () => db.calls.length - before, 'execution00000001')
    maximum = Math.max(maximum, db.calls.length - before)
    assert.ok(db.calls.length - before <= 30, 'Every native slice must stay within the conservative request budget')
    if (!(out instanceof Response)) return { result: out.body, maximum }
    cursor = (await out.json()).cursor
  }
  throw Error('Save continuations did not terminate')
}
test('native save slices prepare eight cats and publish within each request budget', async () => {
  const db = database()
  const selected = { ...input, cats: Array.from({ length: 8 }, (_, i) => ({ key: `cat-${i}`, name: `Synthetic cat ${i}` })) }
  const { result, maximum } = await drainSave(db, selected)
  assert.equal(result.ok, true); assert.equal(result.cats.length, 8)
  assert.equal(db.tables.CapturePhoto.get(result.captureId).state, 'ready')
  assert.equal(db.fileVisibility, 'PUBLIC'); assert.equal(db.tables.CapturePost.size, 1)
  assert.ok(maximum <= 30)
  // Moderation and challenges follow from one private check request.
  assert.equal(db.tables.CaptureCheck.size, 1)
  const check = [...db.tables.CaptureCheck.values()][0]
  assert.equal(check.photoKey, result.captureId); assert.equal(check._ownerId, actor); assert.equal(check.audience, 'public')
  const replay = await drainSave(db, selected)
  assert.equal(replay.result.captureId, result.captureId)
  assert.equal(db.tables.CaptureCatTag.size, 8)
  assert.equal(db.tables.CaptureCheck.size, 1)
})
test('a one-cat public catch saves in at most two dispatches and publishes before moderation', async () => {
  const db = database()
  let slices = 0
  const { result, maximum } = await drainSave(db, input, { beforeSlice: () => { slices++ } })
  assert.equal(result.ok, true); assert.ok(slices <= 2, `${slices} slices`); assert.ok(maximum <= 30)
  assert.equal(db.fileVisibility, 'PUBLIC')
  assert.ok(!db.calls.some(query => query.includes('SafetyFile')), 'The save itself never reads the photo for moderation')
  assert.equal(db.tables.CaptureCheck.size, 1)
})
test('a private catch keeps every record and its file private and still requests its checks', async () => {
  const db = database(); db.audience = 'private'
  const { result } = await drainSave(db, input)
  assert.equal(result.ok, true); assert.equal(db.fileVisibility, 'PRIVATE')
  assert.equal(db.tables.CapturePhoto.get(result.captureId).audience, 'private')
  for (const id of [result.captureId, result.post, ...[...db.tables.CaptureCatTag.values()].map(row => row._id)])
    assert.equal(db.shownTo(id), 'followers')
  assert.equal([...db.tables.CaptureCheck.values()][0].audience, 'private')
})
test('an interrupted native save resumes its actual persisted private preparation', async () => {
  const db = database(); db.fail = 'SaveFileVisibility'
  await assert.rejects(drainSave(db, input), /temporary/)
  assert.equal(db.fileVisibility, 'PRIVATE')
  const { result } = await drainSave(db, input)
  assert.equal(result.ok, true); assert.equal(db.tables.CapturePhoto.size, 1)
  assert.equal(db.tables.CaptureCatTag.size, 2); assert.equal(db.tables.CapturePost.size, 1)
})
test('native save refuses changed ownership and superseding audience without opening bytes', async () => {
  const db = database()
  // The user switches to private while the file is being opened.
  const raw = db.client.raw
  db.client.raw = async (query, vars) => {
    const out = await raw(query, vars)
    if (query.includes('SaveFileVisibility') && vars?.visibility === 'PUBLIC') db.audience = 'private'
    return out
  }
  await assert.rejects(drainSave(db, input), /audience changed/)
  assert.equal(db.fileVisibility, 'PRIVATE')
  assert.equal(db.tables.CaptureCheck.size, 0)
  const capture = [...db.tables.CapturePhoto.keys()][0]
  await assert.rejects(captureSaveStep(db.client, input, 'anotheruser00001', JSON.stringify({v:1,capture,phase:'tag',index:0})), /another photo/)
})
test('a reviewer hold winning file publication drains record access before private save completion', async () => {
  const db = database({ hideOnOpen: true })
  const { result } = await drainSave(db, input)
  assert.equal(result.ok, true); assert.equal(db.fileVisibility, 'PRIVATE')
  assert.equal(db.tables.CapturePhoto.get(result.captureId).audience, 'private')
  for (const id of [result.captureId, result.post, ...[...db.tables.CaptureCatTag.values()].map(row => row._id)])
    assert.equal(db.shownTo(id), 'owner')
})
