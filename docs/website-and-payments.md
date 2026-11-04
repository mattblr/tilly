# One project, website and iOS

This describes the template integration, illustrated by Tilly. Preserve the
shared integration when adapting the app; change its product rules and content
to match the new application.

The root `foir.config.ts` composes app and CMS into one project/user pool.
Native and web have separate scoped publishable keys in that project.
`project.settings.sites` replaces the site's registered origins, so preserve
other owned origins when adapting it. Registration does not deploy code.

## Editable website content

Website reads use `@foir/sdk/data` for models and `@foir/sdk/client` for nested
CMS documents, with the website's publishable key. No content proxy, general
backend key or second database is required. Content edits resolve at runtime;
changing layout code still requires a build.

Example content is `web/content/seed.json`. After reviewing/applying the root
configuration in your explicitly selected Development project, run
`pnpm seed --dry-run`, review the target and then
`pnpm seed --development-project <your project ID>`; on production Fóir the ID
must match `FOIR_PROJECT_ID`, so the seed can't land in a live project. The script uses
the signed-in person's supported CLI commands. It creates missing records,
publishes newly created CMS content and skips existing records entirely.
It preserves existing edits/translations and does not republish existing drafts.
Edit installed content through Fóir rather than rerunning seed to overwrite it.

- Homepage copy/illustration paths: `ui-copy/marketing-home`, also in Words.
  `image.*.url` accepts same-origin paths or HTTPS URLs; supply `image.*.alt`.
- Uploaded media and SEO: `page/home`. Its first four editorial-media blocks
  override cat, street, friends and art illustrations, in that order.
- Navigation: `main-nav`, `footer`, `footer-meta`; consent: `cookie_consent/default`.
- Supply your own terms/privacy pages and support details. Policies and user
  records are excluded from the seed. Describe your actual storage/data usage.

Menus/reference links and prose are explicit typed CMS selections in
`web/src/lib/content.graphql`, generated into
`web/src/generated/foir.content.generated.ts`. Run `pnpm generate:website` with
your own scoped website key after schema/grant changes. Do not hand-edit types
or treat default model selections as a platform nesting limit.

Shared app labels use the same `ui-copy` namespaces and bundled
`ios/Tilly/Resources/Copy.json` defaults. Published theme values use the shared
[design tokens](design-tokens.md), with offline native/web defaults.

## Public app data

The homepage uses public totals and a bounded recent list. Reshares do not
inflate original-catch totals. Its globe uses coarse three-character geohash
centroids rather than user identity or capture coordinates. Native change
streams invalidate snapshots; periodic/focus/reconnect reads remove stale rows.
The stream limitation is in [known gaps](known-gaps.md).

Feed, cat stories, profiles and map use direct scoped reads, pagination and
account-generation guards. Following merges independently paged streams;
truncated ranked aggregates are not presented as complete rankings. Map queries
follow the viewport and each cat's latest approximate catch location, not live cat positions.
The anonymous baseline remains read-only. Uploads/social writes require the
signed-in session and approved operation ceiling.

## Hosted browser sign-in

Set `TILLY_LOGIN_ORIGIN` before applying the root config to declare the
first-party `tilly-web` client. Review its exact origins/grants, complete DNS
ownership/HTTPS setup, then set `VITE_FOIR_LOGIN_ORIGIN` and rebuild.
The login domain and website share a registrable domain; `/feed` is the
post-login page. Keep one project/user pool and preserve the native Apple audience.
See [Apple setup](apple-sign-in.md).

`@foir/sdk/auth/session` owns the HttpOnly first-party cookie; short bearers stay
in SDK memory. Refresh exchanges that cookie and sign-out revokes the hosted
session. No custom password form, persisted browser refresh token or broader
session proxy is shipped. Use an HTTPS sibling preview to exercise that cookie
flow; localhost is a different origin/domain context.

## Optional subscriptions

RevenueCat uses the verified Fóir actor and an installed server credential for
subscription verification. The native SDK key is public; APNs, Apple identity
and purchase credentials are separate account configurations. No private
provider credential belongs in the native app or web bundle.

Stripe Checkout/Portal and reconciliation use signed operations behind disabled
defaults. Browser return from Checkout does not grant Premium. Configure your
own products, credentials, native limits and supported lifecycle before enabling
it; see [web billing](web-billing.md) and [artwork](tilly/artwork.md).
