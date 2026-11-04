import test from 'node:test'
import assert from 'node:assert/strict'
import { billingDestination } from './billing'
test('billing navigation requires completed success and a provider-owned HTTPS destination', () => {
  assert.equal(
    billingDestination(
      {
        result: { ok: true, url: 'https://checkout.stripe.com/c/pay/fixture' },
      },
      'checkout',
    ),
    'https://checkout.stripe.com/c/pay/fixture',
  )
  for (const value of [
    {},
    { execution: { status: 'queued' } },
    { result: { ok: true, url: 'https://checkout.stripe.com.evil.example/' } },
    { result: { ok: true, url: 'https://checkout.stripe.com:8443/' } },
    { result: { ok: true, url: 'https://billing.stripe.com/' } },
    {
      result: { ok: true, url: 'https://checkout.stripe.com/' },
      execution: { status: 'failed' },
    },
  ])
    assert.throws(() => billingDestination(value, 'checkout'))
})
