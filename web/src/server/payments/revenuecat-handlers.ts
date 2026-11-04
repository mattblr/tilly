import { createAppClient } from '@foir/sdk/app'
import { continueRun, requireScopedToken, type ScopedTokenIngress } from '@foir/sdk/server'
import { operationApi } from '../operations/environment'
import { BillingDeliveryRefused } from './workflow'
import { isRevenueCatActor, verifyRevenueCatDelivery } from './revenuecat'
import { reconcileRevenueCatGrant } from './revenuecat-grants'

type Ingress = Pick<ScopedTokenIngress, 'dispatch' | 'userId'> & { apiUrl?: string }
export function revenueCatClient(ingress: Ingress) {
  return createAppClient({ apiUrl: operationApi(ingress.apiUrl), dispatch: ingress.dispatch,
    requestInit: { signal: AbortSignal.timeout(45_000) } })
}

/** Provider settings and secrets belong to the verified Fóir installation. */
async function context(ingress: Ingress) {
  const app = revenueCatClient(ingress)
  const [credentials, config] = await Promise.all([app.install.credentials(), app.install.config()])
  const { revenueCatAppId: appId } = config.settings
  const signingSecret = credentials.revenueCatWebhookSecret?.trim()
  const apiKey = credentials.revenueCatApiKey?.trim()
  if (!apiKey || !signingSecret || typeof appId !== 'string' || !appId)
    throw new Error('RevenueCat lifecycle delivery is not configured.')
  return { app, apiKey, signingSecret, appId }
}

/** One gateway, two provider signatures. A provider event selects a fresh lookup;
 * it never supplies access, expiry or a Fóir credential. Fóir owns queued work. */
export async function revenueCatWebhook(request: Request,
  scope: {projectId: string; tenantId: string; apiUrl?: string}) {
  if (!scope.projectId || !scope.tenantId) throw new Error('Configure the RevenueCat delivery scope first.')
  const ingress = await requireScopedToken(request, {
    expectedProjectId: scope.projectId, expectedTenantId: scope.tenantId,
    jwksUrl: `${operationApi(scope.apiUrl)}/.well-known/jwks.json`,
  })
  if (ingress.userId) throw new BillingDeliveryRefused('An install delivery is required.', 403)
  const config = await context({...ingress, apiUrl: scope.apiUrl})
  const reader = request.body?.getReader()
  if (!reader) throw new BillingDeliveryRefused('Missing RevenueCat delivery.')
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const {value, done} = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > 1_048_576) throw new BillingDeliveryRefused('Delivery is too large.', 413)
      chunks.push(value)
    }
  } finally { await reader.cancel() }
  const bytes = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length }
  let event
  try {
    event = await verifyRevenueCatDelivery(bytes,
      request.headers.get('X-RevenueCat-Webhook-Signature') ?? '', config)
  } catch { throw new BillingDeliveryRefused('Invalid RevenueCat delivery.') }
  if (!event.actorIds.length) return Response.json({accepted: true, ignored: true})
  // Joining is not completion of the joining event. Leave it retryable; a
  // duplicate after completion safely re-reads the provider's current state.
  const run = await config.app.operations.start('reconcile-revenuecat', {
    input: {actorIds: event.actorIds}, concurrencyKey: 'revenuecat-lifecycle',
  })
  if (!run.executionId || typeof run.joined !== 'boolean') throw new Error('Fóir did not confirm the RevenueCat run.')
  return run.joined
    ? new Response('Subscription status is refreshing.', {status: 503, headers: {'Retry-After': '5'}})
    : Response.json({accepted: true}, {headers: {'Cache-Control': 'no-store'}})
}

/** Sole RevenueCat grant writer. The verified gateway always uses the same
 * native installation-wide concurrency key, including transfers/continuations.
 * It has a separate operation key from the read-only client check: clients must
 * not be able to occupy the writer's native concurrency namespace.
 * This operation has no client grant. Its only input is an authenticated
 * delivery's selectors; the native user lookup checks the installation scope. */
export async function reconcileRevenueCatDelivery(ingress: Ingress, input: unknown,
  cursor: string | undefined) {
  if (ingress.userId) throw new Error('RevenueCat delivery requires install dispatch.')
  const actors = (input as {actorIds?: unknown})?.actorIds
  if (!Array.isArray(actors) || !actors.length || actors.length > 200 || !actors.every(isRevenueCatActor))
    throw new Error('Invalid RevenueCat actor selectors.')
  const index = cursor === undefined ? 0 : Number(cursor)
  if (!Number.isSafeInteger(index) || index < 0 || index >= actors.length ||
      (cursor !== undefined && String(index) !== cursor)) throw new Error('Invalid RevenueCat continuation.')
  const config = await context(ingress)
  const actor = actors[index] as string
  const user = await config.app.users.get(actor)
  if (user?.id === actor) await reconcileRevenueCatGrant(config.app, actor, config.apiKey, {})
  return index + 1 < actors.length
    ? continueRun({cursor: String(index + 1), progressMessage: 'Refreshing subscriptions'})
    : {status: 200, body: {ok: true}}
}
