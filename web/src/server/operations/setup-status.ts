import { createAppClient } from '@foir/sdk/app'
import { operationApi } from './environment'
import type { DispatchEnvelope, OperationIngress, OperationResponse } from './types'

/** The provider keys the installation's operations read. */
export const providerFields = [
  'openai',
  'appearanceOpenAI',
  'moderationOpenAI',
  'revenueCatApiKey',
  'revenueCatWebhookSecret',
  'stripeSecretKey',
  'stripeWebhookSecret',
] as const

/**
 * Where Stripe and RevenueCat send their webhooks, and which provider keys the
 * installation holds: names only, never a value.
 *
 * Fóir gap (docs/known-gaps.md, "Webhook address"): an installed app's inbound
 * address is shown only in the install preview. Here: the console's Premium tab
 * runs this, and the app reads its own address with its dispatch. Closes when
 * the installed app's page, CLI and MCP show the address.
 */
export async function setup_status(
  _input: object, _envelope: DispatchEnvelope, ingress: OperationIngress,
): Promise<OperationResponse> {
  const app = createAppClient({ apiUrl: operationApi(ingress.apiUrl), dispatch: ingress.dispatch,
    requestInit: { signal: AbortSignal.timeout(20_000) } })
  const [config, credentials] = await Promise.all([app.install.config(), app.install.credentials()])
  const held = (field: string) => typeof credentials[field] === 'string' && credentials[field].trim() !== ''
  return {
    status: 200,
    body: {
      ok: true,
      webhookUrl: config.webhookUrl || '',
      missing: providerFields.filter(field => !held(field)),
    },
  }
}
