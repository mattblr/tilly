import test from 'node:test'
import assert from 'node:assert/strict'
import { reconcileRevenueCatGrant } from '../web/src/server/payments/revenuecat-grants.ts'

const actor = 'fixtureactor0001', key = `revenuecat~${actor}`
const epoch = new Date(0).toISOString(), until = '2099-01-01T00:00:00Z'
function fixture() {
  const rows = [], updates = []
  let version = 0, providerCalls = 0, active = true
  const stamp = () => new Date(1_800_000_000_000 + ++version).toISOString()
  const canonical = () => rows.find(row => row._naturalKey === key)
  const app = {
    async request(query, variables) {
      if (query.includes('query RevenueCatGrant')) {
        assert.equal(variables.key, key)
        return { premiumGrant: structuredClone(canonical() ?? null) }
      }
      assert.ok(query.includes('mutation CreateRevenueCatGrant'))
      assert.deepEqual(variables, { input: { naturalKey: key, until: epoch, note: 'Subscription' }, owner: actor })
      if (canonical()) throw new Error('Natural key exists')
      rows.push({ _id: 'canonical', _naturalKey: key, _ownerId: actor,
        _updatedAt: stamp(), note: 'Subscription', until: epoch })
      return { createPremiumGrant: { record: { _id: 'canonical' } } }
    },
    records: { async updateMany(model, { where, data }) {
      assert.equal(model, 'premium-grant')
      updates.push(structuredClone({ where, data }))
      if (where.id) {
        const row = canonical()
        assert.equal(where.id.eq, row._id)
        assert.equal(where.ownerId.eq, actor)
        assert.equal(where.naturalKey.eq, key)
        row.until = data.until.set
        row._updatedAt = stamp()
        return { count: 1, ids: [row._id] }
      }
      assert.deepEqual(where, { ownerId: { eq: actor }, note: { eq: 'Subscription' },
        OR: [{ naturalKey: { isNull: true } }, { NOT: { naturalKey: { eq: key } } }] })
      const legacy = rows.filter(row => row._ownerId === actor && row.note === 'Subscription' && row._naturalKey !== key)
      for (const row of legacy) row.until = data.until.set
      return { count: legacy.length, ids: legacy.map(row => row._id) }
    } },
  }
  const options = { fetcher: async () => {
    providerCalls++
    return Response.json({ subscriber: { entitlements: active ? { premium: {
      expires_date: until, product_identifier: 'fixture-monthly',
    } } : {}, subscriptions: { 'fixture-monthly': { is_sandbox: false, store: 'app_store' } } } })
  } }
  return { rows, updates, app, canonical, stamp,
    run: () => reconcileRevenueCatGrant(app, actor, 'fixture-api-key', options),
    setActive: value => { active = value },
    providerCalls: () => providerCalls }
}
test('repeated serialized refreshes reuse one grant and fetch current provider state each time', async () => {
  const f = fixture()
  assert.equal((await f.run()).active, true)
  f.setActive(false)
  assert.equal((await f.run()).active, false)
  assert.equal(f.rows.length, 1)
  assert.equal(f.providerCalls(), 2)
  assert.equal(f.canonical().until, epoch)
})
test('legacy subscription cleanup preserves canonical, manual, Stripe and other-owner grants', async () => {
  const f = fixture()
  f.rows.push(
    { _id: 'legacy-null', _naturalKey: null, _ownerId: actor, note: 'Subscription', until },
    { _id: 'legacy-key', _naturalKey: 'old-key', _ownerId: actor, note: 'Subscription', until },
    { _id: 'manual', _naturalKey: null, _ownerId: actor, note: 'Free access', until },
    { _id: 'stripe', _naturalKey: 'stripe~sub_fixture', _ownerId: actor, note: 'Stripe subscription:sub_fixture', until },
    { _id: 'other', _naturalKey: null, _ownerId: 'fixtureactor0002', note: 'Subscription', until },
  )
  await f.run()
  for (const row of f.rows) assert.equal(row.until, row._id.startsWith('legacy-') ? epoch : until)
})
test('a missing target fails without legacy cleanup', async () => {
  const f = fixture()
  f.app.records.updateMany = async () => ({count:0,ids:[]})
  await assert.rejects(f.run(), /ambiguous/)
  assert.equal(f.canonical().until, epoch)
})
test('a create failure without an actual canonical row is propagated', async () => {
  const f = fixture(), original = f.app.request
  f.app.request = async (query, variables) => {
    if (query.includes('mutation')) throw new Error('Create was refused')
    return original(query, variables)
  }
  await assert.rejects(f.run(), /Create was refused/)
  assert.equal(f.providerCalls(), 0)
})
