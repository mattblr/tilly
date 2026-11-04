/** A concurrency key joins work; it does not queue the joining event. Leaving
 * that delivery unacknowledged makes the verified gateway/provider retry it. */
export async function startBillingRun(
  start: (input: {
    input: { eventId: string; customerId: string }
    concurrencyKey: string
  }) => Promise<{ executionId: string; joined: boolean }>,
  eventId: string,
  customerId: string,
) {
  if (
    !/^evt_[A-Za-z0-9_]+$/.test(eventId) ||
    !/^cus_[A-Za-z0-9_]+$/.test(customerId)
  )
    throw new Error('Invalid billing delivery identity.')
  // No event idempotency key here: a joined attempt would permanently replay
  // the other event's run. Repeated separate runs are safe provider re-reads.
  const run = await start({
    input: { eventId, customerId },
    concurrencyKey: `stripe-customer:${customerId}`,
  })
  if (typeof run.joined !== 'boolean' || !run.executionId)
    throw new Error('Fóir did not confirm a billing run.')
  return run.joined
    ? new Response('Billing status is refreshing. Retry this delivery.', {
        status: 503,
        headers: { 'Retry-After': '5', 'Cache-Control': 'no-store' },
      })
    : Response.json(
        { accepted: true },
        { headers: { 'Cache-Control': 'no-store' } },
      )
}
export class BillingDeliveryRefused extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message)
  }
}
