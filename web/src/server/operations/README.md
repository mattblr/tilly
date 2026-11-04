# Fóir operation handlers

These handwritten handlers are part of the TanStack Start web project and its
single Worker deployment. The Worker entry `src/server.ts` routes `/operations/*`
to `dispatch.ts`. Fóir owns queued execution and continuation delivery; there
is no separate application queue or persisted dispatch token. Each operation verifies
Fóir’s signed ingress and builds its data client from `ingress.dispatch`.

- `save-catch.ts`: matching and recording a catch.
- `social.ts`: profiles, follows, likes, field notes and catch audiences.
- `art.ts`: Premium artwork and private model trials.
- `premium.ts`: verified subscription grants.
- `manifest.ts`: the public app manifest, served at `/_foir/apps/tilly.json`.

`generated/` contains SDK data types generated from each operation’s exact
served grants/schema. They are not the operation implementations. Regenerate
with Fóir CLI after schema/grant changes; never hand-edit or swap one operation’s
module into another handler. See the root README for the command and
`docs/foir-patterns.md` for the current platform bridges.

Client requests still invoke operations through Fóir. Hosting the handlers inside
Start does not let a user call them with a normal session bearer or move app
rules into an unverified server function. Provider credentials stay inside
operations under their declared install grants.


`async.ts` awaits one slice and its callback inside the request. Art has a
reviewed five-minute operation timeout and no automatic paid retry. Billing
reconciliation returns `continueRun` after each subscription; Fóir schedules the
next slice with fresh authority. A failed slice remains visible to platform
retry/dead-letter handling. Never return 202 and leave an unobserved promise.
