import test from 'node:test'
import assert from 'node:assert/strict'
import { notificationSlice } from './notification-workflow.ts'
import { nextPage } from './notification-store.ts'

const now = new Date('2026-11-01T18:00:00Z')
const person = { _id: 'preferences1', _ownerId: 'person0000001', timeZone: 'Europe/London', reminderHour: 18, artReady: false, streakReminders: true, communityUpdates: true }
const page = (nodes, after = null) => ({ edges: nodes.map(node => ({ node })), pageInfo: { hasNextPage: after !== null, endCursor: after } })
function fixture(options = {}) {
  const sent = new Map(), calls = [], patches = []
  const store = {
    async settingsPage(after) { calls.push(['settings', after]); return after ? page([{ ...person, _ownerId: 'person0000002' }]) : page([person], 'settings-2') },
    async ownSettings(owner) { return options.optOut ? { ...person, _ownerId: owner, streakReminders: false, communityUpdates: false } : { ...person, _ownerId: owner } },
    async history(owner, after) {
      calls.push(['captures', owner, after])
      return after ? page([{ _createdAt: '2026-10-30T10:00:00Z' }]) : page([{ _createdAt: '2026-10-31T10:00:00Z' }], 'captures-2')
    },
    async patch(...args) { patches.push(args) },
    async caughtToday() { return options.caughtToday ?? false },
    async words() { return {} },
    async send(input) {
      const prior = sent.get(input.idempotencyKey)
      if (prior) assert.deepEqual(input, prior)
      sent.set(input.idempotencyKey, input)
    },
  }
  return { store, sent, calls, patches }
}
async function run(f, kind = 'reminder', input = {}) {
  let cursor, result, slices = 0
  do {
    result = await notificationSlice(f.store, kind, input, cursor, now)
    cursor = result.cursor
    assert.ok(++slices < 30, 'continuations must advance')
  } while (cursor)
  return result.result
}
test('reminders page users and their capture history in bounded slices, with one send per user/day', async () => {
  const f = fixture()
  assert.equal((await run(f)).eligible, 2)
  assert.equal(f.sent.size, 2)
  assert.equal(f.calls.filter(c => c[0] === 'captures').length, 4)
  assert.equal(f.patches[0][2].currentStreak, 2)
  for (const value of f.sent.values()) assert.equal(value.expiresAt, '2026-11-02T00:00:00.000Z')
  await run(f)
  assert.equal(f.sent.size, 2, 'stable platform idempotency keys survive separate runs')
})
test('an opt-out during history paging and a new capture before delivery both prevent sends', async () => {
  for (const options of [{ optOut: true }, { caughtToday: true }]) {
    const f = fixture(options)
    assert.equal((await run(f)).eligible, 0)
    assert.equal(f.sent.size, 0)
  }
})
test('campaign preview never sends; actual send observes opt-in and minimum streak', async () => {
  const input = { title: 'Neighbourhood news', message: 'Hello there', destination: 'feed', minimumStreak: 2, dryRun: true, campaignKey: 'campaign-123' }
  const f = fixture()
  assert.equal((await run(f, 'campaign', input)).eligible, 2)
  assert.equal(f.sent.size, 0)
  await run(f, 'campaign', { ...input, dryRun: false })
  assert.equal(f.sent.size, 2)
  assert.equal((await run(f, 'campaign', { ...input, minimumStreak: 3 })).eligible, 0)
  const optedOut = fixture({ optOut: true })
  assert.equal((await run(optedOut, 'campaign', { ...input, dryRun: false })).eligible, 0)
})
test('malformed continuations and a non-advancing source cursor fail closed', async () => {
  const f = fixture()
  await assert.rejects(notificationSlice(f.store, 'reminder', {}, '{"eligible":-1}', now))
  assert.throws(() => nextPage(page([], 'same'), 'same'))
  assert.throws(() => nextPage({ edges: [], pageInfo: { hasNextPage: true, endCursor: null } }))
})
test('a delayed continuation cannot send the following day; opted-out users still get fresh segment context', async () => {
  const f = fixture()
  let { cursor } = await notificationSlice(f.store, 'reminder', {}, undefined, now)
  let result
  do {
    result = await notificationSlice(f.store, 'reminder', {}, cursor, new Date('2026-11-02T18:00:00Z'))
    cursor = result.cursor
    // Stop after the first person: the next person may start on the new day.
  } while (cursor && JSON.parse(cursor).person)
  assert.equal(f.sent.size, 0)
  const optedOut = fixture({ optOut: true })
  await run(optedOut)
  assert.equal(optedOut.patches.length, 2)
  assert.equal(optedOut.sent.size, 0)
})
test('capture campaigns link to the web camera and native capture route', async () => {
  const f = fixture()
  await run(f, 'campaign', { title: 'Meet a cat', message: 'Try the camera', destination: 'capture', minimumStreak: 0, dryRun: false, campaignKey: 'camera-123' })
  for (const value of f.sent.values()) {
    assert.equal(value.actionUrl, '/catch')
    assert.equal(value.channels.push.deep_link, 'tilly://capture')
  }
})
test('scheduled reminder dry run counts the same eligible people without sending', async () => {
  const f = fixture()
  const result = await run(f, 'reminder', { dryRun: true })
  assert.deepEqual(result, { ok: true, eligible: 2, dryRun: true })
  assert.equal(f.sent.size, 0)
  assert.equal(f.patches.length, 2)
})
