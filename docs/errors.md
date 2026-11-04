# Recoverable errors

Web route loaders and React rendering use a shared recovery boundary. It offers
an explicit retry and a separate reload with an unsaved-changes warning. It does
not automatically reload when a JavaScript chunk is unavailable. This boundary
needs the application shell to have loaded; it cannot recover a browser crash or
an initial document that never arrives.

Async actions and paginated lists handle failures inline, next to their existing
controls. They retain form input, uploaded file references, attempt keys and
previous pages for retry. Existing session and request-generation checks still
prevent an obsolete result from replacing a new account or list source.

`web/src/lib/failures.ts` maps supported machine codes to a closed set of shared
`errors` copy keys. Unknown provider, GraphQL, HTTP-body and HTML messages are
never displayed. Known authentication, validation, permission and rate-limit
failures retain actionable guidance. Local operations may use `ActionFailure`
for a known condition such as pending completion or unavailable location. Do not
make arbitrary provider text safe by stripping a prefix or HTML tags.

Native async failures use `UserFailure` and resolve the resulting copy keys through
`AppConfig`. These messages also follow locale changes. Camera failures have a
specific permission/recovery message. This handles recoverable action failures;
it does not claim to catch native fatal crashes. Successful deletion
reauthentication clears the previous failed-attempt warning and requires fresh
confirmation before another attempt.

Copy lives in Fóir's `ui-copy` namespace `errors`, with matching bundled defaults
in `ios/Tilly/Resources/Copy.json` and the example seed. The console reads copy
through its placement session. The root recovery screen uses bundled defaults
when its content provider is unavailable. No additional credential, frontend
proxy, telemetry provider or permission is needed. Existing verified-operation
logs retain their redacted technical diagnostics; do not add raw error objects,
user content, tokens or photo bytes to a browser logger.

Run `pnpm test` for web error-policy controls and `pnpm check:ios-errors` on macOS
for native controls. Build/run and visual checks remain separate from these host
checks. Release verification must also exercise real service refusal, offline,
retry and account-switch paths on the candidate being submitted.
