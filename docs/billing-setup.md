# Connect Stripe and RevenueCat

Premium works on the web through Stripe and on iPhone through the App Store,
with RevenueCat verifying App Store purchases. Both providers send webhooks to
the Tilly app installation in Fóir, and the operations read provider keys from
that installation's credentials. Nothing provider-related goes in the Worker,
the web bundle or the iPhone app, apart from RevenueCat's public SDK key.

Do this once for each Fóir project. Use test-mode Stripe and a separate
RevenueCat setup for Development, and live Stripe for production.

## 1. Find the webhook address

Open the app's admin console in Fóir, go to the **Premium** tab and choose
**Check setup**. It shows the installation's webhook address and lists any
provider keys that are still missing. Stripe and RevenueCat both use this one
address: the app tells them apart by their signature headers.

The address ends in a signed segment. Keep it private, as you would a key.
Fóir doesn't show it anywhere else yet (see [known gaps](known-gaps.md),
"Webhook address").

## 2. Stripe (web)

The secret key decides test or live mode: `sk_live_` or `rk_live_` is live.

1. **Product and price.** Create a product and a recurring monthly price in the
   currency you sell in. Its ID (`price_…`) goes in the `stripePriceId` setting.
2. **API key.** Create a restricted key. It needs write access to Customers,
   Checkout Sessions and Customer portal sessions, and read access to
   Subscriptions, Invoices, Invoice payments, Charges, Payment Intents, Prices,
   Events and Radar early fraud warnings. Save it as the `stripeSecretKey`
   credential.
3. **Webhook.** Add a webhook destination for your account's events. Use the
   address from step 1, the **snapshot** payload style and your account's
   default API version. Select these events:
   - `checkout.session.completed`, `checkout.session.async_payment_succeeded`
   - `customer.subscription.created`, `.updated`, `.deleted`, `.paused`, `.resumed`
   - `customer.deleted`
   - `invoice.paid`, `invoice.payment_succeeded`, `invoice.payment_failed`,
     `invoice.voided`, `invoice.marked_uncollectible`
   - `invoice_payment.paid`, if your API version offers it
   - `charge.refunded`
   - `charge.dispute.created`, `.closed`, `.funds_withdrawn`, `.funds_reinstated`
   - `refund.created`, `refund.updated`
   - `radar.early_fraud_warning.created`, `radar.early_fraud_warning.updated`

   Save the endpoint's signing secret (`whsec_…`) as the `stripeWebhookSecret`
   credential.
4. **Customer portal.** In the Stripe Dashboard, open Settings → Billing →
   Customer portal. Turn on cancelling subscriptions, updating payment methods
   and invoice history, add links to your `/privacy` and `/terms` pages, and
   save. The app opens Stripe's default portal configuration, and only the
   Dashboard can create that default; until it's saved, **Manage your
   subscription** fails.

## 3. RevenueCat (App Store)

1. **App and products.** Create the iOS app with your bundle ID and connect it
   to App Store Connect. Add your monthly App Store subscription product, a
   `premium` entitlement and a `premium` offering that contains it. The app's
   ID (`app…`) goes in the `revenueCatAppId` setting.
2. **API key.** Create a secret API key. The app calls RevenueCat's v1 REST
   API with it (`GET /v1/subscribers/{id}`) to check a purchase, so the key
   must work with that API. Save it as the `revenueCatApiKey` credential.
3. **Webhook.** Add a webhook integration for the iOS app, using the address
   from step 1. Send events from both the production and sandbox environments:
   TestFlight and App Review buy through the sandbox, and those purchases
   unlock Premium too. RevenueCat Test Store purchases are refused. Save the
   integration's signing secret as the `revenueCatWebhookSecret` credential.
4. **Public SDK key.** Put the app's public SDK key (`appl_…`) in
   `TILLY_REVENUECAT_KEY` in `.env`, then run `ios/scripts/app-key.sh`. This key
   is public by design.

## 4. Save credentials and settings

Enter the credentials in the Fóir console under **Apps → Tilly → Credentials**.
Don't put them in commands, source files, `.env` or Worker settings. The fields
are:

| Field | What it is |
| --- | --- |
| `stripeSecretKey` | Stripe restricted key |
| `stripeWebhookSecret` | Stripe webhook signing secret |
| `revenueCatApiKey` | RevenueCat secret API key |
| `revenueCatWebhookSecret` | RevenueCat webhook signing secret |
| `openai`, `appearanceOpenAI`, `moderationOpenAI` | OpenAI keys for artwork, appearance suggestions and safety checks |

The settings aren't secret, so you can set them from the CLI:

```sh
foir x-generated apps set-settings --name tilly \
  --settings '{"siteOrigin":"https://your-site.example","stripePriceId":"price_…","revenueCatAppId":"app…"}'
```

`siteOrigin` is where Checkout and the portal send people back to.

## 5. Check it

Run **Check setup** again. It should list nothing missing. Then apply the
operation quotas, including Premium's artwork allowance, with
`pnpm configure:operations --apply` and release them. Do this after every
install or update of the app, because both leave quotas unset.

Finally, test each provider before you launch:
- a Stripe test-mode purchase, a cancellation in the portal and a refund
- an App Store sandbox purchase with a sandbox tester, then **Restore**

In each case, check that Premium appears and disappears for the same signed-in
account. A webhook that Stripe or RevenueCat reports as delivered doesn't prove
Premium was granted; check the account itself. See
[web billing](web-billing.md) for how the handlers reconcile purchases.
