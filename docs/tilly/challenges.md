# Automatic photo challenges

This describes the Tilly example. Read it only when retaining or changing this
feature; it does not define requirements for a different app.

A photo challenge is a published, time-bounded set of visible criteria, such as
“a cat and a postbox are clearly visible.” Saving a catch remains available
while challenge analysis is pending, unavailable or refused. Challenge evaluation
does not create another catch, repost, artwork allowance or ordinary streak day.
Manual correction belongs to identifying multiple cats, not to challenges.
Users cannot manually add, remove or correct challenge qualification.

## Published rules

`web/foir/challenges.ts` is composed by the single root Fóir configuration.
`photo-challenge` records contain the title, description, local badge icon,
enabled flag, inclusive UTC `startsAt`, exclusive UTC `endsAt`, immutable
`criteriaVersion`, bounded visible criteria, highlight key, target count and
approved model. Rules use server-created capture time, not a client timestamp.
A capture must fall inside the challenge window; delayed evaluation is allowed
until 24 hours after its end. Windows are at most 31 days, targets are 1–30
distinct canonical captures, and at most four challenges may overlap a capture.
This is threshold progress; it does not invent a challenge streak.

Titles and descriptions may be localized. Criteria, version, icon, highlight
key and model identity are not locale-dependent. Start a new published key and
rules version when changing competition criteria, dates or threshold. Disabling
an existing published challenge stops new evaluation; it does not rewrite
historical evidence. The console creates disabled drafts for operator review.
Publishing and provider activation are separate actions.

## Admin publication boundary

The Tilly console configures invitation text separately from AI checking criteria,
exact UTC dates/times and the badge target/icon. It generates stable identifiers,
creates drafts and lists never-published drafts so review survives a reload.
Published rules are preserved; changed rules become a new challenge version.
The profile section appears only during an enabled published challenge window.
There is no empty/loading/error challenge section without a known active challenge.

**Scoped publication limitation.** The current placement schema serves the
model-specific version publication mutation but omits the version-history lookup
needed to review its exact input, even with editor grants restricted to that
project-owned model. The app refuses publication in that connection and directs
the editor to Fóir's native Photo challenges view. Use the native editor to review and publish an exact version. No global record grant, broader credential or proxy is used.

## Evaluation contract

A saved catch is checked in the background, not on the capture screen. The save
writes a private `capture-check` request, and its record hook starts the installed
`tilly.check-capture` operation as the owner. After moderation, and unless the
photo is held, it evaluates the capture against the challenges. Results land on
the user's challenge badges. Analysis reads the capture's small JPEG, or the
sanitized private upload while that is still being made. Fóir verifies dispatch,
and the operation builds its client from that dispatch with its generated
operation surface. The handler derives
identity from verified ingress, checks ownership, readiness, current revision
and moderation holds, and reads the published rules itself.

Each dispatch evaluates at most one challenge. Fóir continuations advance
through a bounded catalogue; there is no second queue or promise left running
after the response. Clients read the capture's owned evidence and badges, because
the last continuation result is not an aggregate of earlier slices.

`challenge-evaluation` stores private user-owned outcome evidence. An immutable attempt key
binds the owner, canonical capture, immutable source file and exact criteria
and model digest. Atomic status/attempt/retry conditions admit at most one
inference attempt for that evidence. A nullable immutable `outcome` records
qualified/not-qualified independently of current source eligibility `status`.
Older rows without a recorded outcome never gain an invented one. Editing cat tags does not purchase another
analysis. Preparation failure before a provider request permits one explicit
retry. Provider timeout, malformed response, refusal or interrupted result is
ambiguous spend and enters recovery; ordinary retries never repeat that request.

The adapter accepts only the served small JPEG derivative, validates its file
identity and dimensions, strips metadata, and sends bounded photo bytes with
visible criteria to the existing Responses provider. It sends no account IDs,
location, cat names, notes, signed media URL or provider tools. Structured output
must explicitly confirm both a visible cat and the challenge criteria; malformed
or uncertain output never awards qualification. Rules and source eligibility are
checked again after the provider response.

Before inference, the adapter submits the identical sanitized image, criteria,
instructions and output schema to the Responses input-token counting endpoint.
It refuses missing, malformed or over-8,192 input counts, selects the explicit
standard service tier (`default`), and caps output at 240 tokens. A completed
answer must carry a matching standard-tier usage receipt within those limits.
Only aggregate token counts are logged. This guard bounds inference tokens,
not the total provider charge. Provider execution is disabled by default.
See the [official token-counting guide](https://developers.openai.com/api/docs/guides/token-counting).

The general `openai` credential is read directly from the installation bound
to verified dispatch for explicitly authorized artwork and challenge analysis.
Sharing this field is an app choice; separate provider fields are not a platform
requirement. No alternate credential field, broader Fóir credential or provider
environment-key fallback is supported. Appearance and moderation retain their
separate fields. Provider execution is disabled by default. An optional isolated-test actor pin cannot authorize spending by itself. Challenge analysis
requires approval for that purpose and photo; artwork approval alone does not
authorize it.

## Highlights, progress and badges

Qualified evidence updates `capture-photo.challengeHighlights`.
`challengeRevision` supplies an atomic comparison so concurrent challenge
results preserve each other. Originals and reposts read the canonical capture.
Save/edit inputs carry no highlight, so a caller cannot award one.

`challenge-award` is also private and user-owned. It stores the challenge/version,
exact criteria digest, badge title/icon, progress, threshold, active eligibility
and first-earned time. Progress deduplicates qualifying canonical capture IDs;
replays, tags, likes and reposts cannot inflate it. The badge collection appears
only on the signed-in owner's profile. No public profile-badge permission is
implied by publishing the challenge catalogue.

Reconciliation validates surviving source records and holds with bounded batched
reads. Missing, replaced, nonready or hidden source evidence is invalidated and
cannot keep an active badge. The internal `invalidateChallengeCapture` helper
refuses eligible sources and is not a user operation. The operator photo-hide
walk invokes it with verified source ownership after narrowing file/root access,
one evidence digest per Fóir continuation. Hold release revalidates the source
file, exact published rules digest and capture window before restoring a recorded
outcome, without running AI again. Deleted content, a remaining hold, changed rules
or a missing historical outcome cannot restore eligibility. Repeated release can
resume interrupted reconciliation. Reconciliation failures remain visible and retryable; no instantaneous
closed-app revocation guarantee is implied. First-earned time may remain as history while `active`
is false; clients display earned badges only when current eligibility holds.

## Challenge-start invitations

Invitation text comes from published challenge title/description and links to
the recipient's profile. The schedule and delivery remain disabled by default.
Each native continuation checks the active window and current community-update
intent. Its cursor is the only progress state and binds challenge identity and
criteria digest; there is no app run-election or announcement record.
Stable native notification keys protect retries/overlapping schedules.

The preview operation has no send/write authority. Real delivery requires the
supported native recipient contract and configured channels/consent. See
[notifications](../notifications.md) and [known gaps](../known-gaps.md). A preview does
not establish recipient delivery.
