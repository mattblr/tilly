import assert from 'node:assert/strict'
import test from 'node:test'
import type { AppClient } from '@foir/sdk/app'
import { billingStore } from './foir-store'

test('private customer mappings have distinct record addresses for each owner', async () => {
  const writes: { naturalKey: string; ownerId: string }[] = []
  const app = {
    records: {
      upsert: async (input: { naturalKey: string; ownerId: string }) =>
        writes.push(input),
    },
  } as unknown as AppClient
  await billingStore(app, 'alice').keepCustomer('alice', 'cus_alice')
  await billingStore(app, 'bob').keepCustomer('bob', 'cus_bob')
  assert.equal(new Set(writes.map((write) => write.naturalKey)).size, 2)
  for (const write of writes)
    assert.match(write.naturalKey, /^[A-Za-z0-9_.~-]+$/)
  assert.deepEqual(
    writes.map((write) => write.ownerId),
    ['alice', 'bob'],
  )
})

test('signed-in billing uses identity-resolved private reads and refuses another actor before reading', async () => {
  const queries: string[] = []
  const app = {
    request: async (query: string) => {
      queries.push(query)
      return query.includes('myPremiumGrants')
        ? { grants: { totalCount: 1 } }
        : {
            accounts: {
              edges: [{ node: { _ownerId: 'me', customerId: 'cus_fixture' } }],
            },
          }
    },
  } as unknown as AppClient
  const store = billingStore(app, 'me')
  assert.equal(await store.customerId('me'), 'cus_fixture')
  assert.equal(await store.hasPremium('me'), true)
  assert.match(queries[0], /myWebBillingAccounts/)
  assert.match(queries[1], /myPremiumGrants/)
  await assert.rejects(store.customerId('other'), /identity/)
  assert.equal(queries.length, 2)
})
test('an install reconciliation retains its explicit owner filter and verifies the returned owner', async () => {
  const app = {
    request: async (query: string, vars: { me: string }) => {
      assert.match(query, /accounts: webBillingAccounts/)
      assert.equal(vars.me, 'me')
      return {
        accounts: {
          edges: [{ node: { _ownerId: 'other', customerId: 'cus_fixture' } }],
        },
      }
    },
  } as unknown as AppClient
  await assert.rejects(billingStore(app).customerId('me'), /identity/)
})
