# Publication and privacy changes

This describes the template integration, illustrated by Tilly. Preserve the
shared integration when adapting the app; change its product rules and content
to match the new application.

Profile privacy, capture saving and repair use bounded native Fóir
continuations. A catch saves in one or two slices, as many stages as fit each
dispatch's request budget, and is moderated afterwards (see
[content safety](content-safety.md)). Clients observe their own execution and
show success only after its terminal result. A deadline means pending, not
success; unchanged retries reuse the same intent. Account changes discard late
responses.

## Profiles and follows

A profile is Public or Private (the user's `privacy`, on the `profile` model),
and one rule decides who sees a catch. Each user has one audience record
(`audience`): public for a public profile, private and granted to each
accepted follower for a private one. A catch's records reference it through an
`association_read` field (`viewers`), so whoever can read the audience reads
the catch. A held catch's `viewers` is disconnected, so only its owner reads
it. Photo and artwork bytes are public only for a public profile with nothing
held. Reposts follow the reposter's setting. Captures and posts also store what
they show as (`audience`: public or private) for public feeds, the Private
label and resharing; `viewers` is what enforces it.

Switching privacy changes the audience record at once, then walks the files,
one catch per slice. Going private first grants the current followers.

Only a record's owner may change it or who it is shared with (see
[known gaps](known-gaps.md)), so a follow has two halves. The asker's request
(`follow-request`) is shared with the user asked. That user's approval
(`follow-approval`) is created when they accept, or straight away when their
profile is public, and is read through their audience: a private user's
follower and following lists are for their accepted followers. A follow is on
while both halves stand. Unfollowing removes the request at once; the followed
user's app runs `tidy_followers` to take back the read grant it left. The tidy
exists only because a grantee can't give up a grant; it goes when that gap
closes.

Requests send no notification yet (named-recipient sends are a
[known gap](known-gaps.md)), so the profile button shows a badge with the
number of people waiting for an answer: requests to the user that they haven't
accepted or declined. The web reads it on navigation, when the tab is shown
again and after an answer; iOS refreshes its follow lists when the app comes to
the foreground and when the profile opens.

Counts are meant to be public, with only the lists private. Today
`profile_counts` answers anyone for a public profile, but only the user and
their accepted followers for a private one. It refuses everyone else, and the
apps hide counts on a private page the viewer doesn't follow. It counts with
Fóir's aggregate queries, and a run is confined to the rows its user may read,
whatever the operation's grants say. An operation can't yet keep counters on
another user's profile either (see [known gaps](known-gaps.md)). Someone who
unfollows still counts until the followed user's app tidies.

Each slice checks current owner, source revision, preferences and holds, then
changes a bounded record/grant/file stage. Apart from saved catches, files remain
private until approved publication finishes. An older run cannot reopen a newer private choice.
Catch repair changes posts/files without rewriting canonical captures or tags.
The repair (`tilly.post-my-catches`) is for operators after a data change, run
as the user it repairs; the apps don't run it on their own.
Per-capture edits scope every page to the owner and target capture; foreign
reposts never edit the original owner's records/files.

Drain old audience grants before declaring narrowing complete. Artwork is
narrowed before its source changes. Failure continues bounded private
compensation. A hold affects its source and related public paths while leaving
unrelated profile work independent.

Approval reuse binds verified creator, immutable file ID, normalized text and
moderation model. Read fresh metadata/holds around widening; a new file, text or
model cannot borrow an old verdict. Do not put image bytes, signed media URLs or
approval authority in continuation cursors.

Record/file/CDN transitions are independent, not an atomic publication promise.
The root uses Fóir's native `NO_CACHE` policy on revocable social/private models;
published CMS retains its own cache policy. See the verified revocation
limitation in [known gaps](known-gaps.md). Check identical warmed anonymous
queries and unsigned media URLs after narrowing; neither record visibility nor
file refusal substitutes for the other.

Only signed-in owners may observe their operation runs. Keep execution-read
permissions outside the anonymous baseline and invalidate observers on account
replacement. Fóir owns progress, retries and callbacks; no second job system or
stored dispatch credential is needed.
