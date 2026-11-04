# Multiple cats in one photo

This describes the Tilly example. Read it only when retaining or changing this
feature; it does not define requirements for a different app.

Every catch is a capture: one upload, original post, set of likes/reposts and
artwork. Each cat has its own association, optional upright-image position and
local matching vector; matching on iOS compares against the tags near the user.
Positions use top-left coordinates normalized from zero to one. A photo supports
up to eight cats.

The browser asks the person to choose/name the cats; iOS suggests locally
detected cats for confirmation. This flow makes no extra AI photo request and
does not manufacture native feature vectors in the browser.

`capture-photo` and `capture-cat-tag` are user-owned and private by default.
Signed operations attribute them to verified ingress and show them through the
creator's audience (see [publication](../publication-continuations.md)).
Corrections do not create another upload/post or award another streak/art
allowance. Encounter dates/counts derive from the canonical capture and active
tags, not tag-edit time. At least one cat remains; revision checks refuse stale
edits.

Apply schema and grants through the single root configuration and regenerate
each actual scoped client. Do not hand-edit generated schemas or broaden
credentials for a missing field.

Save/tag edits, audience changes, shared views and deletion must resolve the
same canonical photo. A tag points to a readable ready parent at its active
revision. See [known gaps](../known-gaps.md) for the nested-predicate limitation,
and [publication](../publication-continuations.md) for record/file visibility.
