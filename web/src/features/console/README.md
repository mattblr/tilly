# Tilly’s console placement

This is handwritten React source in the TanStack Start web project. The route
`src/routes/[_]foir.apps.tilly.admin.tsx` renders it at `/_foir/apps/tilly/admin`.
It shares the website’s Vite build and Worker deployment. There is no standalone
HTML entry, console build, copied JavaScript bundle or second deployment.

Fóir supplies the scoped placement session. `ConsolePlacement.tsx` establishes
that session in the browser, responds to appearance/sign-out changes and closes
it when the route unmounts. The browser calls Fóir directly through that session;
console data access uses that session, without a server credential or separate
login. The website’s publishable key grants no console authority.

The route has its own CSS and sits outside the public `_site` layout, so opening
it does not load the public CMS or marketing navigation. The Worker applies its
frame policy and a fresh CSP nonce for TanStack hydration. Open it through the
project’s Apps → Tilly entry; a direct visit has no authenticated session.

`styles.tsx` contains the art/trial editor; `settings.tsx` contains Words,
settings, tags and Premium editors. `components/ui` contains the shadcn/Radix
primitives with their MIT notice. Those primitives are library source; the
feature logic and Fóir interactions are editable application code.

From the repository root, run `pnpm build`, `pnpm test` and `pnpm check:web`.
When changing the UI, check keyboard navigation, focus/escape behaviour, labels,
error/retry states, narrow layouts and the console’s light/dark appearance.
Hidden tabs stay mounted after their first visit to preserve edits; trial polling
pauses when its tab is hidden.

Words previews Fóir’s native field translations by locale. “Edit words in Fóir”
opens the built-in record editor; choose its locale there. Configure
`VITE_FOIR_CONSOLE_URL` for the same project. No translation provider or proxy is
involved.
