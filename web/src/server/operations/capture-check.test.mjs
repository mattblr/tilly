import test from 'node:test'
import assert from 'node:assert/strict'
import { withContentSafety } from './content-safety.ts'
import { checkCapture, runCaptureCheck } from './capture-check.ts'

const actor = 'user00000001', requestId = 'request0000001', captureId = 'capture0000001', fileId = 'file0000000001'
const ingress = { apiUrl: 'https://api.example.test', dispatch: { token: () => 'fixture-dispatch', context: 'operation=tilly.check-capture' },
  userId: actor, safety: { enabled: true }, challenges: { enabled: false }, filesOrigin: 'https://cdn.example.test' }
const envelope = (cursor) => ({ operationKey: 'tilly.check-capture', executionId: 'execution00000001', trigger: { type: 'lifecycle' },
  context: { userId: actor }, input: { recordId: requestId, modelKey: 'capture-check' }, ...(cursor ? { continuation: { cursor: JSON.stringify(cursor) } } : {}) })
const categories = ['sexual', 'violence', 'violence/graphic', 'self-harm', 'self-harm/intent', 'self-harm/instructions', 'sexual/minors', 'harassment', 'harassment/threatening', 'hate', 'hate/threatening', 'illicit', 'illicit/violent']
const verdict = flagged => ({ results: [{ flagged, categories: Object.fromEntries(categories.map(name => [name, flagged && name === 'violence'])),
  category_scores: Object.fromEntries(categories.map(name => [name, flagged && name === 'violence' ? 0.9 : 0.01])),
  category_applied_input_types: Object.fromEntries(categories.map(name => [name, ['text', 'image']])) }] })

/** A Fóir double for one saved catch: its request, capture, safety cases and the
 * first records the reviewer's hide walk touches. */
function project({ audience = 'public' } = {}) {
  const cases = [], calls = [], visibility = new Map(), shownTo = new Map()
  let file = audience === 'public' ? 'PUBLIC' : 'PRIVATE'
  const capture = { _id: captureId, _ownerId: actor, _createdAt: '2026-11-03T17:00:00Z', clientKey: `${actor}~key`, fileId, payloadHash: 'hash',
    tagRevision: 'revision-1', state: 'ready', audience, catKey: 'cat00000000001', editHash: null, area: null }
  const page = edges => ({ page: { edges: edges.map(node => ({ node })), pageInfo: { hasNextPage: false, endCursor: null } } })
  const raw = async (query, vars = {}) => {
    calls.push(query)
    if (query.includes('CaptureCheckRequest')) return { request: { _id: requestId, _ownerId: actor, photoKey: captureId, fileId, revision: 'revision-1' } }
    if (query.includes('query CanonicalCapture')) return { capturePhoto: capture }
    if (query.includes('SafetyCapture')) return { capturePhoto: { _id: captureId, fileId, photo: { url: `https://cdn.example.test/files/${fileId}` }, cat: { name: 'Tilly' } } }
    if (query.includes('SafetyFile')) return { file: { id: fileId, url: `https://cdn.example.test/files/${fileId}`, mimeType: 'image/jpeg', deletedAt: null } }
    if (query.includes('SafetyRows')) return page(cases.filter(row => vars.status ? row.status === vars.status : vars.digest ? row.digest === vars.digest : row.status === 'hidden'))
    if (query.includes('mutation SafetyCase')) { const row = { _id: `case${String(cases.length).padStart(10, '0')}`, _ownerId: vars.owner, ...vars.input }; cases.push(row); return { createModerationCase: { record: { _id: row._id } } } }
    if (query.includes('CaptureCheckCase')) return page(cases.filter(row => row.targetId === vars.id && ['flagged', 'error', 'hidden'].includes(row.status)).reverse())
    if (query.includes('CaptureCheckHide')) { const row = cases.find(item => item._id === vars.id); row.status = vars.data.status.set; return { updateModerationCase: { record: { _id: row._id } } } }
    if (query.includes('CaptureCheckHold')) return { moderationCase: cases.find(row => row._id === vars.id) ?? null }
    if (query.includes('HeldTarget')) return { capturePhoto: { _id: captureId, _ownerId: actor, photo: { url: `https://cdn.example.test/files/${fileId}` }, fileId } }
    if (query.includes('HideReviewedFile')) { file = 'PRIVATE'; return { setFileVisibility: 'PRIVATE' } }
    if (query.includes('mutation HideRecord')) { shownTo.set(vars.id, vars.data.viewers.disconnect ? 'owner' : 'audience'); if (vars.data.audience) capture.audience = vars.data.audience.set; return { updateCapturePhoto: { record: { _id: vars.id } } } }
    throw Error(`Unexpected request: ${query.slice(0, 80)}`)
  }
  return { raw, cases, calls, visibility, shownTo, capture, get file() { return file } }
}
async function withProvider(flagged, work) {
  const original = globalThis.fetch
  let moderated = 0
  globalThis.fetch = async (url, options) => {
    const address = String(url)
    if (address.startsWith('https://api.example.test/'))
      return Response.json({ data: { appCredential: { value: Buffer.from(JSON.stringify({ moderationOpenAI: 'fixture-provider-value' })).toString('base64') } } })
    if (address.startsWith('https://cdn.example.test/')) return new Response(new Uint8Array([255, 216, 255, 217]), { headers: { 'Content-Type': 'image/jpeg' } })
    assert.equal(address, 'https://api.openai.com/v1/moderations')
    moderated++
    const body = JSON.parse(options.body)
    assert.ok(body.input.some(part => part.type === 'image_url'), 'The photo itself is moderated')
    return Response.json(verdict(flagged))
  }
  try { return { out: await work(), moderated: () => moderated } } finally { globalThis.fetch = original }
}
const cursorOf = async out => { assert.ok(out instanceof Response, 'A continuation is expected'); return JSON.parse((await out.json()).cursor) }

test('only the native check hook, as the request owner, can start a check', async () => {
  for (const changed of [{ trigger: { type: 'call' } }, { context: { userId: 'someone000001' } }, { input: { recordId: requestId, modelKey: 'appearance-request' } }, { operationKey: 'tilly.save-catch' }]) {
    const out = await checkCapture({ ...envelope(), ...changed }, ingress)
    assert.equal(out.status, 403)
  }
})
test('an approved shared photo stays public and moves on to its challenges', async () => {
  const db = project()
  const { out, moderated } = await withProvider(false, () => runCaptureCheck(withContentSafety({ raw: db.raw }, ingress), envelope(), ingress, requestId, actor))
  assert.equal(moderated(), 1)
  assert.deepEqual(await cursorOf(out), { v: 1, phase: 'challenges' })
  assert.equal(db.file, 'PUBLIC')
  assert.equal(db.cases.length, 1); assert.equal(db.cases[0].status, 'approved')
})
test('a flagged photo becomes a hold and the hide walk starts by closing its file', async () => {
  const db = project()
  const { out } = await withProvider(true, () => runCaptureCheck(withContentSafety({ raw: db.raw }, ingress), envelope(), ingress, requestId, actor))
  const next = await cursorOf(out)
  assert.equal(next.phase, 'hide')
  const hold = db.cases.find(row => row._id === next.hold)
  assert.equal(hold.status, 'hidden'); assert.equal(hold.targetId, captureId); assert.equal(hold.fileId, fileId)
  const walk = await runCaptureCheck(withContentSafety({ raw: db.raw }, ingress), envelope(next), ingress, requestId, actor)
  assert.equal(db.file, 'PRIVATE')
  assert.ok(db.calls.findIndex(query => query.includes('HideReviewedFile')) < db.calls.findIndex(query => query.includes('HideRecord')), 'Bytes close before records')
  // Followers and everyone else read the catch through its audience; it now names none, and shows as private.
  assert.equal(db.shownTo.get(captureId), 'owner')
  assert.equal(db.capture.audience, 'private')
  assert.equal((await cursorOf(walk)).phase, 'hide')
})
test('a private profile’s catch is moderated too: its accepted followers see it', async () => {
  const db = project({ audience: 'private' })
  const { out, moderated } = await withProvider(false, () => runCaptureCheck(withContentSafety({ raw: db.raw }, ingress), envelope(), ingress, requestId, actor))
  assert.equal(moderated(), 1)
  assert.deepEqual(await cursorOf(out), { v: 1, phase: 'challenges' })
  assert.equal(db.cases.length, 1)
})
test('a flagged private catch is hidden from its followers too', async () => {
  const db = project({ audience: 'private' })
  const { out } = await withProvider(true, () => runCaptureCheck(withContentSafety({ raw: db.raw }, ingress), envelope(), ingress, requestId, actor))
  const next = await cursorOf(out)
  assert.equal(next.phase, 'hide')
  await runCaptureCheck(withContentSafety({ raw: db.raw }, ingress), envelope(next), ingress, requestId, actor)
  assert.equal(db.shownTo.get(captureId), 'owner')
})
test('a provider failure hides the photo for review rather than leaving it unchecked', async () => {
  const db = project()
  const original = globalThis.fetch
  globalThis.fetch = async url => String(url).startsWith('https://api.openai.com/') ? new Response('unavailable', { status: 503 })
    : String(url).startsWith('https://cdn.example.test/') ? new Response(new Uint8Array([255, 216, 255, 217]), { headers: { 'Content-Type': 'image/jpeg' } })
    : Response.json({ data: { appCredential: { value: Buffer.from(JSON.stringify({ moderationOpenAI: 'fixture-provider-value' })).toString('base64') } } })
  try {
    const next = await cursorOf(await runCaptureCheck(withContentSafety({ raw: db.raw }, ingress), envelope(), ingress, requestId, actor))
    assert.equal(next.phase, 'hide')
    assert.equal(db.cases.find(row => row._id === next.hold).status, 'hidden')
  } finally { globalThis.fetch = original }
})
