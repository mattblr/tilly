/** What an operation needs to show a user's catches through their own
 * audience record (audience.ts), creating it on first use. Hiding a catch
 * only unlinks it, so needs none of these. */
export const ownAudienceGrants = ['read', 'create', 'attribute', 'write'].map(action => `records:${action}:audience`)
/** Following: my requests (shared with who I ask), my approvals of my
 * followers, and a public user's approval written for them. */
export const followGrants = [
  ...['read', 'create', 'attribute', 'write', 'delete'].map(action => `records:${action}:follow-request`),
  ...['read', 'create', 'attribute', 'write'].map(action => `records:${action}:follow-approval`),
  ...ownAudienceGrants,
]
