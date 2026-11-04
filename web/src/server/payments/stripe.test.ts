import assert from 'node:assert/strict'
import test from 'node:test'
import { runAsyncSlice } from '../operations/async'
import { continueRun } from '@foir/sdk/server'
import {
  StripeProvider,
  checkoutForActor,
  reconcileStripeSlice,
  verifyStripeDelivery,
  isBillingEvent,
  type BillingStore,
} from './stripe'
const actor = 'user123456789',
  project = 'project-fixture'
const config = {
  secretKey: 'fixture-secret',
  webhookSecret: 'fixture-webhook-secret',
  priceId: 'price_fixture',
  siteOrigin: 'https://site.example',
  projectId: project,
  mode: 'test' as const,
}
const metadata = { tilly_user_id: actor, tilly_project_id: project }
function fixture(two = false) {
  let status = 'active',
    refunded = false,
    live = false,
    deleted = false
  let periodEnd = Math.floor(Date.now() / 1000) + 86400, cancelAtPeriodEnd = false, failPath: string | null = null
  let secondPayment = false,
    unsettledPayment = false,
    fraudWarning = false,
    disputed = false
  const calls: Array<{
    path: string
    method: string
    form: URLSearchParams
    headers: Headers
  }> = []
  const provider = new StripeProvider(config, async (url, init) => {
    const parsed = new URL(String(url)),
      path = parsed.pathname,
      method = init?.method ?? 'GET',
      form = new URLSearchParams(String(init?.body ?? ''))
    calls.push({ path, method, form, headers: new Headers(init?.headers) })
    if (failPath === path) { failPath = null; throw new Error('Synthetic provider outage') }
    const subscription = {
      id: 'sub_fixture',
      livemode: live,
      status,
      cancel_at_period_end: cancelAtPeriodEnd,
      metadata,
      latest_invoice: 'in_fixture',
      items: {
        data: [
          {
            price: { id: 'price_fixture' },
            current_period_end: periodEnd,
          },
        ],
      },
    }
    let result: unknown
    if (path.startsWith('/v1/prices/'))
      result = {
        id: 'price_fixture',
        livemode: live,
        active: true,
        recurring: { interval: 'month' },
      }
    else if (path === '/v1/customers')
      result = {
        id: deleted ? 'cus_replacement' : 'cus_fixture',
        livemode: live,
        metadata,
      }
    else if (path.startsWith('/v1/customers/'))
      result =
        deleted && path.endsWith('/cus_fixture')
          ? { id: 'cus_fixture', deleted: true }
          : { id: path.split('/').at(-1), livemode: live, metadata }
    else if (path === '/v1/subscriptions') {
      const rows = two
        ? [subscription, { ...subscription, id: 'sub_second' }]
        : [subscription]
      const start = parsed.searchParams.has('starting_after') ? 1 : 0
      result =
        parsed.searchParams.get('limit') === '1'
          ? {
              data: rows.slice(start, start + 1),
              has_more: start + 1 < rows.length,
            }
          : { data: rows, has_more: false }
    } else if (path === '/v1/checkout/sessions' && method === 'GET')
      result = { data: [], has_more: false }
    else if (path === '/v1/checkout/sessions')
      result = {
        id: 'cs_test_fixture',
        livemode: live,
        url: 'https://checkout.stripe.com/c/pay/fixture',
      }
    else if (path === '/v1/billing_portal/sessions')
      result = {
        id: 'bps_fixture',
        livemode: live,
        url: 'https://billing.stripe.com/p/session/fixture',
      }
    else if (path.startsWith('/v1/events/'))
      result = {
        id: path.split('/').at(-1),
        livemode: live,
        type: 'customer.subscription.updated',
        data: { object: { customer: 'cus_fixture' } },
      }
    else if (path.startsWith('/v1/invoices/'))
      result = { id: 'in_fixture', status: 'paid', amount_paid: 1000 }
    else if (path === '/v1/invoice_payments')
      result = {
        data: [
          {
            id: 'inpay_fixture',
            status: 'paid',
            payment: { type: 'payment_intent', payment_intent: 'pi_fixture' },
          },
          ...(secondPayment
            ? [
                {
                  id: 'inpay_second',
                  status: 'paid',
                  payment: { type: 'charge', charge: 'ch_second' },
                },
              ]
            : []),
          ...(unsettledPayment
            ? [
                {
                  id: 'inpay_open',
                  status: 'open',
                  payment: {
                    type: 'payment_intent',
                    payment_intent: 'pi_unpaid',
                  },
                },
              ]
            : []),
        ],
        has_more: false,
      }
    else if (path.startsWith('/v1/payment_intents/'))
      result = {
        id: 'pi_fixture',
        customer: 'cus_fixture',
        livemode: live,
        latest_charge: { id: 'ch_fixture', refunded, disputed },
      }
    else if (path === '/v1/charges/ch_second')
      result = {
        id: 'ch_second',
        customer: 'cus_fixture',
        refunded: false,
        disputed: false,
      }
    else if (path === '/v1/radar/early_fraud_warnings')
      result = {
        data: fraudWarning ? [{ id: 'issfr_fixture', actionable: true }] : [],
        has_more: false,
      }
    else throw new Error('Unexpected fixture request: ' + path)
    return Response.json(result)
  })
  return {
    provider,
    calls,
    period: (value: number) => { periodEnd = value },
    cancelAtEnd: () => { cancelAtPeriodEnd = true },
    failOnce: (path: string) => { failPath = path },
    setStatus: (value: string) => {
      status = value
    },
    refund: () => {
      refunded = true
    },
    live: () => {
      live = true
    },
    deleted: () => {
      deleted = true
    },
    splitPayment: () => {
      secondPayment = true
    },
    openPayment: () => {
      unsettledPayment = true
    },
    fraud: (value = true) => {
      fraudWarning = value
    },
    dispute: () => {
      disputed = true
    },
  }
}
function store() {
  let customer: string | null = 'cus_fixture',
    premium = false
  const grants = new Map([
    ['free', 'keep-free'],
    ['revenuecat', 'keep-native'],
  ])
  const state: BillingStore = {
    actorForCustomer: async () => actor,
    revokeStripeGrants: async () => {
      for (const key of grants.keys())
        if (key.startsWith('sub_')) grants.set(key, new Date(0).toISOString())
    },
    customerId: async () => customer,
    keepCustomer: async (_actor, id) => {
      customer = id
    },
    hasPremium: async () => premium,
    stripeGrant: async (_actor, id, until) => {
      grants.set(id, until)
    },
  }
  return {
    state,
    grants,
    withoutCustomer: () => {
      customer = null
    },
    premium: () => {
      premium = true
    },
  }
}
async function reconcileStripe(
  provider: StripeProvider,
  state: BillingStore,
  eventId: string,
) {
  let after: string | undefined
  do {
    after =
      (await reconcileStripeSlice(
        provider,
        state,
        eventId,
        'cus_fixture',
        after,
      )) ?? undefined
  } while (after)
}
test('checkout uses the server price, verified stable identity, fixed return origin and provider idempotency', async () => {
  const f = fixture(),
    s = store()
  f.setStatus('canceled')
  s.withoutCustomer()
  const reply = await checkoutForActor(f.provider, s.state, actor)
  assert.equal(reply.url, 'https://checkout.stripe.com/c/pay/fixture')
  const request = f.calls.find(
    (call) => call.path === '/v1/checkout/sessions' && call.method === 'POST',
  )!
  assert.equal(request.form.get('line_items[0][price]'), 'price_fixture')
  assert.equal(request.form.get('client_reference_id'), actor)
  assert.equal(
    request.form.get('success_url'),
    'https://site.example/account?checkout=returned',
  )
  assert.equal(
    request.headers.get('Idempotency-Key'),
    'tilly-checkout:cus_fixture:price_fixture:first',
  )
  assert.equal(request.form.has('customer_email'), false)
  assert.equal(request.form.get('managed_payments[enabled]'), 'false')
})
test('existing Premium and subscriptions prevent duplicate purchases; live/test mismatch fails before customer creation', async () => {
  const f = fixture(),
    s = store()
  s.premium()
  await assert.rejects(
    checkoutForActor(f.provider, s.state, actor),
    /already active/,
  )
  assert.equal(f.calls.length, 0)
  await assert.rejects(
    f.provider.checkout('cus_fixture', actor),
    /already have/,
  )
  const live = fixture()
  live.live()
  await assert.rejects(live.provider.createCustomer(actor, 'one'), /mode/)
  assert.ok(!live.calls.some((call) => call.method === 'POST'))
})
test('duplicate and out-of-order event IDs re-read current provider state and touch Stripe grants only', async () => {
  const f = fixture(),
    s = store()
  await reconcileStripe(f.provider, s.state, 'evt_new')
  assert.ok(Date.parse(s.grants.get('sub_fixture')!) > Date.now())
  f.setStatus('canceled')
  await reconcileStripe(f.provider, s.state, 'evt_old')
  await reconcileStripe(f.provider, s.state, 'evt_old')
  assert.equal(s.grants.get('sub_fixture'), new Date(0).toISOString())
  assert.equal(s.grants.get('free'), 'keep-free')
  assert.equal(s.grants.get('revenuecat'), 'keep-native')
})
test('a refunded latest invoice revokes Stripe access even if subscription status remains active', async () => {
  const f = fixture(),
    s = store()
  f.refund()
  await reconcileStripe(f.provider, s.state, 'evt_refund')
  assert.equal(s.grants.get('sub_fixture'), new Date(0).toISOString())
})
test('one fully refunded split payment remains a partial invoice refund', async () => {
  const f = fixture(),
    s = store()
  f.refund()
  f.splitPayment()
  await reconcileStripe(f.provider, s.state, 'evt_partial')
  assert.ok(Date.parse(s.grants.get('sub_fixture')!) > Date.now())
})
test('unsettled invoice payments are excluded from entitlement confirmation', async () => {
  const f = fixture(),
    s = store()
  f.openPayment()
  await reconcileStripe(f.provider, s.state, 'evt_paid')
  assert.ok(Date.parse(s.grants.get('sub_fixture')!) > Date.now())
  assert.ok(!f.calls.some((call) => call.path.includes('pi_unpaid')))
})
test('current early fraud warnings suspend only Stripe access and a cleared warning restores it', async () => {
  const f = fixture(),
    s = store()
  f.fraud()
  await reconcileStripe(f.provider, s.state, 'evt_fraud')
  assert.equal(s.grants.get('sub_fixture'), new Date(0).toISOString())
  assert.equal(s.grants.get('free'), 'keep-free')
  assert.equal(s.grants.get('revenuecat'), 'keep-native')
  f.fraud(false)
  await reconcileStripe(f.provider, s.state, 'evt_updated')
  assert.ok(Date.parse(s.grants.get('sub_fixture')!) > Date.now())
  assert.ok(isBillingEvent('radar.early_fraud_warning.created'))
  assert.ok(isBillingEvent('radar.early_fraud_warning.updated'))
  assert.ok(isBillingEvent('invoice_payment.paid'))
})
test('a current disputed charge revokes the Stripe grant', async () => {
  const f = fixture(),
    s = store()
  f.dispute()
  await reconcileStripe(f.provider, s.state, 'evt_dispute')
  assert.equal(s.grants.get('sub_fixture'), new Date(0).toISOString())
})
test('payment-intent event ownership follows Stripe resources instead of event metadata', async () => {
  const f = fixture()
  assert.equal(
    await f.provider.eventCustomer({
      data: {
        object: {
          payment_intent: 'pi_fixture',
          metadata: { tilly_user_id: 'foreign' },
        },
      },
    }),
    'cus_fixture',
  )
})
test('a deleted customer is replaced under a new stable generation before Checkout', async () => {
  const f = fixture(),
    s = store()
  f.deleted()
  f.setStatus('canceled')
  await checkoutForActor(f.provider, s.state, actor)
  assert.equal(await s.state.customerId(actor), 'cus_replacement')
  const create = f.calls.find(
    (call) => call.path === '/v1/customers' && call.method === 'POST',
  )!
  assert.equal(
    create.headers.get('Idempotency-Key'),
    `tilly-customer:${project}:${actor}:after:cus_fixture`,
  )
})
test('portal rejects another user and fixes the return destination', async () => {
  const f = fixture()
  await assert.rejects(
    f.provider.portal('cus_fixture', 'anotheruser123', 'one'),
    /not yours/,
  )
  await f.provider.portal('cus_fixture', actor, 'one')
  assert.equal(
    f.calls.at(-1)?.form.get('return_url'),
    'https://site.example/account',
  )
})
test('Stripe signature checks original bytes, all v1 signatures and timestamp freshness', async () => {
  const now = Math.floor(Date.now() / 1000),
    body = JSON.stringify({ id: 'evt_fixture', livemode: false })
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(config.webhookSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = Buffer.from(
    await crypto.subtle.sign(
      'HMAC',
      key,
      new TextEncoder().encode(`${now}.${body}`),
    ),
  ).toString('hex')
  assert.equal(
    (
      await verifyStripeDelivery(
        body,
        `t=${now},v1=${'0'.repeat(64)},v1=${signature}`,
        config.webhookSecret,
      )
    ).id,
    'evt_fixture',
  )
  await assert.rejects(
    verifyStripeDelivery(
      body + ' ',
      `t=${now},v1=${signature}`,
      config.webhookSecret,
    ),
  )
  await assert.rejects(
    verifyStripeDelivery(
      body,
      `t=${now},v1=${signature}`,
      config.webhookSecret,
      now + 301,
    ),
  )
})

test('deleted customers revoke only their Stripe grants using the stored customer identity', async () => {
  const f = fixture(),
    s = store()
  await reconcileStripe(f.provider, s.state, 'evt_before')
  f.deleted()
  await reconcileStripe(f.provider, s.state, 'evt_after')
  assert.equal(s.grants.get('sub_fixture'), new Date(0).toISOString())
  assert.equal(s.grants.get('free'), 'keep-free')
  assert.equal(s.grants.get('revenuecat'), 'keep-native')
})

test('reconciliation hands one subscription at a time back to the Fóir cursor', async () => {
  const f = fixture(true),
    s = store()
  const after = await reconcileStripeSlice(
    f.provider,
    s.state,
    'evt_paged',
    'cus_fixture',
  )
  assert.equal(after, 'sub_fixture')
  assert.ok(s.grants.has('sub_fixture'))
  assert.equal(s.grants.has('sub_second'), false)
  assert.equal(
    await reconcileStripeSlice(
      f.provider,
      s.state,
      'evt_paged',
      'cus_fixture',
      after ?? undefined,
    ),
    null,
  )
  assert.ok(s.grants.has('sub_second'))
  await assert.rejects(
    reconcileStripeSlice(f.provider, s.state, 'evt_other', 'cus_wrong'),
    /customer/,
  )
})
test('parallel checkout starts use the same provider generation', async () => {
  const f = fixture()
  f.setStatus('canceled')
  const [a, b] = await Promise.all([
    f.provider.checkout('cus_fixture', actor),
    f.provider.checkout('cus_fixture', actor),
  ])
  assert.equal(a.id, b.id)
  const posts = f.calls.filter(
    (call) => call.path === '/v1/checkout/sessions' && call.method === 'POST',
  )
  assert.equal(posts.length, 2)
  assert.equal(
    posts[0].headers.get('Idempotency-Key'),
    posts[1].headers.get('Idempotency-Key'),
  )
  assert.equal(
    posts[0].form.get('integration_identifier'),
    posts[1].form.get('integration_identifier'),
  )
})

test('a provider redirect is rejected without forwarding the billing credential', async () => {
  let requests = 0
  const provider = new StripeProvider(config, async (url, init) => {
    requests++
    assert.equal(new URL(String(url)).origin, 'https://api.stripe.com')
    assert.equal(init?.redirect, 'manual')
    return new Response('{}', {
      status: 302,
      headers: { location: 'https://untrusted.example/collect' },
    })
  })
  await assert.rejects(provider.validatePrice(), /302/)
  assert.equal(requests, 1)
})


test('renewal extends the paid grant, period-end cancellation retains access, and expiry removes only Stripe access', async () => {
  const f = fixture(), s = store(), initial = Math.floor(Date.now() / 1000) + 86400
  f.period(initial)
  await reconcileStripe(f.provider, s.state, 'evt_initial')
  assert.equal(s.grants.get('sub_fixture'), new Date(initial * 1000).toISOString())
  const renewed = initial + 30 * 86400
  f.period(renewed)
  await reconcileStripe(f.provider, s.state, 'evt_renewed')
  await reconcileStripe(f.provider, s.state, 'evt_initial')
  assert.equal(s.grants.get('sub_fixture'), new Date(renewed * 1000).toISOString(), 'An old event reads the current renewed period')
  f.cancelAtEnd()
  await reconcileStripe(f.provider, s.state, 'evt_cancel_scheduled')
  assert.equal(s.grants.get('sub_fixture'), new Date(renewed * 1000).toISOString(), 'Scheduled cancellation does not withdraw a paid period')
  f.period(Math.floor(Date.now() / 1000) - 1)
  await reconcileStripe(f.provider, s.state, 'evt_expired')
  assert.equal(s.grants.get('sub_fixture'), new Date(0).toISOString())
  assert.equal(s.grants.get('free'), 'keep-free'); assert.equal(s.grants.get('revenuecat'), 'keep-native')
})
test('a failed later subscription slice resumes the same cursor without losing the earlier grant', async () => {
  const f = fixture(true), s = store()
  const cursor = await reconcileStripeSlice(f.provider, s.state, 'evt_sliced', 'cus_fixture')
  const first = s.grants.get('sub_fixture')
  f.failOnce('/v1/subscriptions')
  await assert.rejects(reconcileStripeSlice(f.provider, s.state, 'evt_sliced', 'cus_fixture', cursor!), /provider outage/)
  assert.equal(s.grants.get('sub_fixture'), first); assert.equal(s.grants.has('sub_second'), false)
  assert.equal(await reconcileStripeSlice(f.provider, s.state, 'evt_sliced', 'cus_fixture', cursor!), null)
  assert.equal(s.grants.get('sub_fixture'), first); assert.ok(s.grants.has('sub_second'))
  assert.equal(s.grants.size, 4, 'Retries address the existing Stripe grants, never manual or native access')
})
test('terminal callback failure stays retryable and a replay re-reads provider state before completing', async () => {
  const f = fixture(), s = store(), original = globalThis.fetch
  const payload = {executionId: 'fixture-billing-run', operationKey: 'tilly.reconcile-stripe',
    trigger: {type: 'webhook' as const}, input: {},
    context: {tenantId: 'fixture-workspace', projectId: 'fixture-project', actorId: '', timestamp: new Date().toISOString()}, callback: {
    endpoint: 'https://api-dev.foir.dev/v1/steps/fixture-billing-run/reply', token: 'fixture-callback-token', signingKey: 'fixture-signing-key', expiresAt: '2099-01-01T00:00:00Z',
  }}
  let refuse = true, callbacks = 0
  try {
    globalThis.fetch = async () => {
      callbacks++
      return refuse ? Response.json({error: 'Synthetic callback refusal'}, {status: 400}) : Response.json({status: 'completed', cancelled: false, applied: true})
    }
    const dispatch = () => runAsyncSlice(payload, 'https://api-dev.foir.dev', async () => {
      const cursor = await reconcileStripeSlice(f.provider, s.state, 'evt_callback', 'cus_fixture')
      return cursor ? continueRun({cursor}) : {status: 200, body: {ok: true}}
    })
    await assert.rejects(dispatch())
    assert.ok(s.grants.has('sub_fixture'), 'A write can precede a refused completion callback')
    f.setStatus('canceled'); refuse = false
    assert.equal((await dispatch()).status, 202)
    assert.equal(s.grants.get('sub_fixture'), new Date(0).toISOString(), 'Replay uses current provider truth rather than the earlier saved result')
    assert.equal(s.grants.get('free'), 'keep-free'); assert.equal(s.grants.get('revenuecat'), 'keep-native')
    assert.equal(callbacks, 2)
  } finally { globalThis.fetch = original }
})
