import { defineModel } from '@foir/cli/configs'

/** Who sees a user's catches. One record per user: PUBLIC for a public
 * profile; PRIVATE for a private one, with a read
 * grant for each accepted follower. Catch records point at it through
 * `viewers`, and Fóir lets whoever can read it read them. A record with no
 * `viewers` (a catch held for review) is its owner's alone.
 */
export const audienceModel = defineModel({
  key: 'audience', name: 'Audience', pluralName: 'Audiences',
  description: 'Whether a user’s catches are public or seen only by the followers they accept.',
  fields: [
    // public or private, as last applied. The user's `privacy` is what they
    // chose; the two differ only while a switch is being applied.
    { key: 'privacy', type: 'text', label: 'Public or private', required: true, queryable: true },
  ],
  // Only its owner can share it or take a grant back (Fóir does not let a
  // grantee give one up), so leaving a private user is tidied by their app.
  access: { ownerPlane: 'user', defaultVisibility: 'private' },
  config: { publishing: false, versioning: false, cacheControl: { scope: 'NO_CACHE' } },
})

/** A record anyone who can see the user's audience may read too. */
export const viewersField = (key = 'viewers', label = 'Seen by') => ({
  key, type: 'reference' as const, label,
  config: { referenceTypes: ['audience'], multiple: false, relationship: { kind: 'association_read' as const } },
})
