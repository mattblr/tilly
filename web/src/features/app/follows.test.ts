import assert from 'node:assert/strict'
import test from 'node:test'
import { followIfFirstCatch, readCircle, requestCount } from './follows'
import type { AppClient } from './data'

const page = (nodes: unknown[]) => ({
  edges: nodes.map((node) => ({ node })),
  totalCount: nodes.length,
  pageInfo: { hasNextPage: false, endCursor: null },
})
const me = 'me0000000001'
// Requests to me: one person asked twice, one was declined, one was accepted.
const requests = [
  { _id: 'r1', _ownerId: 'asker000001', followeeId: me },
  { _id: 'r1b', _ownerId: 'asker000001', followeeId: me },
  { _id: 'r2', _ownerId: 'declined001', followeeId: me },
  { _id: 'r3', _ownerId: 'follower001', followeeId: me },
]
const answers = [
  { _id: 'a2', _ownerId: me, followerId: 'declined001', requestId: 'r2', status: 'declined' },
  { _id: 'a3', _ownerId: me, followerId: 'follower001', requestId: 'r3', status: 'accepted' },
]
type Where = { ownerId?: { eq: string }; followeeId?: { eq: string }; followerId?: { eq: string } }
const matches = (row: Record<string, unknown>, where: Where) =>
  (!where.ownerId || row._ownerId === where.ownerId.eq) &&
  (!where.followeeId || row.followeeId === where.followeeId.eq) &&
  (!where.followerId || row.followerId === where.followerId.eq)
const client = {
  'follow-request': { findMany: async ({ where }: { where: Where }) => page(requests.filter((row) => matches(row, where))) },
  'follow-approval': { findMany: async ({ where }: { where: Where }) => page(answers.filter((row) => matches(row, where))) },
} as unknown as AppClient

test('the profile badge counts each person still waiting for an answer once', async () => {
  assert.equal(await requestCount(client, me), 1)
})

test('the badge and the requests list agree', async () => {
  const circle = await readCircle(client, me)
  assert.deepEqual(circle.requests, ['asker000001'])
  assert.deepEqual([...circle.followers], ['follower001'])
})

function catchClient(photos: string[]) {
  const follows: unknown[] = []
  const stub = {
    'capture-cat-tag': { findManyMine: async () => page(photos.map((photoKey, i) => ({ _id: `tag${i}`, photoKey }))) },
    ns: { operations: { 'execute.follow_cat': async (args: unknown) => { follows.push(args); return { result: { ok: true, following: true } } } } },
  } as unknown as AppClient
  return { stub, follows }
}

test('the first catch of a cat follows it', async () => {
  const { stub, follows } = catchClient(['photo1'])
  assert.equal(await followIfFirstCatch(stub, 'cat0000000001'), true)
  assert.equal(follows.length, 1)
})

test('a later catch leaves the follow alone, so an unfollow stands', async () => {
  const { stub, follows } = catchClient(['photo1', 'photo2'])
  assert.equal(await followIfFirstCatch(stub, 'cat0000000001'), false)
  assert.equal(follows.length, 0)
})
