# Editor-only CMS preview

The preview deployment uses a separate **server-only** CMS drafts key.
Production's website key cannot read drafts. No Cloudflare Access is used.

`TILLY_PREVIEW_ORIGIN` declares the preview auth client in the single root
config. The `preview-editor` role is never default: assign it only to approved
editors. The preview server exchanges the first-party hosted-session cookie,
asks Fóir for the visitor's current access, and requires `drafts:read` plus either the explicitly assigned role or membership
in the owner-controlled `TILLY_PREVIEW_EDITOR_IDS` list. Listed IDs are checked
against the verified session and API identity; email and caller headers never
qualify. The list is empty by default. The key alone is never evidence that a visitor is an editor.
Signed-out requests redirect to hosted sign-in; non-editors receive 403, and
verification outages receive retryable 503 rather than access or a logout loop.
Remove a listed editor from the private deployment configuration to revoke that
path; removing a platform role does not remove a separate explicit listing.
Changes take effect on the next request after deployment. Already viewed content
cannot be recalled from a browser.

Configure private Worker inputs:

- `FOIR_PREVIEW=true` and a build with `VITE_FOIR_PREVIEW=true`.
- `TILLY_PREVIEW_HOST`, the exact HTTPS preview hostname.
- `TILLY_PREVIEW_EDITOR_IDS`, optional comma-separated approved project-user subjects.
  Read them from the selected project's verified user roster; a console account
  ID is not necessarily the hosted project's user ID.
  Keep account-specific values private. Fóir forbids self-role assignment; the
  owner may choose this explicit application list without creating a Fóir role
  grant. Another authorized manager can assign the platform role instead.
- `TILLY_PREVIEW_LOGIN_ORIGIN`, the verified sibling hosted-login origin.
- `TILLY_PREVIEW_AUTH_CLIENT_ID=tilly-preview`.
- `FOIR_PREVIEW_API_KEY`, a Worker secret, never a `VITE_` variable.
- The production project's `FOIR_API_ORIGIN` and `FOIR_FILES_ORIGIN`.

Also set `TILLY_PREVIEW_HOST` on the published Worker. Its hosted post-login
route forwards `returnTo` only to that exact HTTPS sibling, without creating an
open redirect. Keep `FOIR_PREVIEW=false` and omit the drafts key there.

The drafts key holds only `records:read`, `files:read`, `designtokens:read` and
`drafts:read`, restricted to CMS models and `ui-copy`. It has no user models,
uploads, billing, operation execution or writes. Generated clients still come
from served schemas; do not hand-edit them to invent preview fields.

All preview paths, including assets, pass the gate and use private/no-store,
noindex/noarchive and no-referrer headers. Authenticated HTML may contain draft
content, as intended; it must not contain the key or bearer. SDK reads happen
inside the verified SSR request. The browser's client retains only the ordinary
published credential. Preview links use full document navigation so each page
returns through the gate and server-side CMS reads. Live app activity and
operation/account/console routes are excluded.

Before activation, prove: signed-out redirect; signed-in non-editor refusal;
approved editor success; role revocation; session-service outage refusal;
unpublished and nested draft visibility in preview only; no key/bearer in HTML,
client assets or source maps; production ignores draft requests; no app/private
models through the drafts key; no preview uploads or operation endpoints.
Unit fixtures are preparation, not proof of hosted auth or production grants.
