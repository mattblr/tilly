import test from 'node:test'
import assert from 'node:assert/strict'
import { checkContent, moderationResult, safetyDigest, contentAllowedForUser } from './safety-policy.ts'
const names = ['sexual', 'violence', 'violence/graphic', 'self-harm', 'self-harm/intent', 'self-harm/instructions', 'sexual/minors', 'harassment', 'harassment/threatening', 'hate', 'hate/threatening', 'illicit', 'illicit/violent']
const result = (flagged = false) => ({ results: [{ flagged, categories: Object.fromEntries(names.map(n => [n, flagged && n === 'violence'])),
  category_scores: Object.fromEntries(names.map(n => [n, flagged ? 0.9 : 0.01])), category_applied_input_types: Object.fromEntries(names.map(n => [n, ['image', 'text']])) }] })
const content = { targetType: 'CapturePhoto', targetId: 'photo', fileId: 'file', text: 'Biscuit', image: new Uint8Array([1, 2, 3]) }
function store() { const saved = []; return { saved, holds: async () => false, matching: async () => saved, keep: async (c, digest, status) => { saved.push({ id: 'case', digest, status, targetType: c.targetType, targetId: c.targetId }) } } }
test('complete checks approve, refusals and missing image coverage do not', () => {
  assert.equal(moderationResult(result(), true).status, 'approved')
  assert.equal(moderationResult(result(true), true).status, 'flagged')
  for (const value of [{}, { results: [] }, { results: [{ flagged: false }] }, { results: [result().results[0], result().results[0]] }]) assert.throws(() => moderationResult(value, true))
  const unsupported = result(); unsupported.results[0].category_applied_input_types.violence = ['text']
  assert.throws(() => moderationResult(unsupported, true))
  const missingText = result(); delete missingText.results[0].categories.harassment
  assert.throws(() => moderationResult(missingText, false))
  const uncheckedText = result(); uncheckedText.results[0].category_applied_input_types.hate = []
  assert.throws(() => moderationResult(uncheckedText, false))
})
test('same bytes and words reuse approval; changed bytes or words require a new check', async () => {
  const db = store(); let calls = 0
  const call = async () => { calls++; return result() }
  assert.equal((await checkContent(db, content, call)).approved, true)
  assert.equal((await checkContent(db, content, call)).approved, true)
  assert.equal(calls, 1)
  await checkContent(db, { ...content, image: new Uint8Array([9]) }, call)
  await checkContent(db, { ...content, text: 'Changed' }, call)
  assert.equal(calls, 3)
  assert.notEqual(await safetyDigest(content), await safetyDigest({ ...content, text: 'Other' }))
})
test('timeouts/malformed results stay private; persistence failure cannot approve', async () => {
  const db = store()
  assert.equal((await checkContent(db, content, async () => { throw Error('timeout') })).approved, false)
  assert.equal(db.saved[0].status, 'error')
  assert.equal((await checkContent(db, content, async () => ({}))).approved, false)
  await assert.rejects(checkContent({ ...store(), keep: async () => { throw Error('database') } }, content, async () => result()))
})
test('operator holds override cached approval and a concurrent provider completion', async () => {
  const db = store(); await checkContent(db, content, async () => result())
  assert.equal((await checkContent({ ...db, holds: async () => true }, content, async () => { throw Error('must not call') })).status, 'hidden')
  let held = false
  const racing = { ...store(), holds: async () => held }
  assert.equal((await checkContent(racing, content, async () => { held = true; return result() })).approved, false)
})
test('a flagged retry requires operator review and does not reroll the model', async () => {
  const db = store(); await checkContent(db, content, async () => result(true))
  assert.equal((await checkContent(db, content, async () => { throw Error('must not call') })).status, 'flagged')
})
test('blocking excludes both the canonical author and the reposting account', () => {
  const blocked = new Set(['blocked'])
  assert.equal(contentAllowedForUser(blocked, 'allowed', 'allowed'), true)
  assert.equal(contentAllowedForUser(blocked, 'blocked', 'allowed'), false)
  assert.equal(contentAllowedForUser(blocked, 'allowed', 'blocked'), false)
})
