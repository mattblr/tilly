# Still artwork

This describes the Tilly example. Read it only when retaining or changing this
feature; it does not define requirements for a different app.

Artwork is a Premium feature. Streak tiers (console: Art & styles) set the
day count, the art style prompt and a badge picture uploaded in the console. The signed operation checks the ready
owned capture, active provider-neutral Premium and current source/output holds.
The app prepares a style from the encounter
and streak tiers, calls the authorized image provider and binds its result to
the capture. Provider credentials stay in Fóir.

The image-edit adapter requests one PNG with `moderation: auto` and refuses
redirects. Upload moderation, the provider's standard generation safeguards,
reporting and operator review are separate boundaries. A client cannot weaken
filtering or supply a file as trusted generated output. See the
[OpenAI image guide](https://developers.openai.com/api/docs/guides/image-generation).

Only the conditional product-attempt claim winner may generate. Upload and land
the output privately before publication. The saved provenance binds the actor,
source file and generated output. Audience changes and holds are re-read around
publication; a public source does not override a hold. Record and byte visibility
are independent. Bounded Fóir continuations handle publication and compensation.

Ambiguous provider/upload failures stop for recovery rather than automatically
buying another image. A persisted output is reused after an interrupted save
or publication. Uncertain publication narrows access. Admin style trials remain
private and separate from user artwork.

Configure the model, quality and provider credential deliberately. The Premium
allowance is the artwork operation's Fóir quota: one run per user in any 24
hours, with no rollover (`artwork-policy.ts`, applied by
`pnpm configure:operations --apply`). Continuation slices of one run don't use
more allowance, but a run that fails still counts, because the quota counts
runs rather than finished artwork. When the allowance is used, Fóir refuses the
run and the catch keeps its photo. Set plans, paid benefits and allowances for a
new product through the shared [subscription integration](../web-billing.md)
and the operation's quota. See [known platform limitations](../known-gaps.md).

Fóir owns metering, identity, access and execution. Do not add a custom meter,
financial ledger, reservation service or queue inside operations or records.
