import assert from 'node:assert/strict'
import test from 'node:test'
import {
  coveringCells,
  cellBounds,
  intersects,
  normalizedViewport,
  viewportPlan,
} from './viewport'
import { latestForCats, locationPage, readViewport } from './map-query'
import type { AppClient } from './data'
const page = (nodes: unknown[], next: string | null = null) => ({
  edges: nodes.map((node) => ({ node })),
  pageInfo: { hasNextPage: !!next, endCursor: next },
  totalCount: nodes.length,
})

test('wrapped viewports cover both sides of the antimeridian, excluding the middle', () => {
  const box = { west: 170, east: -170, south: -10, north: 10 }
  assert.deepEqual(normalizedViewport(box), {
    west: 170,
    east: 190,
    south: -10,
    north: 10,
  })
  assert.ok(intersects(box, { west: -179, east: -178, south: 0, north: 1 }))
  assert.ok(intersects(box, { west: 178, east: 179, south: 0, north: 1 }))
  assert.equal(
    intersects(box, { west: -1, east: 1, south: 0, north: 1 }),
    false,
  )
  const cells = coveringCells(box, 2, 1000)
  assert.ok(cells.length > 0)
  assert.ok(cells.length < 1000)
  assert.ok(cells.every((cell) => intersects(box, cellBounds(cell))))
})
test('full-world and polar map plans stay bounded; small views use location search', () => {
  for (const bounds of [
    { west: -540, east: 540, south: -90, north: 90 },
    { west: -180, east: 180, south: 89, north: 90 },
    { west: -180, east: 180, south: 0, north: 0.01 },
  ]) {
    const plan = viewportPlan(bounds)
    assert.ok(plan.prefixes.length <= 100)
    assert.ok(plan.precision >= 1 && plan.precision <= 6)
  }
  assert.equal(
    viewportPlan({ west: 0, east: 0.01, south: 51, north: 51.01 }).wide,
    false,
  )
  assert.throws(
    () => normalizedViewport({ west: NaN, east: 0, south: 0, north: 1 }),
    /Invalid/,
  )
})
test('search validates content and continuation cursors', () => {
  assert.deepEqual(
    locationPage(
      page([{ recordId: 'photo', content: { catKey: 'cat' } }], 'next'),
    ),
    { rows: ['cat'], next: 'next' },
  )
  assert.deepEqual(
    locationPage(
      page([{ recordId: 'photo', content: { cat: { id: 'cat' } } }]),
    ),
    { rows: ['cat'], next: null },
  )
  assert.throws(
    () =>
      locationPage({
        edges: [],
        pageInfo: { hasNextPage: true, endCursor: null },
      }),
    /cursor/,
  )
  assert.throws(
    () => locationPage(page([{ recordId: 'photo', content: { catKey: 42 } }])),
    /Unexpected/,
  )
})
test('latest sighting is read beyond a page of repeated cats and can move outside the search region', async () => {
  const requests: Array<string | undefined> = []
  const captures: Record<string, { area: { lat: number; lng: number }; _createdAt: string }> = {
    'a-new': { area: { lat: 60, lng: 7 }, _createdAt: '2026-10-30T00:00:00Z' },
    'a-old': { area: { lat: 1, lng: 1 }, _createdAt: '2026-10-29T00:00:00Z' },
    'b-new': { area: { lat: 5, lng: 6 }, _createdAt: '2026-10-29T00:00:00Z' },
  }
  const tag = (photoKey: string, catKey: string) => ({ _id: `tag-${photoKey}`, _ownerId: 'profile', photoKey, catKey, revision: 'r1' })
  const client = {
    'capture-cat-tag': {
      findMany: async ({ after }: { after?: string }) => {
        requests.push(after)
        return after ? page([tag('b-new', 'b')]) : page([tag('a-new', 'a'), tag('a-old', 'a')], 'next')
      },
    },
    'capture-photo': {
      findMany: async ({ where }: { where: { id: { in: string[] } } }) =>
        page(where.id.in.map(id => ({ _id: id, _ownerId: 'profile', photo: null, state: 'ready', tagRevision: 'r1', ...captures[id] }))),
    },
    cat: {
      findMany: async () =>
        page([
          { _id: 'a', name: 'A' },
          { _id: 'b', name: 'B' },
        ]),
    },
    'capture-post': { findMany: async () => page([]) },
  } as unknown as AppClient
  const rows = await latestForCats(client, ['a', 'b', 'a'])
  assert.deepEqual(requests, [undefined, 'next'])
  assert.deepEqual(
    rows.map((row) => row.id),
    ['a-new', 'b-new'],
  )
  assert.deepEqual(rows[0].area, { lat: 60, lng: 7 })
})
test('viewport search consumes all location pages; wide aggregate truncation is an error', async () => {
  const requests: Array<string | undefined> = []
  const client = {
    ns: {
      search: {
        searchByLocation: async ({ after }: { after?: string }) => {
          requests.push(after)
          return after ? page([]) : page([], 'next')
        },
      },
    },
  } as unknown as AppClient
  assert.deepEqual(
    await readViewport(client, {
      west: 0,
      east: 0.001,
      south: 0,
      north: 0.001,
    }),
    { rows: [], cells: [] },
  )
  assert.deepEqual(requests, [undefined, 'next'])
  const wide = {
    raw: async () => ({ catAggregate: { truncated: true, groups: [] } }),
  } as unknown as AppClient
  await assert.rejects(
    readViewport(wide, { west: -180, east: 180, south: -90, north: 90 }),
    /incomplete/,
  )
})

test('wide map partitions parent cells so no aggregate can exceed its group limit', async () => {
  const bounds = { west: -180, east: 180, south: 0, north: 0.01 }
  const plan = viewportPlan(bounds)
  const batches: string[][] = []
  const client = {
    raw: async (
      _: string,
      { where }: { where: Record<string, { in: string[] }> },
    ) => {
      const parents = Object.values(where)[0].in
      batches.push(parents)
      assert.ok(parents.length <= 8)
      return { catAggregate: { truncated: false, groups: [] } }
    },
    'app-settings': { findUnique: async () => null },
  } as unknown as AppClient
  await readViewport(client, bounds)
  assert.ok(batches.length > 1)
  assert.deepEqual(batches.flat(), plan.prefixes)
})
