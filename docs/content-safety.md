# Content safety and review

This describes the template integration, illustrated by Tilly. Preserve the
shared integration when adapting the app; change its product rules and content
to match the new application.

Recognition does not authorize publication. Signed operations check the words
and image bytes selected for sharing, current ownership and moderation holds.
The browser and native app use the same publication boundary; a modified client
cannot substitute its own approval.

A saved catch is moderated after it is published. The save shares the catch with
its owner's chosen audience at once and writes a private `capture-check` request;
that record's hook starts the installed `tilly.check-capture` operation as the
owner. It checks the photo and cat name, and a flagged or unverifiable photo
becomes a hold: the reviewer's bounded hide walk takes the photo, its posts,
reposts, notes, tags and artwork private, and the hold appears in the console's
Holds list. A private profile's catches are checked too: its accepted followers
see them. Other sharing paths, including profiles, notes, reposts and privacy
switches, check before they widen access. Run by the photographer, the hide walk
changes only their own records; others' reposts lose the photo with its file.

Moderation uses the `moderationOpenAI` credential owned by the verified Fóir
installation. There is no Worker environment-key fallback. Missing credentials,
malformed verdicts or provider/storage errors refuse publication, or hide an
already published catch for review. Private capture
and public directory text have separate disclosure and access requirements.

Approvals bind the exact immutable file, normalized text and moderation model.
Changing any of those requires its own decision. Re-read holds and metadata
around widening access. An interrupted retry may reuse only the matching saved
approval; it must not request repeated votes until content passes.

Reporting writes private records with target/reason information. The console's
Review section requires its scoped placement session; public HTML conveys no
record authority. Reporter details and operator actions are not public feed data.
A photo-wide hold must cover originals, reposts, galleries, detail views, map
previews and generated artwork. Releasing a hold does not silently republish.

Blocking applies to original authors as well as reposting accounts. The current
reciprocal-read limitation is documented in [known gaps](known-gaps.md); do not
promise complete reciprocal enforcement or expose private block records to
compensate. Configure your own report-handling/support process and accurate
policy before opening a social service.

Publication uses bounded native continuations and current signed identity.
Record visibility, file visibility and old audience grants must be handled
independently. A successful mutation does not prove a warmed unsigned image or
record query is refused. See [publication](publication-continuations.md).

Enable moderation only after its provider credential, scoped operations and
reviewer access are configured. The root config and install manifest declare
access; the platform applies it. Do not add a broader proxy, custom access engine,
queue or external moderation bypass.

## Report alerts

Each new report tells the project's console team through Fóir's own
notifications, so someone reviews it quickly; Tilly's policy is within 24
hours. The report operation writes the `content-report` record, and a Fóir hook
on that record's creation sends the notice. Fóir sends it, not the reporter, so
no operation has to name another person as a recipient. Teammates see it in the
console's notifications. The notice says a report arrived and links to the console. It carries no
reporter, reason or content.

The root config can't declare this hook yet ([known gaps](known-gaps.md)), so
create it once in each project, in the console under Hooks → New hook:

- Key `content-report-alert`, event Record created, model Content report.
- Target Notification, recipient Project team.
- A title and message that match your report policy, for example "New report
  in Tilly" and "Someone reported a post, note or profile. Open Tilly in the
  console, then Review → Reports, and deal with it within 24 hours."
- Any category: Fóir asks for one, but a notice to the team doesn't use it.
- Action URL: the console app's address.

Publish the hook. Then file a test report from a second account, check the
hook's Deliveries tab and your console notifications, and dismiss the test
report under Review. The root config's pushes (`--no-prune`) leave the hook in
place.
