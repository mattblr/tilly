import assert from 'node:assert/strict'
import test from 'node:test'
import {challengeIsActive, verifiedChallengeKeys} from './challenges'

test('challenge UI appears only inside the enabled exact window', () => {
  const row = {enabled: true, startsAt: '2026-11-02T12:00:00Z', endsAt: '2026-11-07T12:00:00Z'}
  const start = Date.parse(row.startsAt), end = Date.parse(row.endsAt)
  assert.equal(challengeIsActive(row, start), true)
  assert.equal(challengeIsActive(row, end - 1), true)
  assert.equal(challengeIsActive(row, start - 1), false)
  assert.equal(challengeIsActive(row, end), false)
  assert.equal(challengeIsActive({...row, enabled: false}, start), false)
  assert.equal(challengeIsActive({...row, startsAt: null}, start), false)
  assert.equal(challengeIsActive({...row, endsAt: 'bad'}, start), false)
})

test('verified post indicators require the complete bounded server evidence shape', () => {
  const valid = {challengeKey: 'pumpkins', criteriaDigest: 'a'.repeat(64), highlightKey: 'pumpkin'}
  assert.deepEqual(verifiedChallengeKeys([valid, valid]), ['pumpkin'])
  assert.deepEqual(verifiedChallengeKeys([{highlightKey: 'pumpkin'}]), [])
  assert.deepEqual(verifiedChallengeKeys([{...valid, criteriaDigest: 'invented'}]), [])
  assert.deepEqual(verifiedChallengeKeys(Array(33).fill(valid)), [])
})
