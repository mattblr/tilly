/**
 * Tilly — data and operation configuration for the cat-sharing social app.
 *
 * A cat belongs to the community, not to whoever found it: it is project-owned and
 * public, so its page is readable with the app key alone. Each catch is the
 * user's own: a capture photo and a tag for each cat in it (captures.ts). A tag
 * carries the vector the phone matches against, beside the neighbourhood point,
 * so one nearby search hands the phone everything it compares.
 */

import {
  defineConfig,
  defineModel,
  type ApplyConfigInput,
} from '@foir/cli/configs'
import { viewersField } from './audience.ts'

import { capturePhoto, captureCatTag } from './captures.ts'
import { appOperationDefinitions } from '../src/server/operations/operation-definitions.ts'

// The site hosts signed operation routes alongside its public pages.
const OPERATION_URL = process.env.TILLY_SITE_URL
if (!OPERATION_URL)
  throw new Error('Set TILLY_SITE_URL to your deployed site origin')

// Apple's provider secret is a JWT made with your own signing key.
// A configuration push without it keeps the value already stored in Fóir.
const APPLE_CLIENT_SECRET = process.env.TILLY_APPLE_CLIENT_SECRET

const cat = defineModel({
  key: 'cat',
  name: 'Cat',
  pluralName: 'Cats',
  description: 'A cat in the street, as every user sees it.',
  fields: [
    { key: 'name', type: 'text', label: 'Name', required: true },
    { key: 'area', type: 'geopoint', label: 'Neighbourhood' },
    // Where the cat was first caught, as geohash cells from about 5,000 km
    // (cell1) down to about 1 km (cell6). A zoomed-out map counts cats by
    // grouping on one of these: Fóir has no clustering of geopoints.
    ...[1, 2, 3, 4, 5, 6].map((n) => ({
      key: `cell${n}`,
      type: 'text' as const,
      label: `Area cell ${n}`,
      queryable: true,
    })),
  ],
  access: { ownerPlane: 'project', defaultVisibility: 'public' },
  config: { publishing: false, versioning: false },
})

// The social side. Every record is the user's own: an operation creates it
// in their name (`ownerId`), then makes it public (`set<Model>Visibility`) or
// opens it to their friends one by one (`grant<Model>Access`). A model owned
// by a user can't default to public, but each record can be made so.
//
// A run acts for the user who triggered it, and reaches their rows: so it
// can change and remove what the user owns. It can't change a project
// record at all under the current operation scope, which is why nothing here is one.

const reference = (key: string, model: string, label: string) => ({
  key,
  type: 'reference' as const,
  label,
  required: true,
  config: { referenceTypes: [model], multiple: false },
})
const owned = {
  ownerPlane: 'user' as const,
  defaultVisibility: 'private' as const,
}
const plain = { publishing: false, versioning: false }

const profile = defineModel({
  key: 'profile',
  name: 'Profile',
  pluralName: 'Profiles',
  description:
    'A user as others see them: the name and bio beside what they share.',
  fields: [
    { key: 'displayName', type: 'text', label: 'Display name', required: true },
    {
      key: 'username',
      type: 'text',
      label: 'Username',
      required: true,
      queryable: true,
    },
    { key: 'bio', type: 'text', label: 'Bio' },
    { key: 'photo', type: 'image', label: 'Profile photo' },
    // public (the default) or private: catches seen only by the followers
    // they accept. Public, so anyone can tell before asking to follow; their
    // audience record (audience.ts) is what enforces it.
    { key: 'privacy', type: 'text', label: 'Public or private' },
  ],
  access: owned,
  config: plain,
})

// The things a user can say they noticed at a catch. Edited in the console;
// add_field_note accepts only the labels listed here.
const noteTag = defineModel({
  key: 'note-tag',
  name: 'Note tag',
  pluralName: 'Note tags',
  description:
    'One thing a user can say they noticed about a cat, like Sleepy.',
  fields: [
    { key: 'label', type: 'text', label: 'Label', required: true },
    { key: 'position', type: 'integer', label: 'Position', queryable: true },
  ],
  access: { ownerPlane: 'project', defaultVisibility: 'public' },
  config: plain,
})

const fieldNote = defineModel({
  key: 'field-note',
  name: 'Field note',
  pluralName: 'Field notes',
  description:
    'What a user noticed at one of their own catches: a few tags and a line.',
  fields: [
    reference('cat', 'cat', 'Cat'),
    { key: 'catKey', type: 'text', label: 'Cat id', queryable: true },
    // The catch the note belongs to: the cat photo it was taken with.
    {
      key: 'photoKey',
      type: 'text',
      label: 'Catch',
      required: true,
      queryable: true,
    },
    { key: 'tags', type: 'json', label: 'Tags' },
    { key: 'text', type: 'text', label: 'Note' },
    viewersField(),
  ],
  access: owned,
  config: plain,
})

// A like is on a capture, the photo one catch made. A cat's likes are its
// captures' likes added up; the cat itself is followed, not liked.
const captureLike = defineModel({
  key: 'capture-like',
  name: 'Capture like',
  pluralName: 'Capture likes',
  description: 'One user liking one capture. Unliking removes it.',
  fields: [
    reference('cat', 'cat', 'Cat'),
    { key: 'catKey', type: 'text', label: 'Cat id', queryable: true },
    {
      key: 'photoKey',
      type: 'text',
      label: 'Capture',
      required: true,
      queryable: true,
    },
  ],
  access: owned,
  config: plain,
})

const followRequest = defineModel({
  key: 'follow-request',
  name: 'Follow request',
  pluralName: 'Follow requests',
  description:
    'A user asking to follow another. Private to the two of them; the follow is on once the other user approves it (follow-approval).',
  fields: [
    {
      key: 'followeeId',
      type: 'text',
      label: 'Following',
      required: true,
      queryable: true,
    },
    // requested, or accepted when a public user was followed at once.
    // Informational: whether a follow is on is the followee's approval.
    { key: 'status', type: 'text', label: 'Status', queryable: true },
  ],
  access: owned,
  config: plain,
})

// The followed user's half of a follow. Only a record's owner may change it
// or who it is shared with, so the user being followed owns their approval:
// their followers list is these records, read through their audience (a
// private user's list is for their accepted followers). A follow is on while
// both the request and an accepted approval exist. Declined and removed
// approvals stay, shared only with the asker, so their app can tell.
const followApproval = defineModel({
  key: 'follow-approval',
  name: 'Follow approval',
  pluralName: 'Follow approvals',
  description: 'A user’s approval of someone following them.',
  fields: [
    { key: 'followerId', type: 'text', label: 'Follower', required: true, queryable: true },
    // The request it answers: a new request is asked again.
    { key: 'requestId', type: 'text', label: 'Request', required: true, queryable: true },
    // accepted, declined or removed.
    { key: 'status', type: 'text', label: 'Status', required: true, queryable: true },
    viewersField(),
  ],
  access: owned,
  config: plain,
})

const capturePost = defineModel({
  key: 'capture-post',
  name: 'Capture post',
  pluralName: 'Capture posts',
  description:
    'A catch as other users see it, named with who caught it; or a reshare of one with a comment. Every catch is posted when it is saved.',
  fields: [
    reference('cat', 'cat', 'Cat'),
    { key: 'catKey', type: 'text', label: 'Cat id', queryable: true },
    {
      key: 'photoKey',
      type: 'text',
      label: 'Capture',
      required: true,
      queryable: true,
    },
    { key: 'area', type: 'geopoint', label: 'Neighbourhood' },
    // The homepage reads this coarse region without requesting neighbourhood coordinates.
    { key: 'worldCell', type: 'text', label: 'World region', queryable: true },
    // What the post shows as: public, or private (the poster's followers, or
    // only the poster while held). `viewers` enforces it; this is for public
    // feeds, the Private label and resharing.
    {
      key: 'audience',
      type: 'text',
      label: 'Audience',
      required: true,
      queryable: true,
    },
    { key: 'note', type: 'text', label: 'Note' },
    // The poster's audience: the catcher's, or the resharer's for a reshare.
    viewersField(),
    // A reshare names the post it reshares, and carries the resharer's comment.
    { key: 'reshareOf', type: 'text', label: 'Reshare of', queryable: true },
    { key: 'comment', type: 'text', label: 'Comment' },
    // When the post stands for: the catch, for a capture; the reshare, for a
    // reshare. Feeds are in this order, so a catch posted late sits at its time.
    { key: 'postedAt', type: 'date', label: 'Posted at', queryable: true },
  ],
  access: owned,
  config: plain,
})

const catFollow = defineModel({
  key: 'cat-follow',
  name: 'Cat follow',
  pluralName: 'Cat follows',
  description: 'A cat a user wants news of. Private to the user.',
  fields: [
    reference('cat', 'cat', 'Cat'),
    { key: 'catKey', type: 'text', label: 'Cat id', queryable: true },
  ],
  access: owned,
  config: plain,
})

// Behavior and copy configured in the console: edited as records, so
// none of it waits on an app release.
const projectOwned = {
  ownerPlane: 'project' as const,
  defaultVisibility: 'public' as const,
}

// A streak tier: from this many days in a row, a catch earns this badge, and
// premium art in this style.
const streakTier = defineModel({
  key: 'streak-tier',
  name: 'Streak tier',
  pluralName: 'Streak tiers',
  description:
    'A badge for catching cats this many days in a row, and the style premium art takes from then on.',
  fields: [
    {
      key: 'days',
      type: 'integer',
      label: 'Days in a row',
      required: true,
      queryable: true,
    },
    { key: 'name', type: 'text', label: 'Badge name', required: true },
    // A Phosphor icon name such as `paw-print`, or an emoji.
    { key: 'symbol', type: 'text', label: 'Symbol' },
    { key: 'stylePrompt', type: 'text', label: 'Art style prompt' },
    { key: 'animated', type: 'boolean', label: 'Animated art' },
  ],
  access: projectOwned,
  config: plain,
})

// The app's words, one record per namespace (its natural key, such as
// `reveal`), each a list of key and text. The app keeps its own words as the
// fallback, so a missing entry never shows a key.
const uiCopyEntry = defineModel({
  key: 'ui-copy-entry',
  name: 'UI copy entry',
  pluralName: 'UI copy entries',
  fields: [
    {
      key: 'key',
      type: 'text',
      label: 'Key',
      required: true,
      config: { translatable: false },
    },
    { key: 'value', type: 'text', label: 'Text', required: true },
  ],
  config: { ...plain, inline: true, records: false },
})
const uiCopy = defineModel({
  key: 'ui-copy',
  name: 'UI copy',
  pluralName: 'UI copy',
  description:
    'Shared interface copy for one part of the app. `{name}` placeholders are filled in by the app.',
  fields: [
    {
      key: 'entries',
      type: 'list',
      label: 'Entries',
      required: true,
      config: { itemSchema: 'ui-copy-entry' },
    },
  ],
  access: projectOwned,
  config: plain,
})

// The app's numbers. One record, natural key `app`.
const appSettings = defineModel({
  key: 'app-settings',
  name: 'App settings',
  pluralName: 'App settings',
  description:
    'App behavior and display settings. One record, natural key `app`.',
  fields: [
    {
      key: 'clusterAt',
      type: 'integer',
      label: 'Cats in an area before the map counts them',
    },
    {
      key: 'nearYouMeters',
      type: 'integer',
      label: '“Near you” distance, in metres',
    },
    {
      key: 'nearYouHours',
      type: 'integer',
      label: '“Near you” window, in hours',
    },
    {
      key: 'nearMeMeters',
      type: 'integer',
      label: 'Trending “Near me” reach, in metres',
    },
    {
      key: 'trendingPerCat',
      type: 'integer',
      label: 'Most posts of one cat on Trending',
    },
    // Premium art: the image model, and its quality (low, medium or high).
    { key: 'artModel', type: 'text', label: 'Art image model' },
    { key: 'artQuality', type: 'text', label: 'Art image quality' },
  ],
  access: projectOwned,
  config: plain,
})

// Tilly Premium given free, to one user until a date. Made in the console;
// owned by the user it's for, so only they and the console see it. Paid
// premium from RevenueCat and Stripe is reconciled into this same model.
const premiumGrant = defineModel({
  key: 'premium-grant',
  name: 'Premium grant',
  pluralName: 'Premium grants',
  description:
    'Tilly Premium given free to the user who owns this record, until a date.',
  fields: [
    {
      key: 'until',
      type: 'date',
      label: 'Until',
      required: true,
      queryable: true,
    },
    { key: 'note', type: 'text', label: 'Why' },
  ],
  access: owned,
  config: plain,
})

// Premium art: one catch's photo redrawn in the style of the user's streak
// tier, shown on the back of the photo. Seen by whoever sees the catch.
const catchArt = defineModel({
  key: 'catch-art',
  name: 'Catch art',
  pluralName: 'Catch art',
  description: 'A catch’s photo redrawn in the style of the catcher’s streak.',
  fields: [
    reference('cat', 'cat', 'Cat'),
    { key: 'catKey', type: 'text', label: 'Cat id', queryable: true },
    {
      key: 'photoKey',
      type: 'text',
      label: 'Catch',
      required: true,
      queryable: true,
    },
    viewersField(),
    // making, ready or failed.
    {
      key: 'status',
      type: 'text',
      label: 'Status',
      required: true,
      queryable: true,
    },
    { key: 'art', type: 'image', label: 'Art' },
    { key: 'style', type: 'text', label: 'Style' },
    { key: 'tierDays', type: 'integer', label: 'Streak tier' },
  ],
  access: owned,
  config: plain,
})

// A trial of an art style, model or quality on a real catch, run from the admin
// panel. Kept so trials can be compared, and never shown to users. It's the
// project's own: a run from the panel has no user to belong to.
const artTrial = defineModel({
  key: 'art-trial',
  name: 'Art trial',
  pluralName: 'Art trials',
  description: 'A catch’s photo redrawn to try out a style, model or quality.',
  fields: [
    {
      key: 'photoKey',
      type: 'text',
      label: 'Catch',
      required: true,
      queryable: true,
    },
    // The run that drew it, so the admin page can tell which of its runs finished.
    { key: 'runId', type: 'text', label: 'Run', queryable: true },
    { key: 'prompt', type: 'text', label: 'Prompt' },
    { key: 'artModel', type: 'text', label: 'Image model' },
    { key: 'artQuality', type: 'text', label: 'Quality' },
    // making, ready or failed.
    {
      key: 'status',
      type: 'text',
      label: 'Status',
      required: true,
      queryable: true,
    },
    { key: 'art', type: 'image', label: 'Art' },
    { key: 'seconds', type: 'integer', label: 'Seconds to draw' },
    { key: 'error', type: 'text', label: 'What went wrong' },
  ],
  // Drawn from users' photos, so only the admin page reads them.
  access: {
    ownerPlane: 'project' as const,
    defaultVisibility: 'private' as const,
  },
  config: plain,
})


const app: ApplyConfigInput = {
  key: 'tilly-project',
  name: 'Tilly',
  project: {
    id: process.env.FOIR_PROJECT_ID!,
    tenantId: process.env.FOIR_TENANT_ID!,
    settings: {
      // Website and iOS sign in to the same project user pool.
      // Choose the sign-in methods appropriate to your product.
      otpEnabled: true,
      passwordEnabled: false,
      signupMode: 'public',
    },
  },
  models: [
    cat,
    capturePhoto,
    captureCatTag,
    profile,
    noteTag,
    fieldNote,
    captureLike,
    followRequest,
    followApproval,
    capturePost,
    catFollow,
    streakTier,
    uiCopyEntry,
    uiCopy,
    appSettings,
    premiumGrant,
    catchArt,
    artTrial,
  ],
  // The manifest bridge gives operations access to authorized install
  // credentials and exposes the console placement. See docs/foir-patterns.md.
  apps: {
    tilly: { source: process.env.TILLY_APP_MANIFEST_URL || `${OPERATION_URL}/_foir/apps/tilly.json` },
  },
  authProviders: [
    {
      // Sign in with Apple from the app's native button.
      key: 'apple',
      name: 'Apple',
      type: 'oidc',
      enabled: true,
      config: {
        discovery_url:
          'https://appleid.apple.com/.well-known/openid-configuration',
        client_id: 'ink.tilly',
        ...(APPLE_CLIENT_SECRET ? { client_secret: APPLE_CLIENT_SECRET } : {}),
        token_endpoint_auth_method: 'client_secret_post',
        scopes: 'openid email',
        // The provider requires a redirect URI: the root config sets one on
        // this site's domain. The native button doesn't use it; web Apple
        // sign-in has its own callback (docs/apple-sign-in.md).
      },
    },
  ],
  apiKeys: [
    {
      name: 'Tilly iOS app',
      kind: 'publishable',
      envVar: 'TILLY_APP_KEY',
      grants: [
        'records:read',
        'search:read',
        'files:read',
        'designtokens:read',
        'files:write',
        'operations:read',
        'operations:execute:save_catch',
        'operations:execute:update_capture_tags',
        'operations:execute:save_profile',
        'operations:execute:like_capture',
        'operations:execute:follow_cat',
        'operations:execute:follow_user',
        'operations:execute:tidy_followers',
        'operations:execute:profile_counts',
        'operations:execute:add_field_note',
        'operations:execute:share_capture',
        'operations:execute:post_my_catches',
        'operations:execute:tilly.claim-premium',
        'notifications:write',
      ],
      baselineGrants: ['records:read', 'search:read', 'files:read', 'designtokens:read'],
      allowedModels: [
        'cat',
        'capture-photo',
        'capture-cat-tag',
        'profile',
        'note-tag',
        'field-note',
        'capture-like',
        'follow-request',
        'follow-approval',
        'capture-post',
        'cat-follow',
        'streak-tier',
        'ui-copy',
        'app-settings',
        'premium-grant',
        'catch-art',
        // Read through, not for itself: a catch's `viewers` audience.
        'audience',
      ],
    },
  ],
  userRoles: [
    {
      key: 'member',
      name: 'Member',
      isDefault: true,
      grants: [
        'records:read',
        'search:read',
        'files:read',
        'files:write',
        'operations:read',
        'operations:execute:save_catch',
        'operations:execute:update_capture_tags',
        'operations:execute:save_profile',
        'operations:execute:like_capture',
        'operations:execute:follow_cat',
        'operations:execute:follow_user',
        'operations:execute:tidy_followers',
        'operations:execute:profile_counts',
        'operations:execute:add_field_note',
        'operations:execute:share_capture',
        'operations:execute:post_my_catches',
        'operations:execute:tilly.claim-premium',
        'notifications:write',
      ],
    },
  ],
  operations: [
    ...appOperationDefinitions(OPERATION_URL),

  ],
}

export default defineConfig(app)
