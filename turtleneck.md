# Delivery profile

This repository is a template for customers building their own app with Fóir.
Keep public documentation focused on installation, adaptation, supported behavior
and confirmed platform limitations. Track work, decisions, defects, verification
evidence and release status in your issue tracker. Configure the tracker and
release environments for your own project; this template grants no deployment,
publication or purchase authorization.

## Repository

The iOS app, website, console and operation handlers share one repository and
one root Fóir configuration. Preserve unrelated working-tree changes. Follow
your project's branch and review policy; never rewrite history or push merely
because you are using this template. Reusable skills have canonical sources in
[mattblr/skills](https://github.com/mattblr/skills).

## Validation

Use the Node and pnpm versions specified in `package.json`. Before submitting
changes, run:

```sh
pnpm test
pnpm build
pnpm check:web
pnpm check:public
pnpm check:ios-pagination
```

For native changes, build and exercise the affected flows using the available
Apple build tools. Record the device or simulator and distinguish local checks
from physical hardware, deployed services and real provider checks. Include
refusal, retry and account-change paths for authentication, uploads and payments.
Use isolated fixtures; never mutate another person's content to prove a test.

## Release completeness

Complete and verify every advertised template feature before public release.
Disabled switches, prepared code, local doubles and open tracker entries do not
satisfy acceptance. Premium requires working native/web purchases and restores
with verified server entitlements and the supported lifecycle. Use the actual
candidate and relevant provider/device evidence, not an unpaid diagnostic build.

Report any genuine blocker precisely, with evidence and affected acceptance.
App/configuration defects remain implementation work; do not label them platform
failures. A known-gap entry is not a release waiver. Keep release stopped until
acceptance is complete or the owner explicitly decides the blocker's disposition.

## Environments and release

Explicitly select the Fóir workspace, project and organization before writes.
Keep deployment identifiers, credentials and account-specific configuration in
private inputs. Regenerate clients from their actual served scopes; do not widen
credentials to pass a test.

Use separate development and production environments. A fresh production setup
receives reviewed configuration and sample CMS content, not development users
or private media. Confirm the production data, sign-in, file visibility, operation
endpoints and provider configuration before cutover. Keep rollback available
until the replacement is verified. Deployment, store submission, live payments
and paid provider calls require authorization for the relevant environment.

Use the bundled billing, go-live, mobile verification and App Store release
skills when performing those tasks. Keep completed checks and remaining actions
in the tracker rather than adding release journals to customer documentation.
