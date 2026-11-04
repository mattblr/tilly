import { test } from 'node:test'
import assert from 'node:assert/strict'
import { requireAppearanceAccess, initialAppearanceEligibility } from './appearance-policy.ts'
const now = new Date('2026-11-01T12:00:00Z')
const active = { _ownerId: 'creator', until: '2026-11-02T12:00:00Z' }
test('regular is the initial Fóir setting and includes signed-in free and Premium members', () => {
  assert.equal(initialAppearanceEligibility, 'regular')
  requireAppearanceAccess('creator', 'regular', [], now)
  requireAppearanceAccess('creator', 'regular', [active], now)
  assert.throws(() => requireAppearanceAccess(null, 'regular', [], now), { code: 'UNAUTHENTICATED' })
})
test('a current Premium-only setting refuses free, expired and foreign grants', () => {
  requireAppearanceAccess('creator', 'premium', [active], now)
  for (const grants of [[], [{ ...active, _ownerId: 'other' }], [{ ...active, until: now.toISOString() }], [{ ...active, until: 'bad date' }], [{ ...active, until: null }]])
    assert.throws(() => requireAppearanceAccess('creator', 'premium', grants, now), { code: 'PREMIUM_REQUIRED' })
  for (const setting of [null, undefined, 'everyone', 'Premium', true])
    assert.throws(() => requireAppearanceAccess('creator', setting, [active], now), { code: 'NOT_CONFIGURED' })
})
