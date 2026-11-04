# Editor-only CMS preview

The preview deployment shows the website's drafts to signed-in editors. It
reads them as the editor, so Fóir decides who sees drafts. There is one website
key, no separate drafts key, and no list of editors in the code or the Worker.
No Cloudflare Access is used.

## How access works

Setting `TILLY_PREVIEW_ORIGIN` declares the preview auth client in the single
root config, and lets the website key hold `drafts:read`. The key holds it but
gives it to nobody who isn't signed in: its baseline grants have no drafts, so
the published site and anyone using the key alone read published content only.
A signed-in person's token adds what their role grants. The `preview-editor`
role is the only one that grants `drafts:read`, and it is never a default role.

Each preview request trades Fóir's first-party session cookie for a
short-lived token and asks Fóir for that person's access. Signed-out visitors
are sent to hosted sign-in and come back to the page they asked for. A person
whose access lacks `drafts:read` gets a 403 that says so. A sign-in or access
outage returns a retryable 503, never access or a sign-out loop. SSR draft
reads carry the same person's token; without it they fail.

To give someone the preview, assign them the Preview editor role in Fóir. To
take it away, remove the role. It takes effect on their next request. Content
already viewed can't be recalled from a browser.

## Worker settings

- `FOIR_PREVIEW=true`, and a build with `VITE_FOIR_PREVIEW=true`.
- `VITE_PLATFORM_API_KEY`, the same website key the published site uses.
- `TILLY_PREVIEW_HOST`, the exact HTTPS preview hostname.
- `TILLY_PREVIEW_LOGIN_ORIGIN`, the verified hosted-login origin.
- `TILLY_PREVIEW_AUTH_CLIENT_ID=tilly-preview`.
- The project's `FOIR_API_ORIGIN` and `FOIR_FILES_ORIGIN`.

Also set `TILLY_PREVIEW_HOST` on the published Worker. Its hosted post-login
route forwards `returnTo` only to that exact HTTPS sibling, without creating an
open redirect. Keep `FOIR_PREVIEW=false` there.

## What the preview serves

All preview paths, including assets, pass the gate and use private/no-store,
noindex/noarchive and no-referrer headers. Authenticated HTML may contain draft
content, as intended; it must not contain a bearer. The browser's client has
only the ordinary website key and reads published content. Preview links use
full document navigation, so each page returns through the gate and
server-side CMS reads. Live app activity and operation, account and console
routes are excluded. Generated clients still come from served schemas; don't
hand-edit them to invent preview fields.

## Before you turn it on

Prove:

- a signed-out visitor is sent to sign in and returns to the page;
- a signed-in person without the role is refused;
- an editor with the role sees drafts, and removing the role refuses them;
- the website key alone, without a person's token, is refused drafts;
- an outage of the session service is refused, not let through;
- unpublished and nested drafts appear in the preview only;
- no bearer appears in HTML, client assets or source maps;
- the published site ignores draft requests;
- no preview uploads or operation endpoints answer.

Unit fixtures are preparation, not proof of hosted auth or production grants.
