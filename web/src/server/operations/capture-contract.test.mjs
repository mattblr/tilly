import assert from 'node:assert/strict'
import test from 'node:test'
import { captureDigest, requireCaptureEditor, taggedCaptureInput } from './capture-contract.ts'
const input = { photoFileId: 'abcdefghij12345', captureKey: 'attempt-1', cats: [{ key: 'one', name: 'Biscuit' }, { key: 'two', catId: 'zyxwvutsrq12345' }], lat: 51.5, lng: -0.12 }
test('canonical capture validation rejects malformed locations and client authority', () => {
  const result = taggedCaptureInput({ ...input, ownerId: 'foreign', audience: 'public' })
  assert.deepEqual(result, input)
  for (const bad of [{ lat: Infinity }, { lng: NaN }, { lat: 91 }, { lng: -181 }, { photoFileId: '../other' }, { captureKey: '' }, { cats: [] }])
    assert.throws(() => taggedCaptureInput({ ...input, ...bad }))
})
test('capture digest is stable for a retry and detects changed file or cat selection', async () => {
  const initial = await captureDigest(taggedCaptureInput(input))
  assert.equal(initial, await captureDigest(taggedCaptureInput(structuredClone(input))))
  assert.notEqual(initial, await captureDigest(taggedCaptureInput({ ...input, cats: [input.cats[0]] })))
  assert.notEqual(initial, await captureDigest(taggedCaptureInput({ ...input, photoFileId: 'differentfile12' })))
})
test('only the verified creator can edit; stale edits fail but the same edit can resume', () => {
  const row = { ownerId: 'creator', revision: 'old-revision' }
  requireCaptureEditor('creator', row, 'old-revision', 'new-revision')
  requireCaptureEditor('creator', { ...row, revision: 'new-revision' }, 'old-revision', 'new-revision')
  for (const actor of [null, undefined, 'someone-else'])
    assert.throws(() => requireCaptureEditor(actor, row, 'old-revision', 'new-revision'), error => error.status === 403)
  assert.throws(() => requireCaptureEditor('creator', null, 'old-revision', 'new-revision'), error => error.status === 403)
  assert.throws(() => requireCaptureEditor('creator', row, 'stale-revision', 'new-revision'), error => error.status === 409)
  assert.throws(() => requireCaptureEditor('creator', row, 'old-revision', 'old-revision'), error => error.status === 400)
})
