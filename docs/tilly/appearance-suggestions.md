# Cat appearance suggestions

This describes the Tilly example. Read it only when retaining or changing this
feature; it does not define requirements for a different app.

This optional feature analyses a finalized, saved capture, covering up to eight
current cat tags in one request. Shutter, upload alone, cancelled capture and
unrelated edits do not trigger analysis. Finalization creates an owned request
only when consent and eligibility allow it; a native lifecycle hook invokes the
signed operation. The consumer validates its private finalization receipt.

## Consent and data

Explain that OpenAI receives a small metadata-stripped JPEG and anonymous tag
indices/bounds. Obtain versioned consent and offer opt-out; camera permission
is separate. Do not send names, account/cat identifiers, notes, location,
original files or private CDN URLs. Missing consent, disabled settings,
unreadable media or holds prevent transmission.

The provider returns structured visual suggestions, including mixed, unknown
and no clear cat. They are not pedigree, identity or health determinations.
Render text plainly and do not rename the shared cat automatically. Raw results
stay private. Anonymous breed/pattern contribution requires the described consent
even if its source photo remains private; it reveals no account or source URL.

## Configuration and recovery

Eligibility is Fóir-editable: `regular` includes signed-in free and Premium users;
`premium` requires an active owned Premium grant. Invalid settings fail closed.
Existing private answers remain readable after eligibility changes. Shared copy
uses the `appearance` namespace and bundled defaults.

The operation reads `appearanceOpenAI` from its dispatch-bound installation.
Configure its native quota with `pnpm configure:operations`, then review/release
that configuration before enabling the feature. Native execution-rate and
failure semantics are described in [known gaps](../known-gaps.md). Paid execution
is disabled by default; do not expose an enabled control without configuration.

A conditional claim binds owner, immutable source, current tag/crop identity,
model, instruction and consent versions. Replays reuse existing results;
ambiguous paid outcomes stop for recovery. Recheck source/revision, consent,
eligibility and holds before transmission and attachment.

## Public cat evidence

Validated results contribute once per file/cat pair through idempotent vote
records. Clients use Fóir's native grouped aggregation, with breed and coat
pattern dimensions separate. Unknown/no-cat results add no votes. Truncated or
malformed aggregates show no partial percentages. No source photo or private
answer is exposed, no shared materialized counter is maintained, and previous
suggestions are not fed back to the provider.

## Observation ownership and deduplication

The appearance operation alone also reads the private project-owned observation
evidence record with `records:read.all:appearance-observation`, for deduplication across
contributors. Existing observations must be readable to this operation;
an unreadable entry is never permission to overwrite it or loosen its access.
Lookup is bound to the verified immutable file/cat digest and rejects an evidence record
row with a mismatched identity. Clients have no evidence record model/read scope; only
cat/dimension vote records are public. Reprocessing the same file/cat retains
its first observation rather than adding another vote.
