# Operations without another job system

The client reads through Fóir's SDK and invokes a named Fóir operation. Fóir
checks its authority and quotas, records the run and sends a scoped dispatch to
the template's single web Worker. The Worker verifies the expected project and
tenant and builds its SDK client from that dispatch.

A short operation awaits its work and returns the result. Checkout is an example.
An async operation awaits a bounded slice and its completion callback inside the
request. If another slice is needed, it returns `continueRun` instead of
completing. Fóir stores the cursor and queues the next dispatch with fresh
authority. Nothing is left running after an HTTP response.

```ts
const next = await processOnePage(payload.continuation?.cursor)
if (next) return continueRun({ cursor: next })
await callback.complete({ ok: true })
return new Response(null, { status: 202 })
```

See `web/src/server/operations/async.ts` and billing reconciliation for the actual
adapter. Cursors contain progress identifiers, never image bytes or credentials.
Retries and exhausted runs remain visible in Fóir; do not create a second local
job table or persist the dispatch/callback credential.

An operation concurrency key **joins** an in-flight run. It does not enqueue a
second input behind it. For billing, a joining webhook is temporarily refused
so the gateway returns a retryable error to the provider. A successful
acknowledgement here would lose the joining event. State reconciliation is
idempotent even when repeated deliveries start separate runs.

## Subscription reconciliation

RevenueCat has one grant-writing operation, `reconcile-revenuecat`. Its verified
inbound gateway starts it directly using a fixed installation-wide native
concurrency key. Fóir serializes the authoritative provider reads and grant
writes across the entire run, including transfer/alias continuations. Transfer
changes are sequential; they are not one atomic multi-user transaction.

The signed-in `claim-premium` operation only checks RevenueCat and the user's
Fóir grant. It cannot write grants or invoke another operation. Keeping its
operation key separate also keeps clients out of the writer's concurrency
namespace. Do not replace this with a client-supplied key as a security boundary,
an application lock, a second queue or a timestamp invented for the provider.

Purchase/restore can finish at the store before its webhook has updated Fóir.
The app shows a syncing state and offers a read-only status check instead of
another purchase. [RevenueCat documents delivery delays](https://www.revenuecat.com/docs/integrations/webhooks#delivery-delays);
immediate activation is not guaranteed. Configure the webhook before enabling
purchases and verify its selected app/environment and HMAC credentials.

For work already accepted into Fóir, inspect and recover the native failed run
or dead letter. A missing or exhausted provider delivery must be
[retried in RevenueCat](https://www.revenuecat.com/docs/integrations/webhooks#retrying-a-failed-webhook),
or resent from the customer's event details. A read-only restore does not
backfill a missing webhook. Do not repair this by editing grant records or
asking the customer to buy again. Provider outages remain retryable failures,
not evidence that an existing subscription was revoked.

Art is one bounded provider request, with a five-minute operation timeout and
no automatic paid retry after an ambiguous failure. Its handler awaits the
provider, private upload, record changes and completion callback. For a provider
that supports asynchronous jobs, use a continuation carrying its job ID rather
than adding another queue. This template does not claim that provider API exists
for every image model.

A host must support the declared request duration. The checked-in Worker is one
hosting option; there is no Cloudflare Queue binding. Before changing hosts,
verify long dispatches, callbacks, cancellation, deadlines and continuation
redelivery on the selected runtime.
