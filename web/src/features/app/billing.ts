import type { AppClient } from './data'
/** Direct SDK document until the installed manifest is released and namespace
 * types regenerated. This never calls the Worker endpoint from the browser. */
const documents = {
  checkout: `mutation Checkout($key: String!, $lock: String!) { executeTillyWebCheckout(input: {}, mode: SYNC, idempotencyKey: $key, concurrencyKey: $lock) { result { ok id url } execution { status error } } }`,
  portal: `mutation Portal($key: String!, $lock: String!) { executeTillyWebPortal(input: {}, mode: SYNC, idempotencyKey: $key, concurrencyKey: $lock) { result { ok id url } execution { status error } } }`,
}
export function billingDestination(
  value: unknown,
  kind: 'checkout' | 'portal',
) {
  if (!value || typeof value !== 'object')
    throw new Error(
      'Subscription management has not completed. Try again to check its result.',
    )
  const reply = value as {
    result?: { ok?: boolean; url?: string }
    execution?: { status?: string; error?: string }
  }
  if (
    reply.result?.ok !== true ||
    !reply.result.url ||
    ['failed', 'cancelled', 'timed_out'].includes(
      reply.execution?.status?.toLowerCase() ?? '',
    )
  )
    throw new Error(
      'Subscription management has not completed. Try again to check its result.',
    )
  const url = new URL(reply.result.url)
  if (
    url.protocol !== 'https:' ||
    url.hostname !==
      (kind === 'checkout' ? 'checkout.stripe.com' : 'billing.stripe.com') ||
    url.username ||
    url.password ||
    url.port
  )
    throw new Error(
      'Subscription management returned an unexpected destination.',
    )
  return url.href
}
export async function startWebBilling(
  client: AppClient,
  kind: 'checkout' | 'portal',
  actor: string,
  key: string,
) {
  const result = await client.raw<Record<string, unknown>>(documents[kind], {
    key,
    lock: `tilly-${kind}:${actor}`,
  })
  return billingDestination(
    result[
      kind === 'checkout' ? 'executeTillyWebCheckout' : 'executeTillyWebPortal'
    ],
    kind,
  )
}
