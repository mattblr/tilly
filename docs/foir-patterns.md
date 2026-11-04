# Fóir patterns

Fóir is the hosted managed backend: authentication, identity, access decisions,
data, files, native limits, notifications and operation execution belong to the
platform. Tilly supplies app-specific business logic through signed operations.
Read the maintained [known gaps](known-gaps.md) for verified platform limitations;
customers consume that inventory rather than maintaining it during setup.

## Adapting the example

Preserve the template's iOS app, web app/website, subscriptions and Fóir-embedded
admin console, together with their shared identity, billing/entitlements, CMS,
SDK, operation, upload and execution integrations. Refactor the application
built on that foundation. A different app idea is not permission to remove
clients, subscription support or framework setup.

Change Tilly's domain models, screens, recognition/social/challenge/artwork rules,
commercial offer and branding to fit the new product. The [domain references](tilly/)
explain these example decisions; shared integration docs describe the foundation
to retain. Discover the product first, map its changes into tracked work second,
and build the tickets third. A free-launch decision can leave billing inactive
without discarding its integration.

## App logic and managed infrastructure

Clients read directly with a scoped publishable key and the current session.
The one web build hosts product screens, console and operation endpoints. Each
operation verifies dispatch against its project/tenant, derives identity from
ingress and creates the data client from `ingress.dispatch`.

Never build app-owned infrastructure, including inside operations or Fóir
records: no custom metering, financial ledgers, reservation service, queue,
identity system or access-control engine. Putting a service's state in Fóir
records does not make it platform-native. Use supported managed capabilities;
keep dependent features unpromised when the required semantics remain unproved.
Do not widen credentials, publish private state or add a proxy to pass a check.

Product records such as a capture, its cat tags or an artwork's provenance
represent the application. A replacement quota/accounting/queue service remains
infrastructure regardless of its model names. Existing payment adapters map
verified provider state to app entitlements.

## Credentials and console

Provider keys remain in Fóir under the credential owner bound to verified
dispatch. The current installed-app path and config-owned read limitation are
recorded in [known gaps](known-gaps.md) and [credential details](operation-credentials.md).
There is no Worker environment-key fallback or installation created solely to
bypass a refused read. Sharing the general OpenAI field for artwork and authorized
challenge analysis is an app choice, not a platform restriction.

An installed console placement obtains the console's scoped session and
appearance handshake. Downloading its public HTML grants no record access.
Words uses the native field editor; current embedded editing limits belong in
the inventory rather than a broader translation proxy.

## Public and private media

Use `uploadFile`, PUT the bytes, then invoke the landing operation. Record
visibility and file visibility are distinct. A readable record does not make
its image public; catch photos/art follow the selected audience and avatars
follow profile sharing. Narrowing must withdraw old grants and byte access.
Verify warmed ordinary reads and unsigned URLs independently.

App publication checks bind approvals to the same immutable file, normalized
text and model. Re-read metadata and holds; an older approval cannot approve
changed content. Bounded native continuations coordinate product work, but are
not a claim of atomic record/file publication. See
[publication coordination](publication-continuations.md) and the inventory's
cache-revocation observation.

## Who sees a user's content

Decide who can read a user's records with one record per user, not a grant on
every record. Tilly gives each user an `audience` record: public for a public
profile, or private and shared with each accepted follower. Content models
point at it through an `association_read` field (`viewers`), so whoever can read
the audience reads the content. Switching privacy changes one record, and taking
content out of view disconnects its `viewers`, leaving only the owner. File
bytes are separate: walk the files when their visibility must change.

A user-owned record can only be changed or shared by its owner, so a
relationship between two users is two records, one owned by each. In Tilly, a
follow is the asker's request plus the followed user's approval. See
[publication](publication-continuations.md#profiles-and-follows) and the
[known gaps](known-gaps.md) for what this costs today and how it will simplify.

## Execution and allowances

[Fóir owns execution and continuations](operations.md). Await bounded work and
its callback in the current dispatch; return the native continuation for further
slices. Do not add another queue, scheduler, delivery ledger or unobserved promise.
A provider result already stored for a product action should be recovered
without another paid call.

Choose allowances for the new product, then configure and verify supported
native limits and entitlements. Tilly's artwork offer is an example, not a default.
Do not infer completed-success, retry or monetary-budget semantics solely from
an execution count, and do not assert that unverified semantics are unavailable.
See [artwork](tilly/artwork.md) and [known gaps](known-gaps.md).

## Clients, content and installation

Follow every `pageInfo` cursor; a bounded first page is not a complete list.
Use the data SDK for models and typed-document SDK for nested CMS prose,
references and menus. Regenerate clients from actual served scopes rather than
editing generated types or treating default selections as platform limits.

Website content, shared copy and published tokens remain Fóir-editable, with
bundled native offline defaults. Incomplete override wiring is an app omission.
The single root config composes website/app and one user pool. The README's
finite additive bootstrap sequence handles the currently observed manifest
ordering; it does not ask customers to implement missing infrastructure.

Hosted browser sign-in uses the platform session SDK and verified first-party
domain. The pinned SDK owns disposal and late-exchange refusal; the app creates
a fresh client for a new session and binds deletion cleanup to its initiator.
Use the supported hosted identity configuration; see [Apple setup](apple-sign-in.md).
Do not introduce custom passwords or email-based joins.
