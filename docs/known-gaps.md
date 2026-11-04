# Known platform limitations

These are verified limitations affecting this template. This inventory is
maintained during development of Tilly itself; customers consume it rather than
maintaining a platform backlog while building their own apps. Fóir remains the
managed backend. Use its [no-backend](https://docs.foir.dev/no-backend) and
[app architecture](https://docs.foir.dev/guides/app-architecture) guidance;
limitations do not authorize substitute infrastructure or broader credentials.

| Area | Verified limitation and effect on the template |
| --- | --- |
| Config-owned credentials | A root-config operation's credential read was treated as an absent installation. Installed-app dispatch reads work. Provider-dependent operations use the existing installation; no environment-key fallback. [Setup](operation-credentials.md). |
| Reciprocal blocks | A signed operation with model-specific read-all authority could read its own private block but not a counterpart-owned block; a reverse follow remained possible. Complete reciprocal enforcement must not be assumed. Block records remain private. |
| Other users' rows in an operation | An operation started by a signed-in user reads and counts only the rows that user may read, even when it declares `records:read.all` (lists, `totalCount` and aggregate queries alike). It can't update another user's record either, even with `records:write.all`. So it can neither count nor keep counters for someone else, and the served docs describe no field Fóir keeps as a count. Profile counts are meant to be public; until this changes, `profile_counts` answers only the user and, on a private profile, their accepted followers. Anyone else is refused and the apps hide the counts. A follower's view of a private user's "following" count leaves out follows of other private users they don't follow. [Publication](publication-continuations.md#profiles-and-follows). |
| Multi-record writes | An operation has no atomic way to change several records together. `batchRecordOperations` continues after a failed item, has no SDK equivalent, and needs a model-unscoped `records` grant that operations can't declare. Make each write repeatable with an `idempotencyKey` or a conditional `where`, and let the run be retried to completion; a run that fails for good can leave related records out of step. |
| Removing a field that holds data | When a push holds back a field removal, the decision file it writes (`migrations/<timestamp>-<model>.foir.ts`) leaves a hyphenated model key unquoted (`capture-photo: {`), so the file doesn't parse. Quote the key (`'capture-photo': {`), answer each field, and push again; the release that carries the model runs the migration. |
| Access-cache revocation | A warmed anonymous record query returned prior public content after narrowing, separately from refused media bytes. The root uses native `NO_CACHE` on revocable models. [Publication](publication-continuations.md). |
| Public capture subscriptions | Anonymous subscriptions to the user-owned capture-post stream were refused. The public activity view re-reads accessible records after project-owned change invalidations and on reconnect/interval. |
| Bootstrap ordering | Config preview accepted references to not-yet-installed app operations; apply refused the dependency. Follow the README's single-root bootstrap, manifest installation and full-root sequence. |
| Installation policies | The served manifest rejects quota fields/preconditions, and an app update resets native quota/callback settings. Review and reapply native policies with `pnpm configure:operations` after updating the install, before enabling callers. |
| Installed operation delegation | Installation review rejects an operation's exact `operations:execute:<operation-key>` grant. Keep reconciliation in one installation-only writer operation, started directly by the verified inbound gateway under a native concurrency key. Client purchase/restore checks only read provider/grant status; neither operation calls the other. Delayed activation stays pending, with native run recovery or provider webhook replay. [Pattern and recovery](operations.md#subscription-reconciliation). |
| Named-project manifest source | CLI named-project configuration rejected environment-specific `apps.*.source`. Environment inputs retain explicit project-specific hosts and pins. [Environments](environments.md). |
| Nested capture predicate | A nested ready-state filter omitted a tag whose directly read parent was ready. Clients validate readable parent state/revision/owner while paging tags. The query discrepancy's internal cause is unassigned. |
| Embedded locale writes | The control-plane field-write path refused the placement origin, while translated reads worked. Words opens Fóir's native field editor. |
| Exact-version publication | The scoped challenge placement schema has publication but omits the version-history lookup required for exact-version review. Challenge drafts use Fóir's native editor for publication. |
| CLI symbolic enums | Some generated email/file commands refused symbolic enum values advertised in help during serialization. Prefer the native console or values verified against the served contract. |
| MCP partial updates | A synthetic unversioned partial update replaced unnamed fields. Typed GraphQL scalar/reference operators preserved them. App edits use typed operators; do not add blind concurrent read/modify/write replacements. |
| Email preview | Native sample HTML clipped at phone width; preview Reply-To differed from the configured support address. This concerns preview output, not a claim about delivered mail-client/header behavior. [Email](email.md). |
| Hosted Apple request | The hosted authorization request omitted Apple's required form-post mode for email scope and used native identity with a web callback. Hosted Apple is hidden; native Apple and hosted email codes remain separate paths. [Apple setup](apple-sign-in.md). |
| Login-edge instructions | CLI custom-domain instructions printed the production CNAME target against platform dev. Use the edge matching the selected environment. [Apple/hosted setup](apple-sign-in.md). |
| Operation-terminal subject | Ordinary-user operation-completed hooks arrived without the initiating signed user. Appearance admission uses an owned finalized-request record and validates its receipt instead of deriving identity from event input. |
| Sharing another user's record | Only a user-owned record's owner can change it or who it is shared with. An operation acting for another user was refused writes (`record not found`) even with a per-record write or delete grant, and refused revoking (`no permission to manage access`); a grantee cannot give up its own read grant. Project-owned models expose no per-record grants. Following is two owner-held halves: the asker's request and the followed user's approval. Unfollowing a private user ends the follow at once; that user's app takes back the leftover read grant when it next tidies (`tidy_followers`). [Publication](publication-continuations.md#profiles-and-follows). |
| Named-recipient notification | A native follow hook's send remained restricted to its firing actor despite the declared named-recipient grant. Social/challenge delivery switches remain off. Notification deletion is also unavailable in that served integration. [Notifications](notifications.md). |
| Native quota failure behavior | Served quotas count executions with user/actor/tenant scopes. `failClosed` covers meter-read failures, while rule-loading failure permits execution. This is not a universal fail-closed financial ceiling. [Quota contract](https://docs.foir.dev/config/operations#when-the-meter-cannot-be-read). |

Only reproduced platform limitations belong in this inventory. It does not
waive feature completion or permit publication of an incomplete template. Every
shipped feature requires completed acceptance; a genuine blocker must be reported
with evidence and impact for the owner's explicit release/scope decision.
Proposals and app/configuration defects belong in the tracker. No delivery date
is promised.
