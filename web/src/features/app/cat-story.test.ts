import assert from 'node:assert/strict'
import test from 'node:test'
import { readCatStory } from './cat-story'
import type { AppClient } from './data'

const page = (nodes: unknown[], next: string | null = null) => ({
  edges: nodes.map((node) => ({ node })),
  totalCount: nodes.length,
  pageInfo: { hasNextPage: !!next, endCursor: next },
})
test('a readable gallery photo survives an unavailable post without inventing its author; notes follow every page', async () => {
  const cursors: unknown[] = []
  const client = {
    'capture-cat-tag': { findMany: async () => page([{ photoKey: 'photo', _ownerId: 'owner', revision: 'r1' }], 'more-photos') },
    'capture-photo': {
      findMany: async () => page([{ _id: 'photo', _ownerId: 'owner', _createdAt: '2026-10-30T12:00:00Z', photo: null, state: 'ready', tagRevision: 'r1' }]),
    },
    'capture-post': {
      findMany: async ({ where }: { where: Record<string, unknown> }) => {
        assert.deepEqual(where.photoKey, { in: ['photo'] })
        assert.deepEqual(where.reshareOf, { isNull: true })
        assert.deepEqual(where.audience, { eq: 'public' })
        return page([])
      },
    },
    'field-note': {
      findMany: async ({
        after,
        where,
      }: {
        after?: string
        where: unknown
      }) => {
        assert.deepEqual(where, { photoKey: { in: ['photo'] } })
        cursors.push(after)
        return after
          ? page([
              {
                _id: 'n2',
                photoKey: 'photo',
                text: 'On the doorstep',
                tags: [],
              },
            ])
          : page(
              [
                {
                  _id: 'n1',
                  photoKey: 'photo',
                  text: 'Napping',
                  tags: ['Sleepy'],
                },
              ],
              'more-notes',
            )
      },
    },
    'catch-art': { findMany: async () => page([]) },
    cat: { findMany: async () => page([]) },
    profile: {
      findMany: async () => {
        throw new Error('No readable post should ask for a user')
      },
    },
  } as unknown as AppClient
  const result = await readCatStory(client, 'cat', false, 'en-GB')
  assert.equal(result.rows.length, 1)
  assert.equal(result.rows[0].encounter, undefined)
  assert.deepEqual(result.rows[0].notes, [
    'Sleepy · Napping',
    'On the doorstep',
  ])
  assert.deepEqual(cursors, [undefined, 'more-notes'])
  assert.equal(result.next, 'more-photos')
})

test('an empty nonterminal photo page preserves the gallery continuation', async () => {
  const client = {
    'capture-cat-tag': { findMany: async () => page([], 'next-photos') },
    'capture-photo': { findMany: async () => page([]) },
  } as unknown as AppClient
  const result = await readCatStory(client, 'cat', false, 'en-GB')
  assert.deepEqual(result, { rows: [], next: 'next-photos' })
})

function challengeGallery({ catalogUnavailable = false, omitEarned = false } = {}) {
  const ids = ['earned-photo', 'plain-photo', 'malformed-photo']
  const photos = ids.map((id, index) => ({
    _id: id, _ownerId: 'original-owner', _createdAt: `2026-11-0${index + 1}T12:00:00Z`,
    photo: null, state: 'ready', tagRevision: 'r1',
    challengeHighlights: index === 0 ? [{ challengeKey: 'postbox-challenge', criteriaDigest: 'a'.repeat(64), highlightKey: 'postbox' }]
      : index === 1 ? undefined : [{ challengeKey: 'postbox-challenge', criteriaDigest: 'invalid', highlightKey: 'postbox' }],
  }))
  return {
    'capture-cat-tag': { findMany: async () => page(ids.map(photoKey => ({ photoKey, _ownerId: 'original-owner', revision: 'r1' }))) },
    'capture-photo': { findMany: async ({ where, pick }: { where: { id: { in: string[] }; state: unknown }; pick: string[] }) => {
      assert.deepEqual(where.id.in, ids)
      assert.deepEqual(where.state, { eq: 'ready' })
      assert.ok(pick.includes('challengeHighlights'))
      return page(photos.filter(row => !omitEarned || row._id !== ids[0]))
    } },
    'capture-post': { findMany: async () => page([]) },
    'field-note': { findMany: async () => page([]) },
    'catch-art': { findMany: async () => page([]) },
    'photo-challenge': { findMany: async ({ locale }: { locale: string }) => {
      assert.equal(locale, 'en-GB')
      if (catalogUnavailable) throw new Error('Challenges are unreadable')
      return page([{ _naturalKey: 'postbox-challenge', highlightKey: 'postbox', title: 'Postbox challenge', icon: 'postbox', enabled: false }])
    } },
    cat: { findMany: async () => page([]) },
    profile: { findMany: async () => { throw new Error('Unavailable post cannot supply attribution') } },
    'challenge-award': { findMany: async () => { throw new Error('Gallery must not read private awards') } },
  } as unknown as AppClient
}

test('a canonical gallery photo displays its earned challenge without a readable post and never borrows another photo’s evidence', async () => {
  const result = await readCatStory(challengeGallery(), 'cat', false, 'en-GB')
  const earned = result.rows.find(row => row.id === 'earned-photo')!
  assert.equal(earned.encounter, undefined)
  assert.deepEqual(earned.highlightKeys, ['postbox'])
  assert.deepEqual(earned.highlights.map(row => ({ key: row.key, title: row.title, icon: row.icon })), [
    { key: 'postbox', title: 'Postbox challenge', icon: 'postbox' },
  ])
  // A challenge that has since been switched off still labels evidence it awarded.
  for (const id of ['plain-photo', 'malformed-photo'])
    assert.deepEqual(result.rows.find(row => row.id === id)?.highlightKeys, [])
})

test('unreadable evidence or display metadata never invents a gallery badge', async () => {
  const missing = await readCatStory(challengeGallery({ omitEarned: true }), 'cat', false, 'en-GB')
  assert.equal(missing.rows.some(row => row.id === 'earned-photo'), false)
  assert.ok(missing.rows.every(row => row.highlightKeys.length === 0))
  const noCatalog = await readCatStory(challengeGallery({ catalogUnavailable: true }), 'cat', false, 'en-GB')
  assert.equal(noCatalog.rows.length, 3)
  assert.ok(noCatalog.rows.every(row => row.highlights.length === 0))
})
