# Documentation

This template demonstrates an iOS app, web app/website, subscriptions and an admin
console embedded in Fóir. The refactor changes the application-specific domain
and product rules while preserving that integrated foundation.

Start with [setup](../README.md), [Fóir patterns](foir-patterns.md) and
[confirmed platform limitations](known-gaps.md). The skills guide the workflow:
[discover the product](../.agents/skills/adapt-tilly/SKILL.md),
[plan the refactor and tickets](../.agents/skills/plan-foir-app/SKILL.md), then
[build the plan](../.agents/skills/build-foir-app/SKILL.md).

Shared implementation guides cover [website/CMS](website-and-payments.md),
[web subscriptions](web-billing.md), [identity](apple-sign-in.md),
[account deletion](account-deletion.md), [notifications](notifications.md),
[content safety](content-safety.md), [publication](publication-continuations.md),
[credentials](operation-credentials.md), [operations](operations.md),
[pagination](pagination.md), [design tokens](design-tokens.md),
[errors](errors.md), [email](email.md), [preview](web-preview.md),
[environments](environments.md) and [deployment](go-live.md). Preserve these
integrations and adapt their product configuration and user-facing behavior.

The [Tilly domain references](tilly/) explain cats, photo tagging, challenges,
[privacy and follows](tilly/privacy-and-follows.md), artwork and sample assets. Use them when mapping
those concepts to the new app; they do not require cat-specific features or
business rules. Do not discard a shared integration just because its example
uses a cat. A free launch preserves subscription support without activating it.

Development plans, unresolved questions and verification/release evidence belong
in the issue tracker, outside customer documentation.
