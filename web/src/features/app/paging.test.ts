import assert from 'node:assert/strict'
import test from 'node:test'
import { appendUnique, cursorSource, mergedSource } from './paging'
const row = (id: string, time: number) => ({
  id,
  postedAt: new Date(time * 1000).toISOString(),
})

test('merged feeds drain and deduplicate all lanes beyond their first pages', async () => {
  const a = Array.from({ length: 36 }, (_, i) => row(`a${i}`, 100 - i * 2))
  const b = Array.from({ length: 36 }, (_, i) => row(`b${i}`, 99 - i * 2))
  const make = (rows: typeof a) => (after?: string) =>
    Promise.resolve({
      rows: rows.slice(Number(after ?? 0), Number(after ?? 0) + 7),
      next:
        Number(after ?? 0) + 7 < rows.length
          ? String(Number(after ?? 0) + 7)
          : null,
    })
  const source = mergedSource([make(a), make(b), make(a.slice(0, 4))])
  const output = []
  for (let i = 0; i < 10; i++) {
    const page = await source.next()
    output.push(...page.rows)
    if (!page.next) break
  }
  assert.equal(output.length, 72)
  assert.equal(new Set(output.map((r) => r.id)).size, 72)
  assert.deepEqual(
    output,
    [...a, ...b].sort((a, b) => b.postedAt.localeCompare(a.postedAt)),
  )
})
test('failed merged reads do not consume rows or advance another lane', async () => {
  let fail = true
  const source = mergedSource([
    async () => ({ rows: [row('first', 3)], next: null }),
    async () => {
      if (fail) {
        fail = false
        throw Error('offline')
      }
      return { rows: [row('second', 2)], next: null }
    },
  ])
  await assert.rejects(source.next(), /offline/)
  assert.deepEqual(
    (await source.next()).rows.map((r) => r.id),
    ['first', 'second'],
  )
})
test('merge reads past empty nonterminal pages', async () => {
  const source = mergedSource([
    async (after) =>
      after
        ? { rows: [row('found', 1)], next: null }
        : { rows: [], next: 'next' },
  ])
  assert.equal((await source.next()).rows[0].id, 'found')
})
test('cursor retries failed reads and refuses a repeated cursor', async () => {
  let fail = true
  const received: Array<string | undefined> = []
  const source = cursorSource(async (after) => {
    received.push(after)
    if (after && fail) {
      fail = false
      throw Error('offline')
    }
    return { rows: [], next: 'next' }
  })
  await source.next()
  await assert.rejects(source.next(), /offline/)
  await assert.rejects(source.next(), /did not advance/)
  assert.deepEqual(received, [undefined, 'next', 'next'])
})
test('append deduplicates within and between pages', () => {
  assert.deepEqual(
    appendUnique([{ id: 'a' }], [{ id: 'a' }, { id: 'b' }, { id: 'b' }]),
    [{ id: 'a' }, { id: 'b' }],
  )
})

test('SDK lookups drain short and empty intermediate pages beyond 100 rows', async () => {
  const { collectConnection } = await import('./paging')
  const received: Array<string | undefined> = []
  const rows = await collectConnection(async (after) => {
    received.push(after)
    const start = Number(after ?? 0)
    return {
      edges:
        start === 100
          ? []
          : Array.from({ length: start === 0 ? 100 : 5 }, (_, i) => ({
              node: start + i,
            })),
      pageInfo: {
        hasNextPage: start < 200,
        endCursor: start < 200 ? String(start + 100) : null,
      },
    }
  })
  assert.deepEqual(received, [undefined, '100', '200'])
  assert.equal(rows.length, 105)
  assert.equal(rows.at(-1), 204)
})
test('SDK lookup refuses a missing continuation instead of claiming a complete list', async () => {
  const { collectConnection } = await import('./paging')
  await assert.rejects(
    collectConnection(async () => ({
      edges: [],
      pageInfo: { hasNextPage: true, endCursor: null },
    })),
    /continuation/,
  )
})
