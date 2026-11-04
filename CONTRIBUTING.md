# Contributing to Tilly

Read [AGENTS.md](AGENTS.md), [README.md](README.md) and the
[Fóir patterns](docs/foir-patterns.md) before changing the app. Use your own
Development project and disposable accounts; never attach a contribution to
another person's production data.

Install Node 22.18 or newer and the pinned pnpm version, then run
`pnpm install --frozen-lockfile`. Follow the README's staged bootstrap before
testing against Fóir. Local tests and builds do not require paid provider calls.
Provider activation, schema publication and deployments are separate actions.

Keep app and website schema in the single root config. Regenerate clients from
the actual credential scope after schema or grant changes. Do not edit generated
types, add a general backend key or move session tokens into browser storage.
Shared labels belong in the existing copy namespaces and bundled defaults.

Before opening a pull request, run:

```sh
pnpm test
pnpm build
pnpm check:web
pnpm check:ios-pagination
pnpm check:public
```

For native changes, build and exercise the affected flows with Xcode and record
the device or simulator used. Include refusal, retry and account-change paths
when changing authentication, uploads, sharing or payments. Mark hardware,
provider and deployed checks that remain unperformed. A screenshot is evidence
of the displayed state, not of purchase settlement or private-media access.

Describe the concrete behavior changed, why it is needed and how you checked it.
Include screenshots for visible changes using licensed sample content. Keep
credentials, account identifiers, personal photos and private execution receipts
out of issues, patches and screenshots. Preserve asset licenses and notices.

See [SECURITY.md](SECURITY.md) for reporting security vulnerabilities privately.
