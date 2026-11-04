import test from 'node:test'
import assert from 'node:assert/strict'
import { countTaggedCatPhotos, readCaptureAssociations, readTaggedCatPhotos } from './captures'
import type { AppClient } from './data'

const page = (nodes: unknown[], next: string | null = null) => ({ edges: nodes.map(node => ({ node })), pageInfo: { hasNextPage: !!next, endCursor: next } })
const capture = { _id: 'capture1234567890', _ownerId: 'creator', _createdAt: '2026-10-01T12:00:00Z', tagRevision: 'current', photo: null }
const tag = { _id: 'tag', _ownerId: 'creator', photoKey: capture._id, catKey: 'cat0000000000', tagKey: 'cat-one', revision: 'current', position: { x: 0.2, y: 0.3 } }

test('associations drain tag pages and reject old revisions, foreign owners and unavailable parents', async () => {
  const reads: unknown[] = []
  const client = {
    'capture-photo': { findMany: async ({ where }: { where: unknown }) => { assert.deepEqual(where, { id: { in: [capture._id] }, state: { eq: 'ready' } }); return page([capture]) } },
    'capture-cat-tag': { findMany: async ({ after, where }: { after?: string; where: Record<string, unknown> }) => {
      reads.push(after)
      assert.deepEqual(where.active, { eq: true })
      assert.equal(where.capture, undefined)
      return after ? page([tag]) : page([
        { ...tag, revision: 'abandoned' }, { ...tag, _ownerId: 'someone-else' }, { ...tag, photoKey: 'unavailable' },
      ], 'remaining-tags')
    } },
    cat: { findMany: async () => page([{ _id: tag.catKey, name: 'Biscuit' }]) },
  } as unknown as AppClient
  const result = await readCaptureAssociations(client, [capture._id])
  assert.deepEqual(reads, [undefined, 'remaining-tags'])
  assert.deepEqual(result.tags.get(capture._id), [{ key: 'cat-one', catId: tag.catKey, name: 'Biscuit', position: { x: 0.2, y: 0.3 } }])
})

test('secondary-cat stories use capture dates and preserve empty filtered-page continuation', async () => {
  let stale = false
  const client = {
    'capture-cat-tag': { findMany: async ({ where, orderBy, after }: { where: unknown; orderBy: unknown; after?: string }) => {
      assert.deepEqual(where, { active: { eq: true }, catKey: { eq: tag.catKey } })
      assert.deepEqual(orderBy, [{ capturedAt: 'DESC' }])
      assert.equal(after, 'prior-tags')
      return page([{ ...tag, revision: stale ? 'old' : 'current' }], 'next-tags')
    } },
    'capture-photo': { findMany: async () => page([capture]) },
  } as unknown as AppClient
  const result = await readTaggedCatPhotos(client, tag.catKey, 'prior-tags')
  assert.equal(result.rows[0]._createdAt, '2026-10-01T12:00:00Z')
  assert.equal(result.next, 'next-tags')
  stale = true
  assert.deepEqual(await readTaggedCatPhotos(client, tag.catKey, 'prior-tags'), { rows: [], next: 'next-tags' })
})

test('encounter counts drain candidates and count only matching ready parent revisions and owners', async () => {
  const seen: unknown[] = []
  const client = {
    'capture-cat-tag': { findMany: async ({ after, where }: { after?: string; where: Record<string, unknown> }) => {
      seen.push(after)
      assert.deepEqual(where.ownerId, { eq: 'creator' })
      return after ? page([tag]) : page([{ ...tag, revision: 'old' }, { ...tag, photoKey: 'unfinished' }], 'last-tags')
    } },
    'capture-photo': { findMany: async ({ where }: { where: { state: unknown } }) => {
      assert.deepEqual(where.state, { eq: 'ready' })
      return page([capture])
    } },
  } as unknown as AppClient
  assert.equal(await countTaggedCatPhotos(client, tag.catKey, 'creator'), 1)
  assert.deepEqual(seen, [undefined, 'last-tags'])
})
