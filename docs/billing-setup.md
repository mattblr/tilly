# Connect Stripe and RevenueCat

Premium works on the web through Stripe and on iPhone through the App Store,
with RevenueCat verifying App Store purchases. Both providers send webhooks to
the Tilly app installation in Fóir, and the operations read provider keys from
that installation's credentials. Fóir's Premium grant is the only thing that
decides whether someone has Premium. Nothing provider-related goes in the
Worker, the web bundle or the iPhone app, apart from RevenueCat's public SDK key.

Do this once for each Fóir project. Use test-mode Stripe and a separate
RevenueCat webhook for Development, and live Stripe for production.

## Who can do each step

Some steps have no MCP or CLI route. **If you're an agent installing the
template, don't skip them:** ask the owner to do them in the provider's
dashboard, or do them in a browser the owner has signed in to, with their
go-ahead for each change. Never type a password or secret yourself, and never
create an account. The owner does those.

| Step | Where | Agent route |
| --- | --- | --- |
| Find the webhook address | Fóir console, **Check setup** | MCP: run `tilly.setup-status` |
| Stripe product and price | Stripe | Stripe MCP (each live write needs the owner's approval) |
| Stripe restricted key | Stripe Dashboard | None: the owner creates it and saves it in Fóir |
| Stripe webhook and its secret | Stripe Dashboard | None: the owner creates it; the secret goes straight into Fóir |
| Stripe customer portal default | Stripe Dashboard | None: the API can't create the default. Links can be added later with the Stripe MCP |
| RevenueCat app, product, entitlement, offering | RevenueCat | RevenueCat MCP |
| RevenueCat secret key | RevenueCat dashboard | None: the owner creates it and saves it in Fóir |
| RevenueCat webhook | RevenueCat | RevenueCat MCP creates it; its signing secret comes from the dashboard |
| Apple's server notifications to RevenueCat | RevenueCat dashboard | None: browser with the owner's go-ahead |
| App Store price | App Store Connect | None: browser with the owner's go-ahead |
| Billing grace period | App Store Connect | None: browser with the owner's go-ahead |
| Sandbox tester | App Store Connect | Browser can fill the form; the owner sets the password and clicks Create |
| Credentials | Fóir console, Apps → Tilly → Credentials | None: the owner enters secrets |
| Settings | Fóir | CLI (below) |
| Operation quotas | Fóir | CLI: `pnpm configure:operations --apply`, then release |

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
   Customer portal and save it once, in live mode and again in test mode:
   - Turn on invoice history and updating payment methods.
   - Turn on cancelling, at the end of the billing period, with no proration.
   - Turn off switching plans, changing quantities and pausing.
   - Add links to your `/privacy` and `/terms` pages.

   The app opens Stripe's default portal configuration, and only the Dashboard
   can create that default. Until it's saved, **Manage your subscription** fails.

## 3. App Store and RevenueCat (iPhone)

1. **Product and price.** In App Store Connect, create an auto-renewable
   monthly subscription in a subscription group and set its price. Pricing
   changes are made there; RevenueCat picks them up later.
2. **Billing grace period.** In App Store Connect, open the app's
   Subscriptions page and set up the billing grace period: 16 days, all
   renewals, production and sandbox. When a renewal payment fails, people keep
   Premium while Apple retries. The server already honours RevenueCat's grace
   end date.
3. **RevenueCat app, entitlement and offering.** Create the iOS app with your
   bundle ID and connect it to App Store Connect with an App Store Connect API
   key and an In-App Purchase key. Add the App Store product, a `premium`
   entitlement and a `premium` offering that contains it. The app's ID (`app…`)
   goes in the `revenueCatAppId` setting.
4. **Apple's server notifications.** In RevenueCat, open the iOS app's settings
   and, under Apple server notifications, choose **Apply in App Store Connect**.
   Check that App Store Connect (App Information → App Store Server
   Notifications) now shows RevenueCat's URL for both production and sandbox.
   Without this, RevenueCat hears about renewals, cancellations and refunds
   late, and people briefly lose Premium at each renewal.
5. **API key.** Create a RevenueCat secret API key. The app calls RevenueCat's
   v1 REST API with it (`GET /v1/subscribers/{id}`) to check a purchase, so the
   key must work with that API. Save it as the `revenueCatApiKey` credential.
6. **Webhook.** Add a webhook integration for the iOS app, using the address
   from step 1. Send events from both the production and sandbox environments:
   TestFlight and App Review buy through the sandbox, and those purchases
   unlock Premium too. RevenueCat Test Store purchases are refused. Save the
   integration's signing secret as the `revenueCatWebhookSecret` credential.
   A Development purchase also reaches production's webhook; production skips
   anyone who isn't one of its users.
7. **Public SDK key.** Put the app's App Store public SDK key (`appl_…`) in
   `TILLY_REVENUECAT_KEY` in `.env`, then run `ios/scripts/app-key.sh`. Use it
   in every build, Debug included; a Test Store key (`test_…`) can't buy
   Premium. This key is public by design.

The iPhone app re-reads the Fóir grant on sign-in, on returning to the app,
after a purchase or restore, when RevenueCat reports a change, when the
Premium screen opens and just after the grant ends. **Manage your
subscription** opens Apple's own in-app sheet.

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

Then test each provider before you launch:

- **Stripe:** a test-mode purchase, a cancellation in the portal and a refund.
- **App Store:** in App Store Connect, open Users and Access → Sandbox and add
  a tester in your selling country. App Store Connect can't show or reset a
  sandbox tester's password, so keep it somewhere safe; if it's lost, add a
  new tester. On the iPhone, sign in under Settings → Developer → Sandbox Apple
  Account, then buy Premium in a Debug build and tap **Restore**. Sandbox
  monthly subscriptions renew every few minutes, so watch at least one renewal
  extend the grant.

In each case, check that Premium appears and disappears for the same signed-in
account. A webhook that Stripe or RevenueCat reports as delivered doesn't prove
Premium was granted; check the account itself. See
[web billing](web-billing.md) for how the handlers reconcile purchases.
