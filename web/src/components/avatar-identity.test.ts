import assert from 'node:assert/strict'
import test from 'node:test'
import { avatarIdentity } from './avatar-identity'
import geometry from '../../../ios/Tilly/Resources/AvatarGeometry.json'

test('v1 avatar identities keep the published Swift/web vectors and ASCII normalization', () => {
  assert.deepEqual(avatarIdentity('alice'), {
    ears: 0,
    head: 1,
    marking: 2,
    eyes: 2,
  })
  assert.deepEqual(avatarIdentity(' BOB\n'), {
    ears: 0,
    head: 1,
    marking: 1,
    eyes: 2,
  })
  assert.deepEqual(avatarIdentity('猫'), {
    ears: 1,
    head: 2,
    marking: 2,
    eyes: 2,
  })
  assert.deepEqual(avatarIdentity(' BOB\n'), avatarIdentity('bob'))
})
test('all shared avatar geometry is bounded and uses the same supported path grammar', () => {
  const arity = [3, 3, 5, 7, 1]
  const walk = (value: unknown): void => {
    assert.ok(Array.isArray(value))
    if (typeof value[0] === 'number') {
      assert.equal(value.length, arity[value[0]])
      for (const coordinate of value.slice(1))
        assert.ok(coordinate >= 0 && coordinate <= 96)
    } else for (const child of value) walk(child)
  }
  for (const value of Object.values(geometry)) walk(value)
})
