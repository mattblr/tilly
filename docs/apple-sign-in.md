# Apple identity across native and web

Native Apple sign-in and hosted browser sign-in use the same Fóir project and
user pool. Never join accounts by email or create a separate marketing pool.
The template keeps native Apple enabled and hides Apple on the hosted web client.
Use hosted email-code sign-in unless your grouped web identity flow is configured.

Apple web sign-in requires a Services ID grouped with the primary native App ID,
registered website/login domains and the exact HTTPS provider callback. For
Fóir's first-party login domain the callback is
`https://YOUR_LOGIN_HOST/oauth/provider-callback`, distinct from `/feed` after
login. Preserve the native audience when adding web credentials. A web
client-secret JWT names the web Services ID; private signing material belongs
in account configuration, never source or browser code.

Follow [Apple's web configuration](https://developer.apple.com/help/account/capabilities/configure-sign-in-with-apple-for-the-web)
and the selected Fóir environment's hosted-login instructions. Validate DNS
ownership and HTTPS. The login edge is `login-edge.foir.dev` (or
`login-edge-dev.foir.dev` if you opted into Fóir's dev environment); see [known gaps](known-gaps.md) for the
CLI instruction limitation.

Before exposing the web button, verify authorization, callback/code exchange,
returning sign-in, Hide My Email and one stable Fóir identity across both clients.
A registered Services ID or a manually corrected authorization URL does not
establish that contract. Keep the native provider intact and use the supported
hosted integration rather than an authentication proxy.
