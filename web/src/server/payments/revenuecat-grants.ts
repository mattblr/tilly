import type { AppClient } from '@foir/sdk/app'
import { isRevenueCatActor, readRevenueCatSubscription } from './revenuecat'

const EPOCH = new Date(0).toISOString()
const NOTE = 'Subscription'
type Grant = {
  _id: string
  _naturalKey: string
  _ownerId: string
  note: string
}

/** Product grant mapping, called only by the installation reconciliation. Its
 * trusted gateway uses one native concurrency key; Fóir serializes
 * the complete provider read and writes. A where filter is not an atomic lock.
 */
export async function reconcileRevenueCatGrant(
  app: AppClient,
  actorId: string,
  apiKey: string,
  options: Parameters<typeof readRevenueCatSubscription>[2],
): Promise<{ active: boolean; until: string | null; grantId: string }> {
  if (!isRevenueCatActor(actorId)) throw new Error('Invalid RevenueCat grant actor.')
  const key = `revenuecat~${actorId}`
  const read = async (): Promise<Grant | null> => {
    const answer = await app.request<{ premiumGrant: Grant | null }>(
      'query RevenueCatGrant($key: String!) { premiumGrant(naturalKey: $key) { _id _naturalKey _ownerId note } }',
      { key },
    )
    const grant = answer.premiumGrant
    if (grant === null) return null
    if (!grant || typeof grant._id !== 'string' || !grant._id ||
        grant._naturalKey !== key || grant._ownerId !== actorId ||
        grant.note !== NOTE)
      throw new Error('RevenueCat grant identity did not match.')
    return grant
  }
  if (!await read()) {
    try {
      // The native unique natural key is the arbiter when two callers create.
      // Never upsert epoch over a grant another call has already reconciled.
      await app.request(
        'mutation CreateRevenueCatGrant($input: CreatePremiumGrantInput!, $owner: ID) { createPremiumGrant(input: $input, ownerId: $owner) { record { _id } } }',
        { input: { naturalKey: key, until: EPOCH, note: NOTE }, owner: actorId },
      )
    } catch (error) {
      // A lost create response or another creator is recoverable only when the
      // exact owned canonical row really exists. Other errors remain errors.
      if (!await read()) throw error
    }
  }
  const grant = await read()
  if (!grant) throw new Error('RevenueCat grant disappeared before reconciliation.')
  const state = await readRevenueCatSubscription(actorId, apiKey, options)
  const saved = await app.records.updateMany('premium-grant', {
    where: {
      id: { eq: grant._id }, ownerId: { eq: actorId },
      naturalKey: { eq: key }, note: { eq: NOTE },
    },
    data: { until: { set: state.until ?? EPOCH } },
  })
  if (saved.count !== 1) throw new Error('RevenueCat grant mutation was ambiguous.')
  // Null natural keys belong to old unkeyed grants too. Keep every other
  // source and owner, and never let this cleanup touch the canonical row.
  await app.records.updateMany('premium-grant', {
    where: {
      ownerId: { eq: actorId }, note: { eq: NOTE },
      OR: [
        { naturalKey: { isNull: true } },
        { NOT: { naturalKey: { eq: key } } },
      ],
    },
    data: { until: { set: EPOCH } },
  })
  return { ...state, grantId: grant._id }
}
