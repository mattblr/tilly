import test from 'node:test'
import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import { verifyRevenueCatDelivery, readRevenueCatSubscription, subscriptionExpiry } from '../web/src/server/payments/revenuecat.ts'

const now = Date.parse('2026-11-03T12:00:00Z')
const actor = 'fixtureactor0001', other = 'fixtureactor0002'
const config = { signingSecret: 'fixture-signing-secret', appId: 'app_fixture' }
const event = { id: 'fixture-event-1', type: 'RENEWAL', app_id: config.appId,
  environment: 'SANDBOX', app_user_id: actor, expiration_at_ms: now + 99_999 }
function delivery(overrides = {}, timestamp = now / 1000) {
  const bytes = new TextEncoder().encode(JSON.stringify({ api_version: '1.0', event: { ...event, ...overrides } }))
  const digest = createHmac('sha256', config.signingSecret).update(`${timestamp}.`).update(bytes).digest('hex')
  return { bytes, signature: `t=${timestamp},v1=${digest}` }
}
const verify = value => verifyRevenueCatDelivery(value.bytes, value.signature, config, now)

test('authenticates exact raw bytes and returns selectors without trusting event expiry', async () => {
  assert.deepEqual(await verify(delivery()), { eventId: event.id, type: 'RENEWAL', actorIds: [actor] })
  const altered = delivery()
  altered.bytes = new TextEncoder().encode(new TextDecoder().decode(altered.bytes) + ' ')
  await assert.rejects(verify(altered), /signature/)
  await assert.rejects(verify({ ...delivery(), signature: 't=0,v1=bad' }), /signature/)
})
test('rejects expired, future and duplicate signature timestamps', async () => {
  for (const offset of [-301, 301]) await assert.rejects(verify(delivery({}, now / 1000 + offset)), /Expired/)
  const value = delivery()
  await assert.rejects(verify({ ...value, signature: `${value.signature},t=${now / 1000}` }), /signature/)
})
test('authenticated payloads obey the app boundary; both Apple environments select work', async () => {
  await assert.rejects(verify(delivery({ app_id: 'app_other' })), /did not match/)
  // App Review and TestFlight buy through Sandbox, so its events count too.
  for (const environment of ['SANDBOX', 'PRODUCTION'])
    assert.deepEqual((await verify(delivery({ environment }))).actorIds, [actor])
})
test('transfer selects both sides exactly once and ignores anonymous/non-actor selectors', async () => {
  const answer = await verify(delivery({ type: 'TRANSFER', app_user_id: undefined,
    transferred_from: [actor, '$RCAnonymousID:fixture'], transferred_to: [other, actor] }))
  assert.deepEqual(answer.actorIds, [actor, other])
  await assert.rejects(verify(delivery({ type: 'TRANSFER', transferred_from: [actor], transferred_to: 'not-an-array' })), /transfer/)
  assert.deepEqual((await verify(delivery({ app_user_id: 'person@example.test' }))).actorIds, [])
})
test('a transfer selects work in any environment, and the app stays pinned', async () => {
  const transfer = { type: 'TRANSFER', app_user_id: undefined,
    transferred_from: [actor], transferred_to: [other] }
  for (const environment of [undefined, null, 'SANDBOX', 'PRODUCTION'])
    assert.deepEqual((await verify(delivery({ ...transfer, environment }))).actorIds, [actor, other])
  await assert.rejects(verify(delivery({ ...transfer, environment: null, app_id: 'app_other' })), /did not match/)
})
test('subscriber selectors include original identity and bounded aliases without accepting other identifier formats', async () => {
  const answer = await verify(delivery({ app_user_id: '$RCAnonymousID:fixture',
    original_app_user_id: actor, aliases: [actor, other, 'person@example.test'] }))
  assert.deepEqual(answer.actorIds, [actor, other])
  assert.deepEqual((await verify(delivery({ app_user_id: undefined, original_app_user_id: actor }))).actorIds, [actor])
  for (const aliases of ['invalid', [null], Array(201).fill(actor)])
    await assert.rejects(verify(delivery({ aliases })), /identities/)
  await assert.rejects(verify(delivery({ original_app_user_id: other, aliases: Array(199).fill(actor) })), /identities/)
  assert.deepEqual((await verify(delivery({ type: 'VIRTUAL_CURRENCY_TRANSACTION', aliases: [actor, other] }))).actorIds, [])
  assert.deepEqual((await verify(delivery({ type: 'FUTURE_EVENT', app_user_id: actor }))).actorIds, [])
})
test('grace period extends access only through a valid later entitlement deadline', () => {
  const data = subscriber()
  const entitlement = data.subscriber.entitlements.premium
  entitlement.expires_date = '2026-11-02T12:00:00Z'
  entitlement.grace_period_expires_date = '2026-11-05T12:00:00Z'
  assert.equal(subscriptionExpiry(data.subscriber, now), '2026-11-05T12:00:00Z')
  entitlement.grace_period_expires_date = '2026-11-01T12:00:00Z'
  assert.equal(subscriptionExpiry(data.subscriber, now), null)
  entitlement.expires_date = '2026-12-03T12:00:00Z'
  assert.equal(subscriptionExpiry(data.subscriber, now), entitlement.expires_date)
  for (const grace of ['', 'invalid', 123]) {
    entitlement.grace_period_expires_date = grace
    assert.throws(() => subscriptionExpiry(data.subscriber, now), /grace/)
  }
  entitlement.grace_period_expires_date = '2026-12-05T12:00:00Z'
  data.subscriber.subscriptions['fixture-monthly'] = { store: 'app_store' }
  assert.throws(() => subscriptionExpiry(data.subscriber, now), /environment/)
})
function subscriber(active = true, sandbox = false, store = 'app_store') {
  return { subscriber: { entitlements: active ? { premium: {
    expires_date: '2026-12-03T12:00:00Z', product_identifier: 'fixture-monthly',
  } } : {}, subscriptions: { 'fixture-monthly': { is_sandbox: sandbox, store } } } }
}
test('fresh provider lookup determines renewal/refund, independently of delivery claims', async () => {
  let active = true
  const calls = []
  const fetcher = async (url, init) => {
    calls.push(url)
    assert.equal(init.headers.authorization, 'Bearer fixture-api-key')
    assert.equal(init.redirect, 'manual')
    assert.ok(init.signal)
    return Response.json(subscriber(active))
  }
  const read = () => readRevenueCatSubscription(actor, 'fixture-api-key', { fetcher, nowMs: now })
  assert.deepEqual(await read(), { active: true, until: '2026-12-03T12:00:00Z' })
  active = false
  assert.deepEqual(await read(), { active: false, until: null })
  assert.deepEqual(calls, Array(2).fill(`https://api.revenuecat.com/v1/subscribers/${actor}`))
})
test('provider failures/malformed data are not proof of revocation; Sandbox counts and the Test Store never does', async () => {
  const read = fetcher => readRevenueCatSubscription(actor, 'fixture-api-key', { fetcher, nowMs: now })
  await assert.rejects(read(async () => new Response(null, { status: 503 })))
  await assert.rejects(read(async () => Response.json({ subscriber: {} })), /incomplete/)
  await assert.rejects(read(async () => new Response(null, { status: 302, headers: { location: 'https://untrusted.example.test' } })))
  assert.equal((await read(async () => Response.json(subscriber(true, true)))).active, true)
  assert.deepEqual(await read(async () => Response.json(subscriber(true, true, 'test_store'))), { active: false, until: null })
  await assert.rejects(readRevenueCatSubscription('wrong@example.test', 'fixture-api-key', {}), /identity/)
})
