import assert from 'node:assert/strict'
import test from 'node:test'
import {
  collectPages,
  likeGroups,
  readLikeCounts,
  trendingSource,
  followingSource,
} from './feed-sources'
import type { AppClient } from './data'
const page = (nodes: unknown[], next: string | null = null) => ({
  edges: nodes.map((node) => ({ node })),
  pageInfo: { hasNextPage: !!next, endCursor: next },
  totalCount: nodes.length,
})

test('aggregate responses validate shape and expose truncation', () => {
  assert.deepEqual(
    likeGroups({
      captureLikeAggregate: {
        truncated: true,
        groups: [{ key: 'photo', count: 3 }],
      },
    }),
    { truncated: true, groups: [{ key: 'photo', count: 3 }] },
  )
  for (const value of [
    {},
    null,
    { captureLikeAggregate: { groups: [] } },
    {
      captureLikeAggregate: {
        truncated: false,
        groups: [{ key: 'p', count: -1 }],
      },
    },
  ])
    assert.throws(() => likeGroups(value))
})
test('collect refuses cursor cycles', async () => {
  await assert.rejects(
    collectPages(async () => ({ rows: [1], next: 'same' })),
    /did not advance/,
  )
})
test('like count reads chunk keys and refuse truncated counts', async () => {
  const chunks: string[][] = []
  const stub = {
    raw: async (_query: string, { keys }: { keys: string[] }) => {
      chunks.push(keys)
      return {
        captureLikeAggregate: {
          truncated: false,
          groups: keys.map((key) => ({ key, count: 1 })),
        },
      }
    },
  } as unknown as AppClient
  const counts = await readLikeCounts(
    stub,
    Array.from({ length: 205 }, (_, i) => String(i)),
  )
  assert.deepEqual(
    chunks.map((c) => c.length),
    [100, 100, 5],
  )
  assert.equal(counts.size, 205)
  await assert.rejects(
    readLikeCounts(
      {
        raw: async () => ({
          captureLikeAggregate: { truncated: true, groups: [] },
        }),
      } as unknown as AppClient,
      ['photo'],
    ),
    /incomplete/,
  )
})
function feedClient(
  posts: Array<Record<string, unknown>>,
  extra: Record<string, unknown> = {},
) {
  return {
    'capture-post': {
      findMany: async ({
        after,
        where,
      }: {
        after?: string
        where: Record<string, Record<string, unknown>>
      }) => {
        let matching = posts
        if (where.photoKey)
          matching = matching.filter((row) =>
            (where.photoKey.in as string[]).includes(String(row.photoKey)),
          )
        const offset = Number(after ?? 0)
        return page(
          matching.slice(offset, offset + 8),
          offset + 8 < matching.length ? String(offset + 8) : null,
        )
      },
    },
    'capture-photo': { findMany: async ({ where }: { where: { id: { in: string[] } } }) =>
      page(where.id.in.map(id => ({ _id: id, _ownerId: 'profile', _createdAt: '2026-10-30T12:00:00Z', photo: null, state: 'ready', tagRevision: 'r1' }))) },
    'capture-cat-tag': { findMany: async () => page([]) },
    'catch-art': { findMany: async () => page([]) },
    profile: { findMany: async () => page([]) },
    cat: { findMany: async () => page([]) },
    ...extra,
  } as unknown as AppClient
}
test('worldwide ranking preserves rank, pagination tail, deduplication and native per-cat cap', async () => {
  const posts = Array.from({ length: 64 }, (_, i) => ({
    _id: `post${i}`,
    photoKey: `photo${i}`,
    catKey: `cat${Math.floor(i / 3)}`,
    audience: 'public',
    postedAt: '2026-10-30T10:00:00Z',
  }))
  const client = feedClient(posts, {
    raw: async () => ({
      captureLikeAggregate: {
        truncated: false,
        groups: posts
          .slice(0, 60)
          .map((post, i) => ({ key: post.photoKey, count: 100 - i })),
      },
    }),
    'app-settings': { findUnique: async () => ({ trendingPerCat: 2 }) },
  })
  const source = await trendingSource(client, '2026-10-01T00:00:00Z'),
    out = []
  for (let i = 0; i < 10; i++) {
    const page = await source.next()
    out.push(...page.rows)
    if (!page.next) break
  }
  assert.equal(out.length, 43)
  assert.deepEqual(
    out.map((r) => r.id),
    posts.filter((_, i) => i % 3 < 2).map((p) => p._id),
  )
  assert.equal(new Set(out.map((r) => r.photoKey)).size, out.length)
})
test('truncated worldwide ranking is never presented as complete', async () => {
  const client = feedClient([], {
    raw: async () => ({
      captureLikeAggregate: { truncated: true, groups: [] },
    }),
    'app-settings': { findUnique: async () => null },
  })
  await assert.rejects(
    trendingSource(client, '2026-10-01T00:00:00Z'),
    /incomplete/,
  )
})
test('following pages relationships, counts only accepted follows, and merges own/user and public-cat queries', async () => {
  const calls: Array<Record<string, unknown>> = []
  const client = feedClient([], {
    // My requests; a follow is on once its answer is accepted.
    'follow-request': {
      findMany: async ({ after }: { after?: string }) =>
        after
          ? page([{ _id: 'request2', followeeId: 'friend2' }, { _id: 'request3', followeeId: 'asked' }])
          : page([{ _id: 'request1', followeeId: 'friend1' }], 'next'),
    },
    'follow-approval': {
      findMany: async ({ where }: { where: Record<string, unknown> }) => {
        assert.deepEqual(where, { followerId: { eq: 'me' }, status: { eq: 'accepted' } })
        return page([{ _id: 'answer1', requestId: 'request1' }, { _id: 'answer2', requestId: 'request2' }])
      },
    },
    'cat-follow': { findMany: async () => page([{ catKey: 'cat1' }]) },
    'capture-post': {
      findMany: async ({ where }: { where: Record<string, unknown> }) => {
        calls.push(where)
        return page([])
      },
    },
  })
  const source = await followingSource(client, 'me')
  await source.next()
  assert.deepEqual(calls, [
    { ownerId: { in: ['me', 'friend1', 'friend2'] } },
    { audience: { eq: 'public' }, catKey: { in: ['cat1'] } },
  ])
})

test('nearby ranking pages locations and limits period likes to the selected readable originals', async () => {
  const sourceModule = await import('./feed-sources')
  const locationCursors: Array<string | undefined> = []
  const ids = ['a', 'b', 'c']
  const posts = ids.map((id, i) => ({
    _id: id,
    _ownerId: 'profile',
    catKey: i === 2 ? 'cat-other' : 'cat',
    photoKey: `photo-${id}`,
    reshareOf: null,
    postedAt: `2026-10-${30 - i}T12:00:00Z`,
    area: { lat: 54, lng: -6 },
    audience: 'public',
  }))
  let aggregateSeen = false
  const client = {
    ns: {
      search: {
        searchByLocation: async ({
          after,
          modelKey,
          key,
        }: {
          after?: string
          modelKey: string
          key: string
        }) => {
          assert.equal(modelKey, 'capture-post')
          assert.equal(key, 'area')
          locationCursors.push(after)
          return page(
            (after ? ['b', 'c'] : ['a']).map((recordId) => ({ recordId })),
            after ? null : 'second',
          )
        },
      },
    },
    'capture-post': {
      findMany: async ({
        where,
      }: {
        where: { id: { in: string[] }; postedAt: unknown; reshareOf: unknown }
      }) => {
        assert.deepEqual(where.reshareOf, { isNull: true })
        assert.deepEqual(where.postedAt, { gte: '2026-10-26T00:00:00Z' })
        return page(posts.filter((p) => where.id.in.includes(p._id)))
      },
    },
    'capture-photo': { findMany: async ({ where }: { where: { id: { in: string[] } } }) =>
      page(where.id.in.map(id => ({ _id: id, _ownerId: 'profile', _createdAt: '2026-10-30T12:00:00Z', photo: null, state: 'ready', tagRevision: 'r1' }))) },
    'capture-cat-tag': { findMany: async () => page([]) },
    'catch-art': { findMany: async () => page([]) },
    cat: {
      findMany: async () =>
        page([
          { _id: 'cat', name: 'Tilly' },
          { _id: 'cat-other', name: 'Biscuit' },
        ]),
    },
    profile: {
      findMany: async () =>
        page([{ _id: 'profile', _ownerId: 'profile', username: 'profile' }]),
    },
    'app-settings': { findUnique: async () => ({ trendingPerCat: 1 }) },
    raw: async (query: string, vars: { keys: string[]; since: string }) => {
      aggregateSeen = true
      assert.match(query, /createdAt: \{gte: \$since\}/)
      assert.equal(vars.since, '2026-10-26T00:00:00Z')
      assert.deepEqual(
        new Set(vars.keys),
        new Set(['photo-a', 'photo-b', 'photo-c']),
      )
      return {
        captureLikeAggregate: {
          truncated: false,
          groups: [
            { key: 'photo-b', count: 10 },
            { key: 'photo-c', count: 2 },
          ],
        },
      }
    },
  } as unknown as AppClient
  const source = await sourceModule.nearbyTrendingSource(
    client,
    { lat: 54, lng: -6 },
    5000,
    '2026-10-26T00:00:00Z',
  )
  const first = await source.next()
  assert.deepEqual(
    first.rows.map((row) => row.id),
    ['b', 'c'],
  )
  assert.equal(first.next, null)
  assert.deepEqual(locationCursors, [undefined, 'second'])
  assert.equal(aggregateSeen, true)
})
