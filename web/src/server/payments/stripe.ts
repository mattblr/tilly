/** Fóir payments integration is in progress. This provider adapter currently
 * owns Checkout/Portal and provider-specific entitlement reconciliation. Shared
 * provider subscription state and entitlement checks are the intended replacement.
 * It is not registered until its operations, install credentials and grants are reviewed. */
export interface StripeConfig {
  secretKey: string
  webhookSecret: string
  priceId: string
  siteOrigin: string
  projectId: string
  mode: 'test' | 'live'
}
type Row = Record<string, unknown>
export function row(value: unknown): Row {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Unexpected billing response.')
  return value as Row
}
function id(value: unknown, prefix: string) {
  if (
    typeof value !== 'string' ||
    !new RegExp(`^${prefix}_[A-Za-z0-9_]+$`).test(value)
  )
    throw new Error('Unexpected billing identifier.')
  return value
}
function userId(value: unknown) {
  if (typeof value !== 'string' || !/^[a-z0-9]{10,40}$/.test(value))
    throw new Error('Billing identity is unavailable.')
  return value
}
export async function billingJson(
  response: Response,
  maxBytes = 1_048_576,
): Promise<Row> {
  if (!response.body) throw new Error('Billing service returned no response.')
  const reader = response.body.getReader(),
    chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.length
      if (size > maxBytes)
        throw new Error('Billing response exceeded its limit.')
      chunks.push(value)
    }
  } finally {
    await reader.cancel()
  }
  if (!response.ok)
    throw new Error(
      `Billing service could not complete this request (${response.status}).`,
    )
  const bytes = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.length
  }
  return row(JSON.parse(new TextDecoder().decode(bytes)))
}
export class StripeProvider {
  constructor(
    readonly config: StripeConfig,
    private fetcher: typeof fetch = fetch,
  ) {
    const origin = new URL(config.siteOrigin)
    if (
      origin.origin !== config.siteOrigin ||
      origin.protocol !== 'https:' ||
      !config.secretKey ||
      !config.webhookSecret ||
      !config.projectId ||
      !['test', 'live'].includes(config.mode)
    )
      throw new Error('Configure billing before enabling it.')
    id(config.priceId, 'price')
  }
  private async request(
    method: 'GET' | 'POST',
    path: string,
    params: Record<string, string> = {},
    key?: string,
  ) {
    const url = new URL('https://api.stripe.com' + path),
      form = new URLSearchParams(params)
    if (method === 'GET') url.search = form.toString()
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.config.secretKey}`,
      'Stripe-Version': '2026-10-28.endive',
    }
    if (method === 'POST')
      headers['Content-Type'] = 'application/x-www-form-urlencoded'
    if (key) headers['Idempotency-Key'] = key
    return billingJson(
      await this.fetcher(url, {
        method,
        headers,
        body: method === 'POST' ? form : undefined,
        redirect: 'manual',
        signal: AbortSignal.timeout(20_000),
      }),
    )
  }
  private mode(object: Row) {
    if (object.livemode !== (this.config.mode === 'live'))
      throw new Error('Billing test/live mode does not match this environment.')
    return object
  }
  private async all(path: string, params: Record<string, string>) {
    const result: Row[] = [],
      seen = new Set<string>()
    let after = ''
    for (let page = 0; page < 100; page++) {
      const answer = await this.request('GET', path, {
        ...params,
        limit: '100',
        ...(after ? { starting_after: after } : {}),
      })
      if (!Array.isArray(answer.data) || typeof answer.has_more !== 'boolean')
        throw new Error('Unexpected billing list.')
      const rows = answer.data.map(row)
      result.push(...rows)
      if (!answer.has_more) return result
      const next = rows.at(-1)?.id
      if (typeof next !== 'string' || seen.has(next))
        throw new Error('Billing list did not advance.')
      seen.add(next)
      after = next
    }
    throw new Error('Billing list exceeds the reconciliation limit.')
  }
  async validatePrice() {
    const price = this.mode(
      await this.request(
        'GET',
        `/v1/prices/${id(this.config.priceId, 'price')}`,
      ),
    )
    if (price.active !== true || !price.recurring)
      throw new Error('The configured subscription price is unavailable.')
  }
  async customer(customerId: string) {
    const customer = await this.request(
      'GET',
      `/v1/customers/${id(customerId, 'cus')}`,
    )
    return customer.deleted === true ? customer : this.mode(customer)
  }
  actor(customer: Row) {
    if (customer.deleted === true)
      throw new Error('This billing account was deleted.')
    const metadata = row(customer.metadata)
    if (metadata.tilly_project_id !== this.config.projectId)
      throw new Error('This billing account belongs to another project.')
    return userId(metadata.tilly_user_id)
  }
  async createCustomer(actor: string, key: string) {
    userId(actor)
    await this.validatePrice()
    const customer = this.mode(
      await this.request(
        'POST',
        '/v1/customers',
        {
          'metadata[tilly_user_id]': actor,
          'metadata[tilly_project_id]': this.config.projectId,
        },
        key,
      ),
    )
    if (this.actor(customer) !== actor)
      throw new Error('Billing identity did not match.')
    return id(customer.id, 'cus')
  }
  async subscriptions(customerId: string) {
    return (
      await this.all('/v1/subscriptions', {
        customer: id(customerId, 'cus'),
        status: 'all',
      })
    ).map((value) => this.mode(value))
  }
  async subscriptionPage(customerId: string, after?: string) {
    const answer = await this.request('GET', '/v1/subscriptions', {
      customer: id(customerId, 'cus'),
      status: 'all',
      limit: '1',
      ...(after ? { starting_after: id(after, 'sub') } : {}),
    })
    if (
      !Array.isArray(answer.data) ||
      answer.data.length > 1 ||
      typeof answer.has_more !== 'boolean'
    )
      throw new Error('Invalid subscription page.')
    const data = answer.data.map((value) => this.mode(row(value)))
    const next = answer.has_more ? id(data.at(-1)?.id, 'sub') : null
    if (next === after) throw new Error('Subscription paging did not advance.')
    return { data, next }
  }
  async checkout(customerId: string, actor: string) {
    await this.validatePrice()
    if (this.actor(await this.customer(customerId)) !== actor)
      throw new Error('This billing account is not yours.')
    const subscriptions = await this.subscriptions(customerId)
    if (
      subscriptions.some((sub) =>
        [
          'active',
          'trialing',
          'past_due',
          'unpaid',
          'paused',
          'incomplete',
        ].includes(String(sub.status)),
      )
    )
      throw new Error(
        'You already have a subscription. Open subscription management instead.',
      )
    const open = await this.all('/v1/checkout/sessions', {
      customer: customerId,
      status: 'open',
    })
    if (open.length) {
      if (open.length !== 1)
        throw new Error(
          'More than one checkout is open. Contact support before starting another.',
        )
      return this.existingCheckout(this.mode(open[0]), actor)
    }
    // Two independent Fóir runs may arrive together. Anchor the provider's
    // idempotency key to the latest checkout, not the caller's chosen UUID.
    // An open checkout is reused; an expired one advances the generation.
    const history = await this.request('GET', '/v1/checkout/sessions', {
      customer: customerId,
      limit: '1',
    })
    if (!Array.isArray(history.data))
      throw new Error('Checkout history is unavailable.')
    const latest = history.data.length ? this.mode(row(history.data[0])) : null
    if (latest) {
      const metadata = row(latest.metadata)
      if (
        latest.client_reference_id !== actor ||
        metadata.tilly_project_id !== this.config.projectId ||
        metadata.tilly_user_id !== actor
      )
        throw new Error('Checkout history does not match this account.')
      if (latest.status === 'open') return this.existingCheckout(latest, actor)
      if (!['expired', 'complete'].includes(String(latest.status)))
        throw new Error('Checkout history is not settled.')
      if (latest.status === 'complete') {
        if (typeof latest.subscription !== 'string')
          throw new Error('The previous subscription is not available yet.')
        const subscription = this.mode(
          await this.request(
            'GET',
            `/v1/subscriptions/${id(latest.subscription, 'sub')}`,
          ),
        )
        if (
          !['canceled', 'incomplete_expired'].includes(
            String(subscription.status),
          )
        )
          throw new Error(
            'Your existing subscription is still being confirmed. Manage it instead.',
          )
      }
    }
    const key = `tilly-checkout:${customerId}:${this.config.priceId}:${latest ? id(latest.id, 'cs') : 'first'}`
    const digest = new Uint8Array(
      await crypto.subtle.digest('SHA-256', new TextEncoder().encode(key)),
    )
    const integration =
      'tilly-template-' +
      Array.from(digest.slice(0, 8), (byte) =>
        String.fromCharCode(97 + (byte % 26)),
      ).join('')
    const session = this.mode(
      await this.request(
        'POST',
        '/v1/checkout/sessions',
        {
          mode: 'subscription',
          'managed_payments[enabled]': 'false',
          integration_identifier: integration,
          customer: customerId,
          client_reference_id: actor,
          'metadata[tilly_user_id]': actor,
          'metadata[tilly_project_id]': this.config.projectId,
          'line_items[0][price]': this.config.priceId,
          'line_items[0][quantity]': '1',
          'subscription_data[metadata][tilly_user_id]': actor,
          'subscription_data[metadata][tilly_project_id]':
            this.config.projectId,
          success_url: `${this.config.siteOrigin}/account?checkout=returned`,
          cancel_url: `${this.config.siteOrigin}/account?checkout=cancelled`,
        },
        key,
      ),
    )
    return {
      id: id(session.id, 'cs'),
      url: this.redirect(session.url, 'checkout.stripe.com'),
    }
  }
  private async existingCheckout(session: Row, actor: string) {
    const metadata = row(session.metadata)
    if (
      session.mode !== 'subscription' ||
      session.client_reference_id !== actor ||
      metadata.tilly_project_id !== this.config.projectId ||
      metadata.tilly_user_id !== actor
    )
      throw new Error('The existing checkout could not be verified.')
    const lines = await this.all(
      `/v1/checkout/sessions/${id(session.id, 'cs')}/line_items`,
      {},
    )
    if (
      lines.length !== 1 ||
      row(lines[0].price).id !== this.config.priceId ||
      lines[0].quantity !== 1
    )
      throw new Error(
        'The existing checkout uses a different subscription price.',
      )
    return {
      id: id(session.id, 'cs'),
      url: this.redirect(session.url, 'checkout.stripe.com'),
    }
  }
  async portal(customerId: string, actor: string, key: string) {
    if (this.actor(await this.customer(customerId)) !== actor)
      throw new Error('This billing account is not yours.')
    const session = this.mode(
      await this.request(
        'POST',
        '/v1/billing_portal/sessions',
        {
          customer: customerId,
          return_url: `${this.config.siteOrigin}/account`,
        },
        key,
      ),
    )
    return {
      id: String(session.id),
      url: this.redirect(session.url, 'billing.stripe.com'),
    }
  }
  private redirect(value: unknown, hostname: string) {
    if (typeof value !== 'string')
      throw new Error('Billing did not return a redirect.')
    const url = new URL(value)
    if (
      url.protocol !== 'https:' ||
      url.hostname !== hostname ||
      url.username ||
      url.password
    )
      throw new Error('Billing returned an unexpected destination.')
    return url.href
  }
  async event(eventId: string) {
    return this.mode(
      await this.request('GET', `/v1/events/${id(eventId, 'evt')}`),
    )
  }
  async eventCustomer(event: Row) {
    const data = row(row(event.data).object)
    if (event.type === 'customer.deleted') return id(data.id, 'cus')
    if (typeof data.customer === 'string') return id(data.customer, 'cus')
    if (typeof data.charge === 'string') {
      const charge = this.mode(
        await this.request('GET', `/v1/charges/${id(data.charge, 'ch')}`),
      )
      return id(charge.customer, 'cus')
    }
    if (typeof data.payment_intent === 'string') {
      const intent = this.mode(
        await this.request(
          'GET',
          `/v1/payment_intents/${id(data.payment_intent, 'pi')}`,
        ),
      )
      return id(intent.customer, 'cus')
    }
    throw new Error('The billing event does not name a customer.')
  }
  /** Read current invoices/payments rather than trusting an old event snapshot. */
  async until(
    subscription: Row,
    now = Date.now() / 1000,
  ): Promise<string | null> {
    if (!['active', 'trialing'].includes(String(subscription.status)))
      return null
    const items = row(subscription.items)
    if (!Array.isArray(items.data))
      throw new Error('Subscription items are missing.')
    const matching = items.data
      .map(row)
      .filter((item) => row(item.price).id === this.config.priceId)
    if (!matching.length) return null
    const end = Math.max(
      ...matching.map((item) =>
        Number(item.current_period_end ?? subscription.current_period_end),
      ),
    )
    if (!Number.isFinite(end) || end <= now) return null
    if (subscription.status === 'trialing')
      return new Date(
        Math.min(end, Number(subscription.trial_end) || end) * 1000,
      ).toISOString()
    if (typeof subscription.latest_invoice !== 'string')
      throw new Error('The latest invoice is unavailable.')
    const invoice = await this.request(
      'GET',
      `/v1/invoices/${id(subscription.latest_invoice, 'in')}`,
    )
    if (invoice.status !== 'paid') return null
    const payments = await this.all('/v1/invoice_payments', {
      invoice: String(invoice.id),
      status: 'paid',
    })
    const settled = payments.filter((payment) => payment.status === 'paid')
    // A zero-cost paid invoice (for example a coupon) legitimately has no charge.
    if (Number(invoice.amount_paid) > 0 && !settled.length)
      throw new Error('Invoice payment confirmation is unavailable.')
    let fullyRefunded = settled.length > 0
    for (const payment of settled) {
      const source = row(payment.payment)
      let charge: Row
      if (source.type === 'payment_intent') {
        const intent = await this.request(
          'GET',
          `/v1/payment_intents/${id(source.payment_intent, 'pi')}`,
          { 'expand[]': 'latest_charge' },
        )
        charge = row(intent.latest_charge)
      } else if (source.type === 'charge') {
        charge = await this.request(
          'GET',
          `/v1/charges/${id(source.charge, 'ch')}`,
        )
      } else {
        throw new Error('Unsupported invoice payment type.')
      }
      if (
        typeof charge.refunded !== 'boolean' ||
        typeof charge.disputed !== 'boolean'
      )
        throw new Error('Invoice charge confirmation is unavailable.')
      // A split invoice is fully refunded only when every settled payment is.
      // Partial refunds retain access; disputes and current fraud signals do not.
      fullyRefunded &&= charge.refunded
      if (charge.disputed) return null
      const warnings = await this.all('/v1/radar/early_fraud_warnings', {
        charge: id(charge.id, 'ch'),
      })
      if (warnings.some((warning) => typeof warning.actionable !== 'boolean'))
        throw new Error('Fraud warning confirmation is unavailable.')
      if (warnings.some((warning) => warning.actionable === true)) return null
    }
    if (fullyRefunded) return null
    return new Date(end * 1000).toISOString()
  }
}
export interface BillingStore {
  customerId(actor: string): Promise<string | null>
  actorForCustomer(customerId: string): Promise<string | null>
  revokeStripeGrants(actor: string): Promise<void>
  keepCustomer(actor: string, customerId: string): Promise<void>
  hasPremium(actor: string): Promise<boolean>
  stripeGrant(
    actor: string,
    subscriptionId: string,
    until: string,
  ): Promise<void>
}
export async function checkoutForActor(
  provider: StripeProvider,
  store: BillingStore,
  actor: string,
) {
  userId(actor)
  if (await store.hasPremium(actor))
    throw new Error(
      'Premium is already active. Manage your existing subscription instead of buying it twice.',
    )
  let customer = await store.customerId(actor)
  const deleted =
    customer && (await provider.customer(customer)).deleted === true
  if (!customer || deleted) {
    customer = await provider.createCustomer(
      actor,
      `tilly-customer:${provider.config.projectId}:${actor}${deleted ? `:after:${customer}` : ''}`,
    )
    await store.keepCustomer(actor, customer)
  }
  return provider.checkout(customer, actor)
}
export async function verifyStripeDelivery(
  body: string,
  signature: string,
  secret: string,
  now = Date.now() / 1000,
) {
  if (!secret || body.length > 1_048_576 || signature.length > 4096)
    throw new Error('Invalid billing delivery.')
  const parts = signature.split(',').map((piece) => piece.split('=')),
    timestamps = parts.filter(([kind]) => kind === 't')
  if (timestamps.length !== 1 || !/^\d+$/.test(timestamps[0][1] ?? ''))
    throw new Error('Invalid billing signature.')
  const timestamp = Number(timestamps[0][1])
  if (Math.abs(now - timestamp) > 300)
    throw new Error('Expired billing signature.')
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify'],
  )
  const payload = new TextEncoder().encode(`${timestamp}.${body}`)
  for (const [kind, value] of parts)
    if (kind === 'v1' && /^[a-f0-9]{64}$/i.test(value ?? '')) {
      const bytes = Uint8Array.from(value.match(/../g)!, (byte) =>
        parseInt(byte, 16),
      )
      if (await crypto.subtle.verify('HMAC', key, bytes, payload)) {
        const event = row(JSON.parse(body))
        id(event.id, 'evt')
        return event
      }
    }
  throw new Error('Invalid billing signature.')
}

/** One subscription per Fóir slice. Its concurrency key stays held until the
 * final callback, so no older provider read can overwrite a newer run. */
export async function reconcileStripeSlice(
  provider: StripeProvider,
  store: BillingStore,
  eventId: string,
  expectedCustomer: string,
  after?: string,
) {
  const event = await provider.event(eventId)
  if (!isBillingEvent(event.type)) return null
  const customerId = await provider.eventCustomer(event)
  if (customerId !== expectedCustomer)
    throw new Error('The event customer did not match its serialized run.')
  const actor = await store.actorForCustomer(customerId)
  if (!actor) return null
  const customer = await provider.customer(customerId)
  if (customer.deleted === true) {
    await store.revokeStripeGrants(actor)
    return null
  }
  if (
    provider.actor(customer) !== actor ||
    (await store.customerId(actor)) !== customerId
  )
    throw new Error('Billing identity did not match.')
  const page = await provider.subscriptionPage(customerId, after)
  for (const subscription of page.data) {
    const metadata = row(subscription.metadata)
    if (
      metadata.tilly_project_id !== provider.config.projectId ||
      metadata.tilly_user_id !== actor
    )
      throw new Error('Subscription identity did not match.')
    await store.stripeGrant(
      actor,
      id(subscription.id, 'sub'),
      (await provider.until(subscription)) ?? new Date(0).toISOString(),
    )
  }
  return page.next
}
export function isBillingEvent(type: unknown) {
  return (
    typeof type === 'string' &&
    /^(?:customer\.subscription\.|customer\.deleted$|invoice\.|invoice_payment\.paid$|charge\.refunded$|charge\.dispute\.|refund\.|radar\.early_fraud_warning\.(?:created|updated)$|checkout\.session\.(?:completed|async_payment_succeeded)$)/.test(
      type,
    )
  )
}
