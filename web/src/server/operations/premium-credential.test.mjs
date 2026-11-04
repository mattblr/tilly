import { test } from 'node:test'
import assert from 'node:assert/strict'
import { subscriptionExpiry } from './premium.ts'
import { reconcileRevenueCatDelivery } from '../payments/revenuecat-handlers.ts'
import manifest from './manifest.ts'

const actor = 'fixtureactor01', naturalKey = `revenuecat~${actor}`
const epoch = new Date(0).toISOString(), expiry = '2099-01-01T00:00:00Z'
const ingress = { userId: actor, apiUrl: 'https://api.example.test',
  dispatch: { token: () => 'fixture-dispatch', context: 'operation=tilly.claim-premium' } }
const credential = { revenueCatApiKey: 'fixture-subscriber-lookup-key', openai: 'unrelated-provider-field' }
async function run({ fields = credential, credentialError = false, active = false,
  sandbox = false, store = 'app_store', redirect = false, held = [], malformed = false,
  canonicalOwner = actor } = {}) {
  const original = globalThis.fetch, calls = [], writes = []
  let revision = 0
  const stamp = () => new Date(1_800_000_000_000 + ++revision).toISOString()
  const rows = [
    { _id: 'free', _naturalKey: null, _ownerId: actor, until: expiry, note: 'Free access' },
    { _id: 'stripe', _naturalKey: 'stripe~sub_fixture', _ownerId: actor, until: expiry, note: 'Stripe subscription:sub_fixture' },
    ...held.map(row => ({ _naturalKey: null, _ownerId: actor, _updatedAt: stamp(), ...row })),
  ]
  const canonical = () => rows.find(row => row._naturalKey === naturalKey)
  try {
    globalThis.fetch = async (input, init) => {
      const url = String(input), headers = new Headers(init.headers)
      calls.push(url)
      if (url.startsWith('https://api.revenuecat.com/')) {
        assert.equal(credentialError, false, 'a refused credential cannot fall back to a provider call')
        assert.equal(canonicalOwner, actor, 'a wrong-owner canonical row cannot reach provider verification')
        assert.equal(url, `https://api.revenuecat.com/v1/subscribers/${actor}`)
        assert.equal(headers.get('authorization'), `Bearer ${credential.revenueCatApiKey}`)
        assert.equal(init.redirect, 'manual'); assert.ok(init.signal)
        assert.equal(headers.get('x-foir-token'), null)
        if (redirect) return new Response('{}', { status: 302, headers: { location: 'https://untrusted.example.test/' } })
        if (malformed) return Response.json({ subscriber: {} })
        return Response.json({ subscriber: {
          entitlements: active ? { premium: { expires_date: expiry, product_identifier: 'fixture-monthly' } } : {},
          subscriptions: { 'fixture-monthly': { is_sandbox: sandbox, store } },
        } })
      }
      assert.equal(url, 'https://api.example.test/graphql')
      assert.equal(headers.get('x-foir-token'), 'fixture-dispatch')
      assert.equal(headers.get('authorization'), null)
      const { query, variables } = JSON.parse(init.body)
      assert.equal(init.body.includes(credential.revenueCatApiKey), false)
      if (!query) return Response.json({ errors: [{ message: 'PersistedQueryNotFound', extensions: { code: 'PERSISTED_QUERY_NOT_FOUND' } }] })
      if (query.includes('integrationConfig')) return Response.json({data:{integrationConfig:{name:'tilly',enabled:true,config:{revenueCatAppId:'app_fixture'},sources:[],sinks:[],targetModels:[]}}})
      if (query.includes('query AppUser(')) return Response.json({data:{user:{id:actor}}})
      if (query.includes('appCredential')) {
        if (credentialError) return Response.json({ errors: [{ message: 'Refused', extensions: { code: 'PERMISSION_DENIED' } }] })
        return Response.json({ data: { appCredential: { value: Buffer.from(JSON.stringify({...fields,revenueCatWebhookSecret:'fixture-hmac'})).toString('base64') } } })
      }
      if (query.includes('query RevenueCatGrant')) {
        assert.deepEqual(variables, { key: naturalKey })
        return Response.json({ data: { premiumGrant: canonical() ?? null } })
      }
      if (query.includes('createPremiumGrant')) {
        assert.deepEqual(variables, { input: { naturalKey, until: epoch, note: 'Subscription' }, owner: actor })
        assert.equal(canonical(), undefined)
        const row = { _id: 'canonical', _naturalKey: naturalKey, _ownerId: canonicalOwner,
          _updatedAt: stamp(), until: epoch, note: 'Subscription' }
        rows.push(row); writes.push({ kind: 'create', variables })
        return Response.json({ data: { createPremiumGrant: { record: { _id: row._id } } } })
      }
      if (query.includes('updateManyPremiumGrant')) {
        const { where, data } = variables
        let selected
        if (where.id) {
          assert.deepEqual(where, { id: { eq: canonical()._id }, ownerId: { eq: actor },
            naturalKey: { eq: naturalKey }, note: { eq: 'Subscription' } })
          selected = [canonical()]
        } else {
          assert.deepEqual(where, { ownerId: { eq: actor }, note: { eq: 'Subscription' },
            OR: [{ naturalKey: { isNull: true } }, { NOT: { naturalKey: { eq: naturalKey } } }] })
          selected = rows.filter(row => row._ownerId === actor && row.note === 'Subscription' && row._naturalKey !== naturalKey)
        }
        assert.equal(typeof data.until.set, 'string')
        writes.push({ kind: 'updateMany', variables, ids: selected.map(row => row._id) })
        for (const row of selected) { row.until = data.until.set; row._updatedAt = stamp() }
        return Response.json({ data: { updateManyPremiumGrant: { count: selected.length, ids: selected.map(row => row._id) } } })
      }
      assert.fail('Unexpected Fóir read or write')
    }
    const answer = await reconcileRevenueCatDelivery({...ingress,userId:undefined}, {actorIds:[actor]}, undefined)
    for (const id of ['free', 'stripe']) assert.equal(rows.find(row => row._id === id).until, expiry)
    return { answer, calls, writes, rows, canonical: canonical() }
  } catch (error) {
    if (redirect || malformed) {
      assert.equal(writes.some(write => write.kind === 'updateMany'), false,
        'provider failure cannot update or revoke an existing grant')
      for (const old of held) assert.equal(rows.find(row => row._id === old._id).until, old.until)
    }
    throw error
  } finally { globalThis.fetch = original }
}

test('Webhook reconciliation reads its install credential and verifies selected actor', async () => {
  const { answer, calls, writes, canonical } = await run({ active: true })
  assert.equal((canonical.until === expiry), true)
  assert.equal(calls.filter(url => url.startsWith('https://api.revenuecat.com/')).length, 1)
  assert.equal(canonical._ownerId, actor); assert.equal(canonical.until, expiry)
  assert.equal(writes[0].kind, 'create')
  const claim = manifest('https://app.example.test').operations.find(op => op.key === 'claim-premium')
  assert.deepEqual(claim.grants, ['appsecrets:read', 'records:read:premium-grant'])
  assert.equal(claim.grants.includes('secrets:read'), false)
})
test('missing credential fails before provider calls or grant writes', async () => {
  await assert.rejects(run({fields:{openai:credential.openai}}),/not configured/)
})
test('refused install credential never falls back or calls RevenueCat', async () => {
  await assert.rejects(run({ credentialError: true }))
})
test('no subscription and the Test Store preserve manual and Stripe grants', async () => {
  for (const options of [{}, { active: true, store: 'test_store' }, { active: true, sandbox: true, store: 'test_store' }]) {
    const { answer, canonical, writes } = await run(options)
    assert.equal((canonical.until === expiry), false); assert.equal(canonical.until, epoch)
    for (const id of ['free', 'stripe']) assert.equal(writes.some(write => write.ids?.includes(id)), false)
  }
})
test('Signed callers cannot invoke the install-only writer', async () => {
  const original = globalThis.fetch
  globalThis.fetch = async () => assert.fail('wrong-actor refresh performed a fetch')
  try { await assert.rejects(reconcileRevenueCatDelivery(ingress, {actorIds:['fixtureactor02']}), /install dispatch/) }
  finally { globalThis.fetch = original }
})
test('provider redirect is refused without following it', async () => {
  await assert.rejects(run({ redirect: true, held: [{ _id: 'existing', _naturalKey: naturalKey, note: 'Subscription', until: expiry }] }), /302/)
})
test('wrong-owner canonical row refuses before provider verification', async () => {
  await assert.rejects(run({ active: true, canonicalOwner: 'fixtureactor02' }), /identity/)
})
test('renewal updates canonical access and expires superseded subscription grants', async () => {
  const held = ['one', 'two'].map(_id => ({ _id, note: 'Subscription', until: '2098-01-01T00:00:00Z' }))
  const { answer, canonical, rows } = await run({ active: true, held })
  assert.equal((canonical.until === expiry), true); assert.equal(canonical.until, expiry)
  for (const old of held) assert.equal(rows.find(row => row._id === old._id).until, epoch)
})
test('lapse or refund withdraws canonical and legacy access while preserving unrelated grants', async () => {
  const held = [
    { _id: 'existing', _naturalKey: naturalKey, until: expiry, note: 'Subscription' },
    { _id: 'legacy', until: expiry, note: 'Subscription' },
  ]
  const { answer, canonical, rows, writes } = await run({ held })
  assert.equal((canonical.until === expiry), false); assert.equal(canonical.until, epoch)
  assert.equal(rows.find(row => row._id === 'legacy').until, epoch)
  assert.equal(writes.some(write => write.kind === 'create'), false)
})
test('existing canonical subscription does not create a duplicate', async () => {
  const held = [{ _id: 'existing', _naturalKey: naturalKey, note: 'Subscription', until: expiry }]
  const { writes, canonical, rows } = await run({ active: true, held })
  assert.equal(writes.some(write => write.kind === 'create'), false)
  assert.equal(rows.filter(row => row._naturalKey === naturalKey).length, 1)
  assert.equal(canonical.until, expiry)
})
test('malformed provider state is not proof of revocation', async () => {
  await assert.rejects(run({ malformed: true, held: [{ _id: 'existing', _naturalKey: naturalKey, note: 'Subscription', until: expiry }] }), /incomplete subscription data/)
  const future = { expires_date: expiry, product_identifier: 'monthly' }
  for (const subscriber of [undefined, {}, { entitlements: {} },
    { entitlements: { premium: { ...future, expires_date: 'not-a-date' } }, subscriptions: {} },
    { entitlements: { premium: future }, subscriptions: {} },
    { entitlements: { premium: future }, subscriptions: { monthly: { store: 'app_store' } } }]) assert.throws(() => subscriptionExpiry(subscriber))
  assert.equal(subscriptionExpiry({ entitlements: { premium: { ...future, expires_date: '2000-01-01T00:00:00Z' } }, subscriptions: {} }), null)
})
test('an App Store Sandbox purchase grants Premium to anyone; the Test Store never does', async () => {
  // App Review and TestFlight buy through Sandbox.
  assert.equal((await run({ active: true, sandbox: true })).canonical.until, expiry)
  assert.equal((await run({ active: true, sandbox: true, store: 'test_store' })).canonical.until, epoch)
})
