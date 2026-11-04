export const safetyReviewGrants = [
  'records:read.all:content-report', 'records:read.all:moderation-case', 'records:read.all:moderation-action',
  'operations:execute:review_content',
]


export const safetyPublicationGrants = [
  'appsecrets:read', 'files:read', 'files:write',
  // Publication checks include the referenced public cat name. Without this
  // scope GraphQL may return partial data and silently omit the checked text.
  'records:read:cat',
  'records:read:artwork-attempt', 'records:write:catch-art',
  ...['read','create','attribute','write'].map(action=>`records:${action}:moderation-case`), 'records:read.all:moderation-case',
]
export const safetyReadGrants = ['records:read:user-block', 'records:read:moderation-case']
export const safetyInteractionGrants = ['records:read.all:user-block']

/** Operator hold reconciliation only; never added to ordinary user grants. */
export const challengeReviewGrants = ['challenge-evaluation','challenge-award'].flatMap(model=>[
  `records:read.all:${model}`, `records:write.all:${model}`,
])
