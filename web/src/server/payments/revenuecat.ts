import { billingJson } from './stripe'

const ENTITLEMENT = 'premium'

type Subscriber = {
  entitlements?: Record<string, { expires_date?: string | null; grace_period_expires_date?: string | null; product_identifier?: string }>
  subscriptions?: Record<string, { is_sandbox?: boolean; store?: string }>
}

/** Malformed or incomplete provider data is an outage, never proof of a lapse.
 * App Store purchases count in both of Apple's environments: App Review and
 * TestFlight buy through Sandbox. RevenueCat's Test Store is simulated, and
 * anyone holding its key could make one, so it never counts. */
export function subscriptionExpiry(subscriber: Subscriber | undefined, now = Date.now()): string | null {
  if (!subscriber || !subscriber.entitlements || !subscriber.subscriptions)
    throw new Error('RevenueCat returned incomplete subscription data.')
  const entitlement = subscriber.entitlements[ENTITLEMENT]
  if (!entitlement) return null
  const expiry = entitlement.expires_date
  if (!expiry || !Number.isFinite(Date.parse(expiry)) || !entitlement.product_identifier)
    throw new Error('RevenueCat returned an invalid Premium entitlement.')
  const grace = entitlement.grace_period_expires_date
  if (grace !== undefined && grace !== null &&
      (typeof grace !== 'string' || !Number.isFinite(Date.parse(grace))))
    throw new Error('RevenueCat returned an invalid Premium grace period.')
  const until = grace && Date.parse(grace) > Date.parse(expiry) ? grace : expiry
  if (Date.parse(until) <= now) return null
  const sale = subscriber.subscriptions[entitlement.product_identifier]
  if (!sale || typeof sale.is_sandbox !== 'boolean' || !sale.store)
    throw new Error('RevenueCat did not identify the subscription environment.')
  if (sale.store === 'test_store') return null
  return until
}


export interface RevenueCatDeliveryConfig {
  signingSecret: string
  appId: string
}
export interface RevenueCatDelivery {
  eventId: string
  type: string
  actorIds: string[]
}

/** Same actor-selector contract as the web billing adapter; never an email join. */
export function isRevenueCatActor(value: unknown): value is string {
  return typeof value === 'string' && /^[a-z0-9]{10,40}$/.test(value)
}

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Invalid RevenueCat delivery.')
  return value as Record<string, unknown>
}

/** These lifecycle events can change subscription entitlement state. Unknown
 * event families (such as currency activity) do not select reconciliation work.
 * https://www.revenuecat.com/docs/integrations/webhooks/event-types-and-fields
 */
const ENTITLEMENT_EVENTS = new Set([
  'INITIAL_PURCHASE', 'RENEWAL', 'CANCELLATION', 'UNCANCELLATION',
  'NON_RENEWING_PURCHASE', 'SUBSCRIPTION_PAUSED', 'EXPIRATION',
  'BILLING_ISSUE', 'PRODUCT_CHANGE', 'SUBSCRIPTION_EXTENDED',
  'REFUND_REVERSED', 'TEMPORARY_ENTITLEMENT_GRANT', 'PURCHASE_REDEEMED',
])

/** Authenticate original bytes before treating any event identity as a selector.
 * https://www.revenuecat.com/docs/integrations/webhooks
 * This selects work only. Access must come from a fresh provider lookup below.
 */
export async function verifyRevenueCatDelivery(
  bytes: Uint8Array,
  signature: string,
  config: RevenueCatDeliveryConfig,
  nowMs = Date.now(),
): Promise<RevenueCatDelivery> {
  if (!config.signingSecret || !config.appId ||
      bytes.byteLength > 1_048_576 || signature.length > 4096)
    throw new Error('Invalid RevenueCat delivery configuration or size.')
  const parts = signature.split(',').map(part => part.trim().split('='))
  const timestamps = parts.filter(([name]) => name === 't')
  const signatures = parts.filter(([name]) => name === 'v1')
  if (timestamps.length !== 1 || signatures.length !== 1 ||
      timestamps[0].length !== 2 || signatures[0].length !== 2 ||
      !/^\d{1,16}$/.test(timestamps[0][1] ?? '') ||
      !/^[a-f0-9]{64}$/i.test(signatures[0][1] ?? ''))
    throw new Error('Invalid RevenueCat signature.')
  const timestamp = Number(timestamps[0][1])
  if (!Number.isSafeInteger(timestamp) || !Number.isFinite(nowMs) ||
      Math.abs(nowMs / 1000 - timestamp) > 300)
    throw new Error('Expired RevenueCat signature.')
  const prefix = new TextEncoder().encode(`${timestamps[0][1]}.`)
  const payload = new Uint8Array(prefix.length + bytes.length)
  payload.set(prefix)
  payload.set(bytes, prefix.length)
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(config.signingSecret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['verify'],
  )
  const expected = Uint8Array.from(
    signatures[0][1].match(/../g)!, pair => Number.parseInt(pair, 16),
  )
  if (!await crypto.subtle.verify('HMAC', key, expected, payload))
    throw new Error('Invalid RevenueCat signature.')
  const envelope = object(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)))
  if (envelope.api_version !== '1.0') throw new Error('Unsupported RevenueCat delivery version.')
  const event = object(envelope.event)
  if (typeof event.id !== 'string' || !/^[A-Za-z0-9_-]{1,200}$/.test(event.id) ||
      typeof event.type !== 'string' || !/^[A-Z_]{1,80}$/.test(event.type))
    throw new Error('Invalid RevenueCat event identity.')
  // Events from both of Apple's environments select work (App Review buys
  // through Sandbox). Never relax the app boundary; a fresh provider lookup
  // decides access for every actor.
  if (event.app_id !== config.appId)
    throw new Error('RevenueCat app did not match.')
  let selectors: unknown[]
  if (event.type === 'TRANSFER') {
    const from = event.transferred_from, to = event.transferred_to
    if (!Array.isArray(from) || !Array.isArray(to) ||
        from.length > 100 || to.length > 100 ||
        [...from, ...to].some(value => typeof value !== 'string'))
      throw new Error('Invalid RevenueCat transfer identities.')
    selectors = [...from, ...to]
  } else if (ENTITLEMENT_EVENTS.has(event.type)) {
    const direct = [event.app_user_id, event.original_app_user_id]
      .filter(value => value !== undefined)
    const aliases = event.aliases === undefined ? [] : event.aliases
    if (direct.some(value => typeof value !== 'string') ||
        !Array.isArray(aliases) || aliases.length > 200 ||
        aliases.some(value => typeof value !== 'string') ||
        direct.length + aliases.length > 200)
      throw new Error('Invalid RevenueCat subscriber identities.')
    selectors = [...direct, ...aliases]
    if (!selectors.length)
      throw new Error('RevenueCat subscriber identity is missing.')
  } else selectors = []
  return {
    eventId: event.id, type: event.type,
    actorIds: [...new Set(selectors.filter(isRevenueCatActor))],
  }
}

/** Provider event expiry/access fields are deliberately not accepted here.
 * Call separately for every affected actor, including both sides of a transfer.
 * This returns a current lookup, not a provider revision or write-order guarantee.
 */
export async function readRevenueCatSubscription(
  actorId: string,
  apiKey: string,
  options: {
    fetcher?: typeof fetch
    nowMs?: number
  },
): Promise<{ active: boolean; until: string | null }> {
  if (!isRevenueCatActor(actorId) || !apiKey.trim())
    throw new Error('RevenueCat verification identity or credential is missing.')
  const answer = await billingJson(await (options.fetcher ?? fetch)(
    `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(actorId)}`,
    {
      headers: { authorization: `Bearer ${apiKey.trim()}` },
      redirect: 'manual', signal: AbortSignal.timeout(15_000),
    },
  ))
  const until = subscriptionExpiry(
    answer.subscriber as Parameters<typeof subscriptionExpiry>[0],
    options.nowMs ?? Date.now(),
  )
  return { active: until !== null, until }
}
