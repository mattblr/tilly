---
name: adapt-tilly
description: Start adapting this Fóir iOS/web subscription app by interviewing the user about their product and producing a brief for plan-foir-app. Discovery only; do not refactor the implementation yet.
---

# Discover the app

This is the first of three skills: discover the product here, use plan-foir-app
to map it to the implementation and tickets, then build-foir-app to deliver.
The template's foundation is an iOS app, web app/website, subscriptions and an
admin console embedded in Fóir. Preserve that framework and its Fóir integrations.
Adapt the application-specific domain and behavior; do not turn the template into
an empty starter or ask the user to reselect the supplied framework.

## Interview

Start a conversation, not a code edit or global rename. Read existing answers
and ask only what is still missing. Use plain questions in short rounds, usually
one to three at a time. Wait for answers and follow up where the product is
unclear; do not invent answers or silently choose a paid model.

When not already answered, start with “What is your app idea?” and “Who are
your users?” Then establish:

- What problem does it solve, and what should someone accomplish on their first
  visit? What action brings them back? Ask for a concrete example journey.
- What objects, content and relationships does the app manage? Who creates,
  owns, sees, shares or changes them? Are there distinct user/admin roles?
- “Do you want to charge for this?” If yes, what is free, what do subscribers
  receive, and are prices, intervals or allowances already decided? Distinguish
  an idea from a settled offer. If no, preserve subscription support with the
  commercial experience inactive; do not delete billing SDKs or entitlements.
- What should users do on iOS and web? What should staff manage in the embedded
  console? Define cross-client behavior without proposing to strip a client.
- Which uploads, camera/location, search, notifications, AI or other workflows
  does the product need? Existing feature demonstrations are starting points;
  ask how they translate to this domain rather than copying cat-specific rules.
- What branding, tone, languages, accessibility and content are needed? Ask
  about privacy, sensitive data, safety/moderation and deletion where relevant.
- What is essential for the first release, what is later, and what constraints
  or success criteria determine whether the app works for its users?

Do not require business/legal/provider details the user has deferred before
useful product discovery can continue. Record open decisions and their impact.
Do not promise platform behavior or ask the customer to design infrastructure.
Fóir is the managed backend; app operations contain only product business logic.

## Product brief and handoff

Reflect the answers back as a coherent brief: purpose/users; concrete journeys;
objects/ownership/privacy; iOS/web/admin experiences; free/paid benefits and
subscription decisions; relevant features/content/design; first-release scope;
constraints/success criteria; settled decisions and remaining questions.
Explicitly name the framework to preserve and the Tilly-specific concepts to
replace. Distinguish confirmed answers from proposals. Let the user correct
material product choices before they become implementation requirements; use
existing confirmation rather than asking it again.

Keep the brief in the customer's selected tracker or agreed private planning
location. Do not add customer discovery transcripts or work logs to public docs.
If no tracker is selected, present the brief and ask its destination when needed;
do not choose the template maintainer's tracker/project for the customer.

Hand the brief and decision references to plan-foir-app. Do not edit runtime
code, remove features, configure providers, apply schema, deploy, publish, make
purchases or call paid providers during discovery. The planning skill will
inspect the actual implementation and Fóir capabilities before proposing work.
