import { startBillingRun, BillingDeliveryRefused } from './workflow'
import { createAppClient } from '@foir/sdk/app'
import {
  requireScopedToken,
  continueRun,
  type ScopedTokenIngress,
} from '@foir/sdk/server'
import {
  row,
  StripeProvider,
  checkoutForActor,
  reconcileStripeSlice,
  isBillingEvent,
  verifyStripeDelivery,
} from './stripe'
import { billingStore } from './foir-store'
import { operationApi } from '../operations/environment'
export class BillingConfigurationError extends Error {
  constructor() {
    super('Web billing is not configured.')
    this.name = 'BillingConfigurationError'
  }
}
export class BillingAccountMissingError extends Error {
  constructor() {
    super('You do not have a web subscription yet.')
    this.name = 'BillingAccountMissingError'
  }
}
type BillingIngress = ScopedTokenIngress & { apiUrl?: string }
/** Install credentials and settings are read only through verified dispatch. */
export async function billingContext(
  ingress: BillingIngress,
  budgetMs = 60_000,
) {
  const deadline = AbortSignal.timeout(budgetMs)
  const app = createAppClient({
    apiUrl: operationApi(ingress.apiUrl),
    dispatch: ingress.dispatch,
    requestInit: { signal: deadline },
  })
  const [credentials, install] = await Promise.all([
    app.install.credentials(),
    app.install.config(),
  ])
  const settings = install.settings
  if (
    typeof settings.stripePriceId !== 'string' ||
    typeof settings.siteOrigin !== 'string'
  )
    throw new BillingConfigurationError()
  if (!credentials.stripeSecretKey || !credentials.stripeWebhookSecret)
    throw new BillingConfigurationError()
  // The key says which Stripe mode this installation uses.
  const mode = /^(sk|rk)_live_/.test(credentials.stripeSecretKey) ? 'live' : 'test'
  const provider = new StripeProvider(
    {
      secretKey: credentials.stripeSecretKey ?? '',
      webhookSecret: credentials.stripeWebhookSecret ?? '',
      priceId: settings.stripePriceId,
      siteOrigin: settings.siteOrigin,
      projectId: ingress.subject.projectId,
      mode,
    },
    (input, init) =>
      fetch(input, {
        ...init,
        signal: AbortSignal.any([
          deadline,
          ...(init?.signal ? [init.signal] : []),
        ]),
      }),
  )
  return { app, provider, store: billingStore(app, ingress.userId) }
}
export async function billingCheckout(ingress: BillingIngress) {
  if (!ingress.userId) throw new Error('Sign in to subscribe.')
  const { provider, store } = await billingContext(ingress)
  return {
    ok: true,
    ...(await checkoutForActor(provider, store, ingress.userId)),
  }
}
export async function billingPortal(
  ingress: BillingIngress,
  executionId: string,
) {
  if (!ingress.userId) throw new Error('Sign in to manage your subscription.')
  const { provider, store } = await billingContext(ingress),
    customer = await store.customerId(ingress.userId)
  if (!customer) throw new BillingAccountMissingError()
  return {
    ok: true,
    ...(await provider.portal(
      customer,
      ingress.userId,
      `tilly-portal:${executionId}`,
    )),
  }
}
export async function billingReconcile(
  ingress: BillingIngress,
  input: unknown,
  cursor?: string,
) {
  if (ingress.userId)
    throw new Error('Billing reconciliation requires an install delivery.')
  const { provider, store } = await billingContext(ingress)
  const { eventId, customerId } = row(input)
  if (typeof eventId !== 'string' || typeof customerId !== 'string')
    throw new Error('Billing delivery identity is required.')
  let after: string | undefined
  if (cursor) {
    const state = row(JSON.parse(cursor))
    if (
      typeof state.after !== 'string' ||
      !/^sub_[A-Za-z0-9_]+$/.test(state.after)
    )
      throw new Error('Invalid billing continuation.')
    after = state.after
  }
  const next = await reconcileStripeSlice(
    provider,
    store,
    eventId,
    customerId,
    after,
  )
  return next
    ? continueRun({
        cursor: JSON.stringify({ after: next }),
        progressMessage: 'Refreshing subscription status',
      })
    : { status: 200, body: { ok: true } }
}
export async function billingWebhook(
  request: Request,
  scope: { projectId: string; tenantId: string; apiUrl?: string },
) {
  if (!scope.projectId || !scope.tenantId)
    throw new Error('Configure the billing scope first.')
  const ingress = await requireScopedToken(request, {
    expectedProjectId: scope.projectId,
    expectedTenantId: scope.tenantId,
    jwksUrl: `${operationApi(scope.apiUrl)}/.well-known/jwks.json`,
  })
  const { provider, app } = await billingContext(
    {
      ...ingress,
      apiUrl: scope.apiUrl,
    },
    4_000,
  )
  const reader = request.body?.getReader()
  if (!reader) throw new Error('Billing delivery has no body.')
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.length
      if (size > 1_048_576)
        throw new BillingDeliveryRefused('Billing delivery is too large.', 413)
      chunks.push(value)
    }
  } finally {
    await reader.cancel()
  }
  const bytes = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.length
  }
  let event: Record<string, unknown>
  try {
    event = await verifyStripeDelivery(
      new TextDecoder().decode(bytes),
      request.headers.get('Stripe-Signature') ?? '',
      provider.config.webhookSecret,
    )
  } catch {
    throw new BillingDeliveryRefused('Invalid Stripe signature.')
  }
  if (!isBillingEvent(event.type))
    return Response.json({ accepted: true, ignored: true })
  if (event.livemode !== (provider.config.mode === 'live'))
    throw new BillingDeliveryRefused('Billing delivery mode does not match.')
  const customerId = await provider.eventCustomer(event)
  // The customer's stored Fóir ownership is authoritative. Provider metadata
  // is an additional check inside the run, never an email-based identity join.
  if (!(await billingStore(app).actorForCustomer(customerId)))
    return Response.json({ accepted: true, ignored: true })
  return startBillingRun(
    // An install delivery addresses its own manifest key, without the app prefix.
    (args) => app.operations.start('reconcile-stripe', args),
    String(event.id),
    customerId,
  )
}
