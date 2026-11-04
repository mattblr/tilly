# Tilly

A template for building your own app on Fóir, demonstrated by Tilly, a
cat-sharing social app for iOS and the web. The phone recognises nearby cats,
records catches, and shows feeds, maps, follows and photo challenges; the web
app does the same in the browser. The repository also holds the marketing site,
an admin console embedded in Fóir, and optional Premium artwork and billing.

Adapt the models, screens and operations to your own product with `AGENTS.md`
and the bundled skills below, then set up your own project with the steps in
[Set up your own project](#set-up-your-own-project).

## Build your own app

This template provides an iOS app, web app/website, subscription billing and an
admin console embedded in Fóir. Keep that integrated foundation and refactor
Tilly's application-specific concepts into your own product. An app unrelated
to cats still uses the same clients, shared identity, purchase/restore flows,
server-enforced entitlements, CMS, console and Fóir integrations.

Start with these skills:

1. [adapt-tilly](.agents/skills/adapt-tilly/SKILL.md) interviews you about the app
   idea, users, core workflow, charging, content and administration, then produces
   a product brief. It does not start changing the app during discovery.
2. [plan-foir-app](.agents/skills/plan-foir-app/SKILL.md) compares that brief with
   the current implementation, identifies what stays and changes, and creates
   workstreams and dependency-ordered tickets in your tracker.
3. [build-foir-app](.agents/skills/build-foir-app/SKILL.md) implements those tickets
   while preserving the foundation and following Fóir's native patterns.

Charging is your product decision. A free launch can keep billing inactive;
it does not require deleting subscription support. Plans, prices, paid benefits,
domain models, screens, content and branding are adapted to your app. Fóir owns
the backend infrastructure; operations contain application-specific logic.

The [documentation guide](docs/README.md) separates shared setup/integrations
from [Tilly domain references](docs/tilly/). Use the examples to understand the
implementation without treating cat-specific rules as requirements.

## Architecture

The web is one TanStack Start project in `web/`, with one Vite build and
one Cloudflare Worker deployment. The console and operations are source inside
that project; there is no separate console bundle to copy or operation service
to deploy.

| Part                      | Source                                        | Responsibility                                                |
| ------------------------- | --------------------------------------------- | ------------------------------------------------------------- |
| iOS app                   | `ios/`                                        | Camera, recognition, map, user session and native purchases |
| Public website            | `web/src/routes/_site*`                       | Homepage and public CMS pages                                 |
| Console route             | `web/src/routes/[_]foir.apps.tilly.admin.tsx` | Fóir's embedded administration page                           |
| Console UI                | `web/src/features/console/`                   | Handwritten editors and shadcn/Radix components               |
| Operation handlers        | `web/src/server/operations/`                  | Catch writes, sharing, art and Premium checks                 |
| Generated operation types | `web/src/server/operations/generated/`        | Credential-specific SDK types, regenerated from Fóir          |
| Worker entry              | `web/src/server.ts`                           | Start, signed dispatch, public manifest and operation slices  |
| Fóir model config         | `web/foir/app.ts`, `web/schema.ts`           | App and CMS declarations composed by the root config          |

Start with the handwritten handler and feature files above. Generated SDK, CMS document
and route-tree files are grouped and marked as generated for GitHub; they support
the application rather than replacing its implementation.

The app holds a publishable key and the user's session. Reads go directly to
Fóir. Business logic is invoked as Fóir operations, never through a frontend
proxy with broader credentials. Operation handlers verify Fóir's signed token
and build their data client from `ingress.dispatch`. The Worker has no general
Fóir API key. Third-party clients can have server credentials; this app's logic
runs as operations.

Fóir is the managed backend. Operations contain app-specific business rules,
not a second backend implemented in records: no custom metering, financial
ledger, reservation service, queue or identity/access-control infrastructure.
Use Fóir's supported capabilities and verify the semantics required by the
product. The maintained [known gaps](docs/known-gaps.md) explain current limits
affecting the template. Read that inventory when choosing the
template; customers are not expected to build platform replacements or maintain
a gaps document as part of setup.

The public routes are `/`, CMS page paths, `/_foir/apps/tilly/admin`, and
`/_foir/apps/tilly.json`. `/operations/*` is reachable by the platform, but every
request requires a valid dispatch token bound to your project and tenant.
Fóir owns background execution, retries and dead letters. Handlers await bounded
work and its callback inside each request; longer paged work returns a Fóir
continuation. No Cloudflare Queue or second job system is required.

## Set up your own project

You need:

- a Fóir account with an empty project for development
- a Cloudflare account for the single Worker that serves the website, console
  and operations
- Xcode and an Apple Developer account for the iOS app
- optionally RevenueCat (native subscriptions), Stripe (web billing) and an
  OpenAI key (moderation, challenges and artwork); each stays off until configured

Start your own repository from this template rather than forking its history.

1. Install Node 22.18+, pnpm 10.33 and Xcode. Run `pnpm install --frozen-lockfile`.
2. Connect the [Fóir MCP server](https://docs.foir.dev/ai/mcp) to your coding agent,
   sign in with OAuth, and explicitly select your workspace and project. The
   server is `https://mcp.foir.dev/mcp`; the CLI can also bridge it with
   `foir mcp --url https://mcp.foir.dev/mcp` after `foir login`. Discover the served
   tools and schemas; don't copy tool names from another installation.
3. Copy `.env.example` to `.env` and fill your own project and tenant IDs and
   site origin. Leave the key variables empty: `foir push` creates the
   publishable keys and writes them into `.env`. The defaults target production
   Fóir (RPC `rpc.foir.io`, GraphQL `api.foir.dev`), where your Development
   project lives beside any live one. The website and iOS share this one project and user pool;
   use separate publishable keys with appropriate access within that project.
4. Review the root `foir.config.ts` with the agent. It composes app and CMS
   models into one configuration. For a fresh project, apply the additive first
   stage with `FOIR_BOOTSTRAP_SCHEMA_ONLY=true pnpm exec foir push --no-prune`.
   This creates the model surface without unresolved app-operation grants.
   Install the hosted manifest in step 7, then apply the full root. Review proposed access
   changes explicitly. Example content lives in `web/content/seed.json`;
   supply your own legal policies before publishing.
5. Configure `web/wrangler.jsonc` with your app project/tenant IDs and
   RevenueCat's publishable SDK key. Set the marketing build variables from
   `.env.example`. No account IDs, custom-domain routes or deploy automation
   are preconfigured.
6. Run `pnpm build`. The single Start build includes the public website,
   console route and server-side operations. Run `pnpm test`, `pnpm check:ios-inbox`, `pnpm check:web`
   and `pnpm check:public`. Run `pnpm --dir web cf-typegen` after changing Worker bindings. No application
   queue resources need provisioning. `pnpm deploy` rebuilds and deploys this single
   Worker; run it only after reviewing your own account/resource configuration.
   Deployment is an explicit separate action.
7. Once the origin serves `/_foir/apps/tilly.json`, finish the project:
   - Review and install the app with
     `foir apps install <origin>/_foir/apps/tilly.json` in the selected project
     (or review `foir apps update tilly` for an existing install). Its operation
     keys must exist before the root role/client ceilings reference them. The
     publicly readable manifest declares grants and endpoints, never a credential.
   - Fill the app's provider credential fields in Fóir. See
     [operation credentials](docs/operation-credentials.md) for the current
     platform gap and the installed-operation bridge.
   - Preview the operations' quota/callback settings with
     `pnpm configure:operations`, apply them with
     `pnpm configure:operations --apply`, and release them before enabling
     callers or hooks. An install update resets them, so recheck after one.
   - Preview and apply the full root `foir.config.ts` with `--no-prune`. The same
     root keeps tracking the app, and the push writes the publishable keys into
     `.env`.
   - Regenerate operation types after changing grants or the schema:
     `foir types --public-api-url https://api.foir.dev --operation <operation-key> --out web/src/server/operations/generated/foir.op.<operation-key>.generated.ts`.
   - Rebuild and redeploy the website, then preview the example content with
     `pnpm seed --dry-run`, then run
     `pnpm seed --development-project <your project ID>` (the ID must match
     `FOIR_PROJECT_ID`, so the seed can't land in another project). Existing content and translations
     are preserved. See [website setup](docs/website-and-payments.md) for the
     seeded records.
8. In RevenueCat, create an app, `premium` entitlement and offering, then use
   your own App Store products. Subscription verification happens in the
   `claim-premium` operation, not on the phone. Test purchases are rejected by
   default; only enable them in a separate dev setup.
9. Run `ios/scripts/app-key.sh`. Add your Apple development team in a local
   xcconfig, set your own bundle identifiers/sign-in settings, and open
   `ios/Tilly.xcodeproj`. The notification extension must use a child bundle ID
   and the same signing team. Use your own push credentials, with the correct
   development/production APNs environment. No signing credentials are included.

The website uses Fóir's SDK directly: `@foir/sdk/data` for model reads and
`@foir/sdk/client` for CMS selections containing nested menus, inline page links
and prose. CMS document types are generated from the same scoped website key;
Apollo is not used by the website. After supplying `VITE_PLATFORM_API_KEY`, run
`pnpm generate:website` to regenerate both website modules. The script reads
the root `.env` without printing its key. Keep generated files unchanged.

Generated clients describe the schema served to each credential. Regenerate
for your own project after schema/grant changes; never add fields by hand.
`ios/scripts/codegen.sh --offline` generates the main app and the Notifications,
Safety, Selfies, Execution and Challenges namespaces from their
corresponding served snapshots under `ios/GraphQL/`. Run it after refreshing
those snapshots for your actual native scopes. Website/operation generation is
separate and uses each client’s own served surface.

Published website colours, spacing and photo radius come from Fóir design tokens,
with shared native/web defaults in `ios/Tilly/Resources/DesignTokens.json`.
iOS reads the published semantic palette, gutter and photo radius through its
normal scoped client and retains validated offline values; see
[design-token setup](docs/design-tokens.md). The web feed/art labels read
the same `ui-copy` namespaces and bundled defaults as iOS. See
[hosted sign-in and public activity setup](docs/website-and-payments.md) and
[recoverable errors](docs/errors.md).

## Local checks

Run the source tests, web build and contract checks:

```sh
pnpm test
pnpm build
pnpm check:web
pnpm check:ios-pagination
pnpm check:public
```

The [CI workflow](.github/workflows/checks.yml) runs these source checks with
synthetic inputs on Linux, and the native checks on macOS. It does not deploy,
perform store purchases or create a Fóir project.
Native changes also need an Xcode build and an appropriate simulator/device
walkthrough. See [contributing](CONTRIBUTING.md) and [security](SECURITY.md).

The public-tree check supplements secret scanning and manual asset/license
review. Never publish local credentials/configuration, generated build output
or real user records. Keep your own deployment/signing/provider inputs private.

## Shared integrations and example content

[Website content](docs/website-and-payments.md) stays editable through Fóir.
Shared labels use the same native/web copy defaults and published
[design tokens](docs/design-tokens.md). The console's Words editor opens Fóir's
field editor for translations; set `VITE_FOIR_CONSOLE_URL` to your project's
console.

[Artwork](docs/tilly/artwork.md), [appearance suggestions](docs/tilly/appearance-suggestions.md),
[notifications](docs/notifications.md) and [web billing](docs/web-billing.md)
need their own provider/native configuration and remain disabled by default.
The template does not activate live payment or promise an unconfigured allowance.
[Protected preview](docs/web-preview.md) uses a server-only CMS drafts key and
verified editor identity; the published site does not expose drafts.

Sample illustrations are generated and contain no user photographs.
[Asset notes](docs/tilly/assets.md) and [prompts](docs/tilly/asset-prompts.md) describe their
origin. Preserve Work Sans's OFL and bundled component/dependency notices.

## Adapting and deploying

Use the discovery → planning → building workflow above to refactor the product
while preserving its integrated foundation. [Environment setup](docs/environments.md) and
[deployment/rollback](docs/go-live.md) cover your own installations and hosts.
The app, CMS, console and operations remain one root configuration and user pool.

Bundled skills cover [delivery](.agents/skills/turtleneck/SKILL.md),
[mobile verification](.agents/skills/mobile-app-verification/SKILL.md),
[App Store preparation](.agents/skills/app-store-release/SKILL.md),
[billing](.agents/skills/foir-billing/SKILL.md) and
[go-live](.agents/skills/foir-go-live/SKILL.md). Reusable skills come from
[mattblr/skills](https://github.com/mattblr/skills); project configuration belongs
in your private inputs. [turtleneck.md](turtleneck.md) describes delivery commands
and action boundaries. Source setup does not submit, publish or deploy your app.
