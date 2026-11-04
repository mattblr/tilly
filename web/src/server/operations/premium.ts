import { operationApi } from './environment'
import { createAppClient } from '@foir/sdk/app'
import { readRevenueCatSubscription } from '../payments/revenuecat'
import type { DispatchEnvelope, OperationIngress, OperationResponse } from './types'
export { subscriptionExpiry } from '../payments/revenuecat'

/** Read-only purchase/restore check. The installation's queued reconciliation is
 * the sole RevenueCat grant writer, so callers cannot race it or choose its
 * native concurrency key. There is no operation-to-operation call. */
export async function claim_premium(
  _input: object, _envelope: DispatchEnvelope, ingress: OperationIngress,
): Promise<OperationResponse> {
  const actor = ingress.userId
  if (!actor) return {status: 403, body: {ok: false, error: 'Only a signed-in user can have Premium.'}}
  const app = createAppClient({apiUrl: operationApi(ingress.apiUrl), dispatch: ingress.dispatch,
    requestInit: {signal: AbortSignal.timeout(45_000)}})
  const credentials = await app.install.credentials()
  const key = credentials.revenueCatApiKey?.trim()
  if (!key) return {status: 503, body: {ok: false, error: 'Premium verification is not configured.'}}
  const state = await readRevenueCatSubscription(actor, key, {})
  const answer = await app.request<{
    premiumGrant: {_ownerId: string; note: string; until: string} | null;
    premiumGrants: {totalCount: number};
  }>(`query RevenueCatClaim($key: String!, $owner: ID!, $now: DateTime!) {
    premiumGrant(naturalKey: $key) { _ownerId note until }
    premiumGrants(first: 1, where: {ownerId: {eq: $owner}, note: {eq: "Subscription"}, until: {gt: $now}}) { totalCount }
  }`, {key: `revenuecat~${actor}`, owner: actor, now: new Date().toISOString()})
  const grant = answer.premiumGrant
  if (grant && (grant._ownerId !== actor || grant.note !== 'Subscription'))
    throw new Error('RevenueCat grant identity did not match.')
  if (!Number.isSafeInteger(answer.premiumGrants?.totalCount) || answer.premiumGrants.totalCount < 0)
    throw new Error('Fóir did not confirm the subscription grants.')
  const converged = state.active
    ? answer.premiumGrants.totalCount === 1 && !!grant && Date.parse(grant.until) === Date.parse(state.until!)
    : answer.premiumGrants.totalCount === 0
  // A confirmed payment awaiting its signed webhook is pending, never a reason
  // to buy again. Recovery replays the provider delivery/native failed run.
  return converged
    ? {status: 200, body: {ok: true, ...state}}
    : {status: 200, body: {ok: false, error: 'PREMIUM_SYNC_PENDING'}}
}
