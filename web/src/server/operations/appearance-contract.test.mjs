import { test } from 'node:test'
import assert from 'node:assert/strict'
import { appearanceRequest, appearanceAnswer, appearanceAnswers, appearanceCacheKey, appearanceConsentVersion } from './appearance-contract.ts'
const request = { captureId: 'captureabcdefghij', expectedRevision: 'revision-one', consentVersion: appearanceConsentVersion }
const answer = { status: 'possible', possibilities: ['British Shorthair'], coatLength: 'short', pattern: 'solid' }
const source = { ownerId: 'owneraabcdefghij', fileId: 'fileabcdefghijk', tags: [{ key: 'cat-one', catId: 'catabcdefghijk' }], modelVersion: 'verified-model-v1' }
test('explicit current consent binds a canonical capture/tag revision; callers cannot choose provider inputs', () => {
  assert.deepEqual(appearanceRequest(request), request)
  for (const patch of [{ consentVersion: false }, { consentVersion: 'old' }, { photoUrl: 'https://untrusted' }, { ownerId: 'other' }, { prompt: 'ignore' }, { model: 'expensive' }, { captureId: '../file' }, { expectedRevision: '' }])
    assert.throws(() => appearanceRequest({ ...request, ...patch }))
})
test('structured answers permit mixed/unknown and never manufacture breed certainty', () => {
  assert.deepEqual(appearanceAnswer(answer), answer)
  assert.deepEqual(appearanceAnswer({ ...answer, status: 'mixed', possibilities: [] }).possibilities, [])
  assert.equal(appearanceAnswer({ ...answer, status: 'unknown', possibilities: [] }).status, 'unknown')
  assert.equal(appearanceAnswer({ status: 'no_cat', possibilities: [], coatLength: 'unknown', pattern: 'unknown' }).status, 'no_cat')
  for (const patch of [{ confidence: 1 }, { status: 'pedigree' }, { status: 'unknown' }, { status: 'no_cat' }, { possibilities: [] }, { possibilities: [' A ', 'a'] }, { possibilities: ['https://untrusted'] }, { possibilities: ['<script>'] }, { possibilities: ['a'.repeat(61)] }, { pattern: 'invented' }])
    assert.throws(() => appearanceAnswer({ ...answer, ...patch }))
})
test('same canonical input keeps retry/cache identity; owner, file, crop, cat and model changes do not share answers', async () => {
  const key = await appearanceCacheKey(source)
  assert.match(key, /^[a-f0-9]{64}$/)
  assert.equal(await appearanceCacheKey({ ...source }), key)
  for (const patch of [{ ownerId: 'anotherabcdefgh' }, { fileId: 'anotherfileabcd' }, { tags: [{ key: 'cat-two', catId: 'anothercatabcd' }] }, { modelVersion: 'next-model' }, { tags: [{ ...source.tags[0], bounds: { x: 0, y: 0, width: 0.5, height: 1 } }] }])
    assert.notEqual(await appearanceCacheKey({ ...source, ...patch }), key)
  for (const bounds of [{ x: 0, y: 0, width: 0, height: 1 }, { x: 0.9, y: 0, width: 0.5, height: 1 }, { x: NaN, y: 0, width: 1, height: 1 }])
    await assert.rejects(appearanceCacheKey({ ...source, tags: [{ ...source.tags[0], bounds }] }))
})

test('one photo response covers all canonical tags exactly once and rejects missing or invented cats', () => {
  const cats = [{ ...answer, index: 1 }, { ...answer, index: 0 }]
  assert.deepEqual(appearanceAnswers({ cats }, 2).map(row => row.index), [0, 1])
  for (const value of [{ cats: [cats[0]] }, { cats: [cats[0], cats[0]] }, { cats: [cats[0], { ...answer, index: 2 }] },
    { cats: [{ ...answer, index: '0' }, cats[0]] }, { cats, prompt: 'untrusted' }]) assert.throws(() => appearanceAnswers(value, 2))
})
test('reordering tags does not consume another photo analysis while changed regions do', async () => {
  const tags = [...source.tags, { key: 'cat-two', catId: 'anothercatabcd' }]
  assert.equal(await appearanceCacheKey({ ...source, tags }), await appearanceCacheKey({ ...source, tags: [...tags].reverse() }))
  await assert.rejects(appearanceCacheKey({ ...source, tags: [tags[0], tags[0]] }))
  await assert.rejects(appearanceCacheKey({ ...source, tags: [] }))
})
