import assert from 'node:assert/strict'
import test from 'node:test'
import { billingFailureReason } from './errors'
test('private billing diagnostics omit provider credentials, tokens and session URLs', () => {
  const message =
    'Failure sk-proj-fixture_key sk_test_secret rk_test_secret pk_test_public whsec_secret Bearer opaque https://billing.stripe.com/p/session eyJhbGciOi.eyJzdWIiOi.signature'
  const reason = billingFailureReason(new Error(message))
  for (const value of [
    'sk-proj-fixture_key',
    'sk_test_secret',
    'rk_test_secret',
    'whsec_secret',
    'opaque',
    'https://',
    'eyJ',
  ])
    assert.ok(!reason.includes(value))
  assert.match(
    billingFailureReason(new Error('Unknown field webBillingAccounts')),
    /Unknown field webBillingAccounts/,
  )
  assert.equal(billingFailureReason(new Error('x'.repeat(2000))).length, 1200)
})

test('nested transport causes expose only a fixed diagnostic category', () => {
  const limited = new Error('[foir] network error', {cause: new Error('Too many subrequests: https://private.example/secret Bearer private-token')})
  assert.equal(billingFailureReason(limited), 'subrequest_limit: [foir] network error')
  const unknown = new Error('[foir] network error', {cause: new Error('private form content and sk-proj-provider-secret')})
  assert.equal(billingFailureReason(unknown), '[foir] network error')
  const cycle = new Error('outer')
  cycle.cause = cycle
  assert.equal(billingFailureReason(cycle), 'outer')
  assert.equal(billingFailureReason(new Error('outer', {cause: {password: 'private'}})), 'outer')
})
