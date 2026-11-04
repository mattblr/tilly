import { test } from 'node:test'
import assert from 'node:assert/strict'
import { updateEvaluation, writeAward } from './challenge-store.ts'

const row = {
  _id: 'fixture-evaluation', _ownerId: 'fixture-owner', status: 'unavailable',
  attemptCount: 0, retryCount: 0,
}
test('evaluation CAS clears nullable fields with setNull while preserving values and identity guards', async () => {
  let sent
  const foir = { async raw(query, variables) {
    assert.match(query, /ChallengeEvaluationUpdateInput!/)
    sent = structuredClone(variables)
    return { updateChallengeEvaluation: { record: { _id: row._id } } }
  } }
  assert.equal(await updateEvaluation(foir, row, {
    status: 'reserved', reasonCode: null, runId: null, evaluatedAt: null, outcome: null,
    attemptCount: 0, retryCount: 1,
  }), true)
  assert.deepEqual(sent, {
    id: row._id, owner: row._ownerId, status: 'unavailable', attempt: 0, retry: 0,
    data: {
      status: { set: 'reserved' }, reasonCode: { setNull: true }, runId: { setNull: true },
      evaluatedAt: { setNull: true }, outcome: { setNull: true },
      attemptCount: { set: 0 }, retryCount: { set: 1 },
    },
  })
  const completed = { status: 'qualified', reasonCode: 'qualified', runId: 'fixture-run', evaluatedAt: '2026-11-03T12:00:00Z', outcome: 'qualified' }
  await updateEvaluation(foir, row, completed)
  assert.deepEqual(sent.data, Object.fromEntries(Object.entries(completed).map(([key, value]) => [key, { set: value }])))
  assert.equal('retryCount' in sent.data, false)
})

test('award CAS omits an unearned nullable date and retains a previously earned date on invalidation', async () => {
  const calls = []
  const foir = { async raw(_query, variables) {
    calls.push(structuredClone(variables))
    return { updateChallengeAward: { record: { _id: 'fixture-award' } } }
  } }
  const challenge = { _naturalKey: 'fixture-challenge', criteriaVersion: 'v1', title: 'Fixture', icon: 'cat', targetCount: 2 }
  const old = { _id: 'fixture-award', progress: 1, active: false, earnedAt: null }
  await writeAward(foir, row._ownerId, 'fixture-digest', challenge, 0, old, new Date('2026-11-03T12:00:00Z'))
  assert.deepEqual(calls[0].data, { progress: { set: 0 }, active: { set: false } })
  await writeAward(foir, row._ownerId, 'fixture-digest', challenge, 0, { ...old, active: true, progress: 2, earnedAt: '2026-11-02T12:00:00Z' }, new Date('2026-11-03T12:00:00Z'))
  assert.deepEqual(calls[1].data, { progress: { set: 0 }, active: { set: false }, earnedAt: { set: '2026-11-02T12:00:00Z' } })
})
