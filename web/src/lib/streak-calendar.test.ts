import test from 'node:test'
import assert from 'node:assert/strict'
import { endOfLocalDay, streakAt, validTimeZone } from './streak-calendar'
import { reminderFor, settingsInput, campaignInput } from '../server/operations/notification-policy'

const settings = { _id: 'settings', _ownerId: 'person', timeZone: 'Europe/London', reminderHour: 18, artReady: false, streakReminders: true, communityUpdates: false }
test('streak uses distinct local days, ignores future/invalid dates and survives DST', () => {
  assert.deepEqual(streakAt(['2026-03-28T12:00Z', '2026-03-29T11:00Z', '2026-03-29T12:00Z', 'bad', '2027-01-01'], new Date('2026-03-30T17:00Z'), 'Europe/London'), { current: 2, best: 2, caughtToday: false, day: '2026-03-30' })
  assert.equal(endOfLocalDay(new Date('2026-03-29T00:00Z'), 'Europe/London'), '2026-03-29T23:00:00.000Z')
  assert.equal(endOfLocalDay(new Date('2026-10-25T00:00Z'), 'Europe/London'), '2026-10-26T00:00:00.000Z')
})
test('reminder requires opt-in, local hour, unbroken streak and no capture today', () => {
  const now = new Date('2026-03-30T17:00Z'), dates = ['2026-03-29T12:00Z']
  assert.equal(reminderFor(settings, dates, now)?.idempotencyKey, 'streak:person:2026-03-30')
  assert.equal(reminderFor({ ...settings, streakReminders: false }, dates, now), null)
  assert.equal(reminderFor(settings, dates, new Date('2026-03-30T16:00Z')), null)
  assert.equal(reminderFor(settings, ['2026-03-28T12:00Z'], now), null)
  assert.equal(reminderFor(settings, [...dates, now.toISOString()], now), null)
  assert.equal(reminderFor({ ...settings, timeZone: 'bad' }, dates, now), null)
})
test('repeated autumn hour keeps one recipient/day key and next day cannot reuse eligibility', () => {
  const s = { ...settings, reminderHour: 1 }
  const dates = ['2026-10-24T12:00Z']
  assert.equal(reminderFor(s, dates, new Date('2026-10-25T00:30Z'))?.idempotencyKey, reminderFor(s, dates, new Date('2026-10-25T01:30Z'))?.idempotencyKey)
  assert.equal(reminderFor(s, dates, new Date('2026-10-26T01:30Z')), null)
})
test('settings and console inputs refuse forged clocks, non-booleans and unsafe links', () => {
  assert.equal(validTimeZone('Europe/London'), true)
  assert.throws(() => settingsInput({ ...settings, reminderHour: 24 }))
  assert.throws(() => settingsInput({ ...settings, streakReminders: 'true' }))
  const c = { title: 'Hello', message: 'Meet a cat', destination: 'feed', minimumStreak: 1, dryRun: true, campaignKey: 'campaign-1' }
  assert.equal(campaignInput(c).dryRun, true)
  assert.throws(() => campaignInput({ ...c, destination: 'https://outside.example' }))
  assert.throws(() => campaignInput({ ...c, minimumStreak: -1 }))
})
