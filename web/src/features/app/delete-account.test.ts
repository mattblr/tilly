import test from 'node:test'
import assert from 'node:assert/strict'
import { deleteOwnAccount, deletionSessionForUser } from './delete-account'

test('only confirmed API success clears a closed account; counts are not erasure completion', async () => {
  const events: string[] = []
  const client = { raw: async () => { events.push('request'); return { deleteMyAccount: { success: true, recordsDeleted: 3, filesDeleted: 1 } } } }
  const result = await deleteOwnAccount(client as never, async () => { events.push('forget') })
  assert.deepEqual(events, ['request', 'forget'])
  assert.equal(result.recordsDeleted, 3)
})

test('deletion credential lookup refuses a replacement account before and during token refresh', async () => {
  let userId = 'original', reads = 0
  const bound = deletionSessionForUser({ getUser: async () => ({ userId }), getToken: async () => { reads++; userId = 'replacement'; return 'replacement-token' } }, 'original')
  await assert.rejects(bound.getToken(), /account changed/)
  assert.equal(reads, 1)
  await assert.rejects(bound.refreshToken(), /account changed/)
  assert.equal(reads, 1)
})

test('a successful old-account deletion never cleans up a replacement account', async () => {
  let userId: string | null = 'original', cleaned = false
  const bound = deletionSessionForUser({ getUser: async () => userId ? { userId } : null, getToken: async () => 'original-token' }, 'original')
  assert.equal(await bound.getToken(), 'original-token')
  const client = { raw: async () => { userId = 'replacement'; return { deleteMyAccount: { success: true, recordsDeleted: 1, filesDeleted: 1 } } } }
  await assert.rejects(deleteOwnAccount(client as never, async () => { cleaned = true }, bound.assertNotReplaced), /account changed/)
  assert.equal(cleaned, false)
  userId = null
  await deleteOwnAccount({ raw: async () => ({ deleteMyAccount: { success: true, recordsDeleted: 1, filesDeleted: 1 } }) } as never,
    async () => { cleaned = true }, bound.assertNotReplaced)
  assert.equal(cleaned, true)
  await assert.rejects(bound.getToken(), /account changed/)
})
test('refused, missing and failed deletion never discard the active account', async () => {
  for (const value of [null, { success: false }, undefined]) {
    let cleared = false
    const client = { raw: async () => ({ deleteMyAccount: value }) }
    await assert.rejects(deleteOwnAccount(client as never, async () => { cleared = true }))
    assert.equal(cleared, false)
  }
  let cleared = false
  const client = { raw: async () => { throw new Error('Recent sign-in required') } }
  await assert.rejects(deleteOwnAccount(client as never, async () => { cleared = true }))
  assert.equal(cleared, false)
})
