# Post highlights and personal streaks

This describes the Tilly example. Read it only when retaining or changing this
feature; it does not define requirements for a different app.

A photo highlight is a small indicator on its canonical capture, preserved when
that photo is reposted. It does not create another content type, photo total,
streak day or artwork allowance. The ordinary capture streak is personal: show
a compact symbol and count only to the signed-in owner. Never publish a streak
on another person's profile.

## Challenge highlights

A highlight is the badge of an [automatic photo challenge](challenges.md) the
photo verifiably met: published windows and visible criteria, server-side
automatic AI evaluation, private evidence, verified canonical highlights,
threshold progress and private earned badges. A cat selfie can be a challenge,
alongside cat-and-postbox or other published criteria. The capture flow has no
manual highlight choice, and users cannot add, remove or correct challenge
qualification. Manual correction applies to identifying multiple cats.

Results live in the canonical capture's `challengeHighlights`, with their own
comparison token. Save and edit inputs carry no highlight, so a caller cannot
forge one. A badge's title and picture come from the published challenge,
including after it ends; without readable challenge metadata the photo shows no
badge rather than a raw key. Display originals and reposts through the same
canonical capture and preserve its record/file audience and moderation rules.
Do not widen file visibility for a badge.

Normal capture saving remains available without challenge or provider access.
Reading badge metadata does not trigger historical scanning or paid analysis.

## Ordinary streaks

Both clients use ordinary capture dates, not likes,
tags, reposts or highlights, for the owner's compact streak. Relevant date lists
paginate and deduplicate days across the owner's ready captures.
Web uses the browser time zone; iOS uses the device calendar/time zone. Future
dates do not award progress. Native account-bound requests discard late responses
after an account change.

`pnpm check:ios-streak` runs the ordinary streak-calendar contract checks on
macOS. It is distinct from camera recognition and AI challenge evaluation.
