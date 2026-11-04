# Operation credential ownership

Provider credentials stay in Fóir. The phone and browser hold a publishable key
and their own session; the web deployment has no persistent provider key.
Handlers read credentials with `createAppClient({dispatch}).install.credentials()`
after verifying Fóir dispatch for the expected project and tenant.

## Credential selection

The config-owned credential reader treats a root-config
operation as an absent app installation. Saving a credential and granting
`appsecrets:read` succeeds, but reading it from that dispatch fails. This is a
verified boundary limitation, not a missing environment variable.

The existing Tilly installation already has a working scoped credential read
for artwork and subscription verification. Until the config-owned reader works,
it also owns the six publishing operations that require moderation and the
native appearance operation. Their operation keys are `tilly.save-catch`,
`tilly.update-capture-tags`, `tilly.save-profile`, `tilly.add-field-note`,
`tilly.share-capture`, `tilly.post-my-catches` and
`tilly.suggest-cat-appearance`. They use the same handwritten handlers inside
the single TanStack Start build. No additional installation, Worker, queue,
proxy credential or user pool is needed.

`installed-operations.ts` shares the operation contracts, grants and native
quota policies with the root config. Only the installed operations can enter
their handler routes. Credentials have dedicated `moderationOpenAI` and
`appearanceOpenAI` fields, plus a general `openai` field for artwork and
explicitly authorized challenge analysis. Each operation reads its selected
field directly from the verified installation owner. Missing fields and refused
reads fail closed; there is no environment fallback or alternate-field retry.

## Configure an installation

1. Apply the additive model bootstrap through the root `foir.config.ts`, then
   serve and review the Tilly manifest from the single web deployment.
2. Update the existing installation, preserving its credentials/settings. For a
   fresh project install it once. Review its exact permission gains.
3. Store provider fields in that installation's Fóir credentials. Never put
   their plaintext into public source, command arguments or deployment bindings.
4. Run `pnpm configure:operations` to preview the existing operations' policies,
   then `pnpm configure:operations --apply` against the explicitly selected
   OAuth project to apply and read them back. Configure the native quota policies before
   allowing client execution or enabling the appearance hook. The served app
   manifest does not accept quotas; updating the install alone is insufficient.
   Preserve the asynchronous modes and set paid-operation retries to zero.
   An installation update currently resets these operations' quota/callback
   settings. Reapply/read them back after **every** app update.
   The helper also applies artwork's Premium allowance (one per user in any 24
   hours) and Checkout's one-per-user/minute policy; these reset in the same
   app update.
5. Apply the full root configuration without pruning unrelated definitions,
   selectively release the client/role/hook changes, and regenerate operation,
   web and Swift types from their actual served credentials. The root remains
   the only configuration push entry point.
6. Check positive publishing and negative credential/identity paths, native
   request ownership, quotas and warmed record/file audience narrowing. Migrate
   every client and hook before deactivating legacy root operation keys.

For native regeneration, export the actual native key's schema, prepare it with
`node scripts/prepare-native-schema.mjs <export>` and run the Apollo generators.
Validate the active documents against the same export with
`pnpm check:ios-contract <export>`.

See [known gaps](known-gaps.md) for credential-owner and installation-policy
limitations. Keep operations bound to the selected credential owner; do not add
an environment fallback, broad proxy or a second installation to evade a read.
