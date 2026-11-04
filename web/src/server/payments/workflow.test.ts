import test from 'node:test'
import assert from 'node:assert/strict'
import { startBillingRun } from './workflow'
test('a joining Stripe delivery remains retryable instead of being acknowledged and lost', async () => {
  const calls: unknown[] = []
  const start = async (input: unknown) => {
    calls.push(input)
    return { executionId: 'execution-fixture', joined: calls.length === 1 }
  }
  const busy = await startBillingRun(start, 'evt_new', 'cus_fixture')
  assert.equal(busy.status, 503)
  const retry = await startBillingRun(start, 'evt_new', 'cus_fixture')
  assert.equal(retry.status, 200)
  assert.deepEqual(calls, [
    {
      input: { eventId: 'evt_new', customerId: 'cus_fixture' },
      concurrencyKey: 'stripe-customer:cus_fixture',
    },
    {
      input: { eventId: 'evt_new', customerId: 'cus_fixture' },
      concurrencyKey: 'stripe-customer:cus_fixture',
    },
  ])
})
test('different customers do not join each other and duplicate events may safely re-read current state', async () => {
  const keys: string[] = []
  const start = async (input: { concurrencyKey: string }) => {
    keys.push(input.concurrencyKey)
    return { executionId: 'execution-fixture', joined: false }
  }
  for (const customer of ['cus_one', 'cus_two', 'cus_one'])
    assert.equal(
      (await startBillingRun(start, 'evt_same', customer)).status,
      200,
    )
  assert.deepEqual(keys, [
    'stripe-customer:cus_one',
    'stripe-customer:cus_two',
    'stripe-customer:cus_one',
  ])
})

test('an unconfirmed start is never acknowledged as a processed delivery', async () => {
  await assert.rejects(
    startBillingRun(
      async () => ({ executionId: '', joined: false }),
      'evt_same',
      'cus_one',
    ),
    /confirm/,
  )
})
