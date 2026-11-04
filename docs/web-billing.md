# Web subscriptions

This describes the template integration, illustrated by Tilly. Preserve the
shared integration when adapting the app; change its product rules and content
to match the new application.

Checkout/Portal are signed Fóir operations. Stripe webhooks enter through the
installation's inbound gateway. Fóir owns dispatch, concurrency, retries,
callbacks and continuations; the app implements provider-specific product logic.
No application queue, stored dispatch credential or frontend API proxy is needed.
Billing is disabled by default.

## Identity and reconciliation

Checkout derives the actor from verified ingress, selects a configured recurring
price and fixes HTTPS return origins. It checks existing Premium/subscription
state before another purchase. The private billing-account record maps that
actor to the provider customer; email is not an identity join.

Concurrent Checkout requests reuse a stable provider generation and validate
open sessions before resuming them. The inbound handler checks Stripe's signature
over original bytes, resolves ownership through the provider object graph and
private mapping, then starts native reconciliation under the customer key.
A joined in-flight run returns a retryable response; joining must not acknowledge
an event that was not processed. See [operations](operations.md).

Each reconciliation slice reads authoritative Stripe state for one subscription
and returns the native continuation when more remain. Duplicate or out-of-order
events re-read current state. Stripe grants are separate from RevenueCat/manual
and free grants; one provider's cancellation does not revoke another valid grant.
Portal checks ownership before returning a temporary provider URL.

The adapter handles renewal, cancellation, expiry, full/partial refunds,
disputes, actionable fraud state and deleted customers. Unpaid invoice payments
are ignored; unsupported external `payment_record` payments fail closed.
Partial refunds retain access; split invoices revoke only after every settled
charge is fully refunded. These are handler contracts, not a claim that your
store/provider configuration is already connected.

## Configure your installation

1. Follow the README's manifest/root sequence. Review the private
   `web-billing-account` model and signed-in Checkout/Portal ceilings. Anonymous
   callers and the native key receive no web-billing model authority.
2. Store restricted provider/webhook credentials in Fóir installation fields.
   Configure recurring price, currency/interval, test/live mode and fixed origin.
   Preserve unrelated provider fields. Do not copy an example Development price.
3. Review native operation quotas/callbacks with `pnpm configure:operations`,
   apply/read back the intended settings and selectively release them before
   enabling callers. Recheck after install updates. [Known gaps](known-gaps.md)
   describes the current installation-policy limitation.
4. Register the installation's inbound URL for the subscription, invoice,
   checkout, refund/dispute/fraud and customer events the adapter consumes.
   Enable the provider customer portal. Use an isolated sandbox first.
5. Check purchase/restore and expiry/refund behavior with the same verified
   identity, including duplicate/out-of-order delivery and continuation/callback
   recovery. A local fixture or accepted webhook is not settlement proof.
6. Review your own tax/registrations and provider terms before enabling
   `VITE_TILLY_WEB_BILLING`. The template does not silently enable automatic tax
   or a merchant-of-record arrangement. Production/live activation is separate.
