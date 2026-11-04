# Privacy and follows

This describes the Tilly example. Read it only when retaining or changing this
feature; it does not define requirements for a different app.

## The product rules

- A profile is **Public** or **Private**. Users switch it in their profile
  settings; a new profile is public until they do.
- On a public profile, anyone (signed out too) sees the user's catches, photos
  and artwork.
- On a private profile, only the user and their accepted followers see them.
  Everyone else sees the profile header (name, photo and bio) and nothing else.
- Following a public user takes effect at once. Following a private user sends
  a request; the button shows **Requested** until they answer.
- The followed user accepts or declines. They can also remove a follower later.
  Unfollowing ends the follow straight away.
- The profile button shows a badge with the number of requests waiting for an
  answer, on iOS and the web. Push notifications for requests are off for now
  (see [known gaps](../known-gaps.md)).
- Follower and following lists are visible only to the user and, on a private
  profile, their accepted followers. Counts are meant to be public; today a
  private user's counts follow the same rule as their lists (see
  [known gaps](../known-gaps.md)).
- A catch held for moderation stays visible only to its owner, whatever the
  profile setting.

## Where it lives

- Models: `profile`, `audience`, `follow-request` and `follow-approval`
  (`web/foir/app.ts`, `web/foir/audience.ts`).
- Operations: `follow_user` (follow, unfollow, accept, decline, remove),
  `tidy_followers` and `profile_counts`, in `web/src/server/operations/`
  (`social.ts`, `audience.ts`, `publication.ts`). The privacy switch runs as a
  bounded walk in `publication.ts`.
- Web: `web/src/features/app/follows.ts`, `ProfileStats.tsx` and the
  `/people/$userId` route. iOS: `ios/Tilly/Social/` and
  `ios/Tilly/Profile/ProfileView.swift`.
- The access pattern behind it is in [Fóir patterns](../foir-patterns.md#who-sees-a-users-content);
  the record and file details are in
  [publication](../publication-continuations.md#profiles-and-follows).

## Adapting it

Most social apps need some version of "who can see what I post". Keep the
audience record and the two-record relationship pattern, and change the rules:
for example, groups instead of followers, or one audience per collection rather
than per user. Keep record visibility and file visibility in step, and test
each change as the owner, a follower, someone else and a signed-out visitor.
