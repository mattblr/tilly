import { ownAudienceGrants } from './audience-grants'
import { challengeEditorGrants } from '../../../foir/challenges.ts'
import { installedManifestOperations } from './installed-operations'
import { billingOperations, billingSettings } from '../payments/manifest'
import { safetyReviewGrants } from './safety-manifest'
import {captureRequestEventSchema} from './capture-finalization-contract'
// Platform work in progress: project-owned credential access and scoped console
// placements will remove the need to install a separate app for these features.
// This manifest is public; its credential is stored by Fóir, never in this file.

export const APP_NAME = 'tilly'

/** The models make-catch-art reads and keeps. */
const keeps = (model: string) => [
  `records:read:${model}`,
  `records:create:${model}`,
  `records:attribute:${model}`,
  `records:write:${model}`,
]

/** What the admin page edits: every row of a model. */
const edits = (model: string) => [
  `records:read.all:${model}`,
  `records:create:${model}`,
  `records:write.all:${model}`,
  `records:delete.all:${model}`,
]

export default function manifest(origin: string) {
  return {
    name: APP_NAME,
    version: '1.2.0',
    metadata: {
      display_name: 'Tilly',
      description:
        'Tilly’s scoped publishing, cat appearance, Premium art and billing operations, with provider credentials held in Fóir.',
    },
    middleware: { url: origin },
    ui: {
      placements: [
        {
          key: 'admin',
          target: 'FULL_PAGE',
          title: 'Tilly',
          url: `${origin}/_foir/apps/tilly/admin`,
          // The page acts as the person looking at it, with the part of this
          // list they already hold. It can do nothing they couldn't.
          grants: [
            ...edits('streak-tier'),
            ...edits('note-tag'),
            ...challengeEditorGrants,
            ...edits('premium-grant'),
            'records:attribute:premium-grant',
            'records:read.all:app-settings',
            'records:write.all:app-settings',
            'records:read.all:ui-copy',
            'records:write.all:ui-copy',
            'records:read.all:profile',
            'records:read.all:cat',
            // Public catches, for art trials.
            'records:read:capture-photo',
            'records:read.all:art-trial',
            'records:delete.all:art-trial',
            // This token has no user, so it only gets working links to private
            // photos with this.
            'files:read.all',
            // Badge pictures for streak tiers and challenges, uploaded here.
            // An upload from this token has no user owner, so it becomes a
            // project file, and only a caller standing as the project may
            // write one. Standing reaches project-owned rows, never a user's.
            'files:write',
            'project:stand',
            'operations:execute:tilly.preview-art',
            'operations:execute:tilly.setup-status',
            'operations:execute:notification_campaign',
            'operations:read',
            ...safetyReviewGrants,
          ],
        },
      ],
    },
    settings_schema: billingSettings,
    inbound: { webhook: { path: '/inbound/stripe' } },
    credentials: {
      strategy: 'API_KEY',
      schema: {
        type: 'object',
        required: ['openai'],
        properties: {
          appearanceOpenAI: { type: 'string', title: 'OpenAI key for consented cat appearance', format: 'password' },
          moderationOpenAI: {
            type: 'string',
            title: 'OpenAI key for input moderation',
            format: 'password',
          },
          revenueCatApiKey: {
            type: 'string',
            title: 'RevenueCat subscriber lookup API key',
            format: 'password',
          },
          revenueCatWebhookSecret: {
            type: 'string',
            title: 'RevenueCat webhook HMAC signing secret',
            format: 'password',
          },
          stripeSecretKey: {
            type: 'string',
            title: 'Stripe secret key',
            format: 'password',
          },
          stripeWebhookSecret: {
            type: 'string',
            title: 'Stripe webhook signing secret',
            format: 'password',
          },
          openai: {
            type: 'string',
            title: 'OpenAI API key for authorized artwork and challenge analysis',
            format: 'password',
          },
        },
      },
    },
    operations: [
      ...billingOperations,
      ...installedManifestOperations(origin),
      {
        key: 'make-catch-art',
        name: 'Make catch art',
        description:
          'For a Tilly Premium user: redraws one of their catches in their streak tier’s style, from the photo and what they noticed, and tells them when it’s ready.',
        endpoint: '/operations/make_catch_art',
        supports_async: true,
        timeout_ms: 300_000,
        // Never replay a paid provider request after an ambiguous timeout.
        retry_policy: { maxRetries: 0 },
        // The served app-manifest contract does not accept operation
        // preconditions. A private finalized request is the admission event.
        // Configure artworkQuota on the installed operation before enabling its hook.
        grants: [
          'appsecrets:read',
          'records:read:cat',
          'records:read:capture-photo',
          'records:read:capture-cat-tag',
          'records:read:field-note',
          'records:read:streak-tier',
          'records:read:app-settings',
          'records:read:ui-copy',
          'records:read:premium-grant',
          'records:read:notification-settings',
          'records:read:capture-post',
          'records:read:profile',
          'records:read:follow-request',
          'files:read',
          'files:write',
          'notifications:write.named',
          ...keeps('catch-art'),
          ...keeps('artwork-attempt'),
          'records:read:capture-finalization',
          'records:read:artwork-request',
          ...keeps('moderation-case'),
          ...ownAudienceGrants,
        ],
        input_schema: captureRequestEventSchema('artwork'),
        output_schema: {
          type: 'object',
          properties: {
            ok: { type: 'boolean' },
            id: { type: 'string' },
            active: { type: 'boolean' },
            error: { type: 'string' },
          },
        },
      },
      {
        key: 'claim-premium',
        name: 'Claim Premium',
        description:
          'Checks the signed-in user’s subscription against their webhook-reconciled premium grant.',
        endpoint: '/operations/claim_premium',
        grants: ['appsecrets:read', 'records:read:premium-grant'],
        input_schema: { type: 'object', properties: {} },
        output_schema: {
          type: 'object',
          properties: {
            ok: { type: 'boolean' },
            active: { type: 'boolean' },
            until: { type: 'string' },
            error: { type: 'string' },
          },
        },
      },
      {
        key: 'setup-status',
        name: 'Check setup',
        description:
          'Where Stripe and RevenueCat send their webhooks, and which provider keys this installation holds. Names only, never a key.',
        endpoint: '/operations/setup_status',
        grants: ['appconfig:read', 'appsecrets:read'],
        input_schema: { type: 'object', properties: {} },
        output_schema: {
          type: 'object',
          properties: {
            ok: { type: 'boolean' },
            webhookUrl: { type: 'string' },
            missing: { type: 'array', items: { type: 'string' } },
          },
        },
      },
      {
        key: 'preview-art',
        name: 'Try an art style',
        description:
          'Draws one capture in a streak tier’s style, or a prompt given, with the model and quality given, and keeps it as an art trial of the person who asked. For trying a style or a model out.',
        endpoint: '/operations/preview_art',
        supports_async: true,
        timeout_ms: 300_000,
        // Never replay a paid provider request after an ambiguous timeout.
        retry_policy: { maxRetries: 0 },
        // A run from the admin page has no user, so what it stores is the project's.
        grants: [
          'project:stand',
          'appsecrets:read',
          'records:read:capture-photo',
          'records:read:capture-cat-tag',
          'records:read:streak-tier',
          'files:read',
          'files:write',
          ...keeps('art-trial'),
        ],
        input_schema: {
          type: 'object',
          required: ['photoKey'],
          properties: {
            photoKey: { type: 'string' },
            tierDays: { type: 'integer' },
            photoUrl: { type: 'string' },
            width: { type: 'integer' },
            height: { type: 'integer' },
            prompt: { type: 'string' },
            model: { type: 'string' },
            quality: { type: 'string' },
          },
        },
        output_schema: {
          type: 'object',
          properties: {
            ok: { type: 'boolean' },
            id: { type: 'string' },
            error: { type: 'string' },
          },
        },
      },
    ],
  }
}
