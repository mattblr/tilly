import assert from 'node:assert/strict'
import test from 'node:test'
import { captureCatTags, MAX_CAPTURE_CATS, photoPointAt } from './capture-tags'

const known = { key: 'first', catId: 'abcdefghij12345' }
const fresh = { key: 'second', name: '  Biscuit  ' }
test('one capture can mix known and new cats without requiring recognition', () => {
  assert.deepEqual(captureCatTags([known, fresh]), [known, { ...fresh, name: 'Biscuit' }])
  assert.deepEqual(captureCatTags([known]), [known])
})
test('tag identity stays stable across retries and unknown caller fields cannot set ownership', () => {
  const tags = [{ ...known, ownerId: 'someone-else', audience: 'public', photoKey: 'other-photo' }]
  assert.deepEqual(captureCatTags(tags), [known])
  assert.deepEqual(captureCatTags(tags), captureCatTags(structuredClone(tags)))
})
test('empty, oversized and duplicated associations fail before any side effect', () => {
  for (const value of [null, {}, [], Array.from({ length: MAX_CAPTURE_CATS + 1 }, (_, i) => ({ key: `${i}`, name: 'Cat' })),
    [known, known], [known, { ...known, key: 'different' }],
    [{ ...known, name: 'Conflicting cat' }], [{ key: 'new', name: ' ' }], [{ key: '../oops', name: 'Cat' }]])
    assert.throws(() => captureCatTags(value))
})
test('regions use upright top-left coordinates and reject out-of-image regions', () => {
  assert.deepEqual(captureCatTags([{ ...known, bounds: { x: 0.2, y: 0.4, width: 0.4, height: 0.2 } }])[0].position,
    { x: 0.4, y: 0.5 })
  for (const box of [{ x: -0.1, y: 0, width: 0.5, height: 0.5 }, { x: 0.8, y: 0, width: 0.5, height: 0.5 },
    { x: 0, y: 0, width: 0, height: 0.5 }, { x: NaN, y: 0, width: 0.5, height: 0.5 }])
    assert.throws(() => captureCatTags([{ ...known, bounds: box }]))
})
test('local vectors remain model-scoped and malformed vectors are refused', () => {
  const matched = { ...known, vector: [0.6, 0.8], vectorModel: 'apple-featureprint-2' }
  assert.deepEqual(captureCatTags([matched]), [matched])
  for (const partial of [{ vector: [1] }, { vectorModel: 'apple-featureprint-2' }, { vector: [0, 0], vectorModel: 'm' },
    { vector: [Infinity], vectorModel: 'm' }, { vector: [1], vectorModel: '../m' },
    { vector: Array(2049).fill(1), vectorModel: 'm' }])
    assert.throws(() => captureCatTags([{ ...known, ...partial }]))
})
test('contain-fit tagging ignores letterboxing and preserves portrait and landscape positions', () => {
  assert.deepEqual(photoPointAt({ x: 100, y: 100 }, { width: 200, height: 200 }, { width: 400, height: 200 }), { x: 0.5, y: 0.5 })
  assert.equal(photoPointAt({ x: 100, y: 20 }, { width: 200, height: 200 }, { width: 400, height: 200 }), null)
  assert.deepEqual(photoPointAt({ x: 100, y: 100 }, { width: 200, height: 200 }, { width: 200, height: 400 }), { x: 0.5, y: 0.5 })
  assert.equal(photoPointAt({ x: 20, y: 100 }, { width: 200, height: 200 }, { width: 200, height: 400 }), null)
  assert.equal(photoPointAt({ x: 0, y: 0 }, { width: 0, height: 200 }, { width: 1, height: 1 }), null)
})
