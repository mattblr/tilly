import type { AppClient } from '@foir/sdk/app'
import { row, type BillingStore } from './stripe'
/** Product-specific Stripe reconciliation. Both providers use private Fóir
 * grants; identity, record ownership and queued execution remain platform-owned.
 * Every client is built from verified ingress.dispatch, without a Fóir key. */
export function billingStore(
  app: AppClient,
  signedInActor?: string | null,
): BillingStore {
  const own = (actor: string) => {
    if (signedInActor && signedInActor !== actor)
      throw new Error('Billing account identity did not match.')
    return !!signedInActor
  }
  return {
    async customerId(actor) {
      const answer = row(
        await app.request(
          own(actor)
            ? `query Account { accounts: myWebBillingAccounts(first: 2) { edges { node { _ownerId customerId } } } }`
            : `query Account($me: ID) { accounts: webBillingAccounts(first: 2, where: {ownerId: {eq: $me}}) { edges { node { _ownerId customerId } } } }`,
          own(actor) ? {} : { me: actor },
        ),
      )
      const connection = row(answer.accounts)
      if (!Array.isArray(connection.edges) || connection.edges.length > 1)
        throw new Error('Billing account state is unavailable.')
      if (!connection.edges.length) return null
      const account = row(row(connection.edges[0]).node)
      if (account._ownerId !== actor || typeof account.customerId !== 'string')
        throw new Error('Billing account identity did not match.')
      return account.customerId
    },
    async actorForCustomer(customerId) {
      const answer = row(
        await app.request(
          `query Actor($customer: String) { webBillingAccounts(first: 2, where: {customerId: {eq: $customer}}) { edges { node { _ownerId customerId } } } }`,
          { customer: customerId },
        ),
      )
      const edges = row(answer.webBillingAccounts).edges
      if (!Array.isArray(edges) || edges.length !== 1) return null
      const account = row(row(edges[0]).node)
      return account.customerId === customerId &&
        typeof account._ownerId === 'string'
        ? account._ownerId
        : null
    },
    async revokeStripeGrants(actor) {
      let after: string | null = null
      const seen = new Set<string>()
      do {
        const answer = row(
          await app.request(
            `query Grants($me: ID, $after: String) { premiumGrants(first: 100, after: $after, where: {ownerId: {eq: $me}}) { edges { node { note } } pageInfo { hasNextPage endCursor } } }`,
            { me: actor, after },
          ),
        )
        const connection = row(answer.premiumGrants)
        if (!Array.isArray(connection.edges))
          throw new Error('Subscription grants are unavailable.')
        for (const edge of connection.edges) {
          const note = row(row(edge).node).note
          if (
            typeof note !== 'string' ||
            !/^Stripe subscription:sub_[A-Za-z0-9_]+$/.test(note)
          )
            continue
          const subscriptionId = note.slice('Stripe subscription:'.length)
          await app.records.upsert({
            model: 'premium-grant',
            naturalKey: `stripe~${subscriptionId}`,
            ownerId: actor,
            data: { until: new Date(0).toISOString(), note },
          })
        }
        const page = row(connection.pageInfo)
        if (!page.hasNextPage) break
        if (typeof page.endCursor !== 'string' || seen.has(page.endCursor))
          throw new Error('Subscription grants did not advance.')
        after = page.endCursor
        seen.add(after)
      } while (true)
    },
    async keepCustomer(actor, customerId) {
      own(actor)
      await app.records.upsert({
        model: 'web-billing-account',
        // Natural record addresses are shared across this model, even for private owners.
        naturalKey: `stripe~${actor}`,
        ownerId: actor,
        data: { customerId },
      })
    },
    async hasPremium(actor) {
      const answer = row(
        await app.request(
          own(actor)
            ? `query Premium($now: DateTime) { grants: myPremiumGrants(first: 1, where: {until: {gt: $now}}) { totalCount } }`
            : `query Premium($me: ID, $now: DateTime) { grants: premiumGrants(first: 1, where: {ownerId: {eq: $me}, until: {gt: $now}}) { totalCount } }`,
          {
            ...(own(actor) ? {} : { me: actor }),
            now: new Date().toISOString(),
          },
        ),
      )
      const count = row(answer.grants).totalCount
      if (typeof count !== 'number' || !Number.isSafeInteger(count))
        throw new Error('Premium status is unavailable.')
      return count > 0
    },
    async stripeGrant(actor, subscriptionId, until) {
      if (
        !/^sub_[A-Za-z0-9_]+$/.test(subscriptionId) ||
        !Number.isFinite(Date.parse(until))
      )
        throw new Error('Invalid Stripe grant.')
      await app.records.upsert({
        model: 'premium-grant',
        naturalKey: `stripe~${subscriptionId}`,
        ownerId: actor,
        data: { until, note: `Stripe subscription:${subscriptionId}` },
      })
    },
  }
}
