# Development and production

Use separate Fóir projects for isolated Development and live data. Within each
environment, native app, website CMS and hosted identity share one project and
user pool. The root `foir.config.ts` is the only push entry point.

Select the workspace/project and applicable organization explicitly through
OAuth. Confirm standing before writes. Use that environment's own publishable
keys, generated schemas, installed operation endpoints and private inputs.
Never accept multiple project identities in one handler merely to simplify a
host migration.

The checked-in defaults use production Fóir (`rpc.foir.io`, `api.foir.dev`,
`app.foir.io`, `cdn.foir.dev`). A Development project there is separate from a
live project. Fóir's own dev environment (the `-dev` hosts) is an explicit
opt-in; whichever you choose, keep every RPC/API/CDN/login edge consistent.
Use current served CLI documentation rather than substituting identifiers from
another environment.

Keep your own `.env`, native xcconfig, signing material, routes and provider
configuration private. Do not copy Development users, photos, subscription grants
or test purchases into production. For a fresh production app, apply reviewed
schema/configuration and deliberately selected CMS content only.

Each environment follows the README bootstrap/manifest/full-root sequence and
generates clients from its own served scopes. Review changes without force or
pruning unrelated definitions. Preserve existing CMS edits and translations.
Native quota/callback settings need review after installation updates; see
[operation credentials](operation-credentials.md) and [known gaps](known-gaps.md).

For promotion, hostname changes and rollback, use [go-live](go-live.md). Keep an
old endpoint until all native clients, auth returns, manifests, webhooks and
operations have moved. Host attachment alone does not promote an app project.
