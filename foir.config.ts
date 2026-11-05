import { challengeAnnouncementOperations, challengeAnnouncementSchedule } from './web/foir/challenge-announcements.ts'
import { tillyLoginPage } from './web/foir/login-page.ts'
import { tillyEmailCopy } from './web/foir/email.ts'
/** One project owns the app, website content, sign-in and operation grants. */
import { defineConfig, defineDesignTokens } from '@foir/cli/configs'
import designTokens from './ios/Tilly/Resources/DesignTokens.json' with { type: 'json' }
import app from './web/foir/app.ts'
import {
  webBillingAccount,
  webBillingExecutionGrants,
} from './web/foir/billing.ts'
import website from './web/schema.ts'
import { notificationSettings, notificationClientGrants, notificationOperations, streakContext } from './web/foir/notifications.ts'
import { safetyModels, safetyClientGrants, safetyInteractionGrants, safetyOperations } from './web/foir/safety.ts'
import { appearanceModels, appearanceSettingFields, appearanceClientGrants, appearanceOperations, captureFinalizationHooks } from './web/foir/appearance.ts'
import { isInstalledOperation, executionGrant } from './web/src/server/operations/installed-operations.ts'
import {artworkAttempt} from './web/foir/artwork.ts'
import { socialNotificationOperations, socialNotificationHooks } from './web/foir/social-notifications.ts'
import { challengeModels, challengeReadGrants, challengeClientModels } from './web/foir/challenges.ts'
import { captureCheckModels, captureCheckHooks } from './web/foir/capture-checks.ts'
import { audienceModel } from './web/foir/audience.ts'

const siteOrigin = new URL(process.env.TILLY_SITE_URL!).origin
if (siteOrigin !== process.env.TILLY_SITE_URL)
  throw new Error(
    'TILLY_SITE_URL must be an origin without a path or trailing slash',
  )

const loginOrigin = process.env.TILLY_LOGIN_ORIGIN
if (
  loginOrigin &&
  (new URL(loginOrigin).origin !== loginOrigin ||
    !loginOrigin.startsWith('https://'))
)
  throw new Error('TILLY_LOGIN_ORIGIN must be an HTTPS origin without a path')

const previewOrigin = process.env.TILLY_PREVIEW_ORIGIN
if (previewOrigin && (new URL(previewOrigin).origin !== previewOrigin || !previewOrigin.startsWith('https://')))
  throw new Error('TILLY_PREVIEW_ORIGIN must be an HTTPS origin without a path')
const previewGrants = ['records:read', 'files:read', 'designtokens:read', 'drafts:read']

const nativeClient = app.apiKeys![0]
const socialInteractionOperations = new Set(['like_capture', 'follow_user', 'add_field_note', 'share_capture'])
const webGrants = [
  ...nativeClient.grants.filter((grant) => grant !== 'notifications:write' && grant !== 'designtokens:read'),
  'designtokens:read',
  ...webBillingExecutionGrants,
  ...notificationClientGrants,
  ...safetyClientGrants,
  ...appearanceClientGrants,
  ...challengeReadGrants,
].map(executionGrant)

const fullConfig = defineConfig({
  ...app,
  // Retain an existing installation's stable config ownership during adoption.
  key: process.env.FOIR_CONFIG_KEY || app.key,
  designTokens: defineDesignTokens(designTokens),
  project: {
    ...app.project!,
    settings: {
      ...app.project!.settings,
      primaryColor: designTokens.color.brand.$value,
      displayName: 'Tilly',
      fromName: 'Tilly',
      logoUrl: `${siteOrigin}/images/tilly-icon.png`,
      appBaseUrl: siteOrigin,
      // Account-specific addresses belong in private deployment inputs.
      ...(process.env.TILLY_SUPPORT_EMAIL ? { supportEmail: process.env.TILLY_SUPPORT_EMAIL, replyTo: process.env.TILLY_SUPPORT_EMAIL } : {}),
      // This registers the site in Fóir; it does not deploy Cloudflare code.
      // The list replaces the project's sites: retain other owned origins here.
      sites: [{ origin: siteOrigin, name: 'Tilly', allowEditing: false }],
    },
  },
  models: [
    ...(app.models ?? []),
    ...(website.models ?? []),
    webBillingAccount,
    notificationSettings,
    ...safetyModels,
    ...appearanceModels,
    artworkAttempt,
    ...challengeModels,
    ...captureCheckModels,
    audienceModel,
  ].map(model => {
    // Fóir gap (docs/known-gaps.md, "Access-cache revocation"): a warmed read
    // served old public content after access narrowed. Here: Fóir's native
    // NO_CACHE policy on revocable social/private models; published CMS keeps
    // its cache. Closes when Fóir invalidates cached reads on every visibility
    // or grant change.
    const prepared = model.key === 'app-settings' ? {...model,fields:[...(model.fields ?? []),...appearanceSettingFields]}
      : model.key === 'capture-photo' ? {...model,fields:[...(model.fields ?? []), {key:'challengeHighlights',type:'json' as const,label:'Verified challenge highlights'}, {key:'challengeRevision',type:'text' as const,label:'Challenge result revision'}]} : model
    const revocable = prepared.access?.ownerPlane === 'user' || ['moderation-action', 'app-settings'].includes(prepared.key)
    return revocable ? { ...prepared, config: { ...prepared.config, cacheControl: { scope: 'NO_CACHE' as const } } } : prepared
  }),
  // Apple's provider needs a redirect URI, though the native button doesn't use
  // it and web Apple sign-in stays hidden (docs/apple-sign-in.md). Keep it on
  // this site's domain rather than a fixed one.
  authProviders: (app.authProviders ?? []).map(provider => provider.key === 'apple'
    ? { ...provider, config: { ...provider.config, redirect_uri: `${siteOrigin}/auth/apple` } } : provider),
  emailCopy: tillyEmailCopy,
  operations: [...(app.operations ?? []).filter(operation=>!isInstalledOperation(operation.key)).map(operation => ({ ...operation, grants: [...new Set([
    ...operation.grants,
    ...(socialInteractionOperations.has(operation.key) ? safetyInteractionGrants : []),
    ...(operation.key === 'like_capture' ? ['records:read:capture-post'] : []),
  ])] })), ...notificationOperations(siteOrigin), ...challengeAnnouncementOperations(siteOrigin), ...socialNotificationOperations(siteOrigin), ...safetyOperations(siteOrigin), ...appearanceOperations(siteOrigin)],
  // FOIR_CAPTURE_CHECK_SCHEMA_ONLY: an additive first apply creates the check model
  // before the installed check operation exists; the next full apply adds its hook.
  hooks: [...(app.hooks ?? []),...captureFinalizationHooks, ...(process.env.FOIR_CAPTURE_CHECK_SCHEMA_ONLY === 'true' ? [] : captureCheckHooks),
    // Fóir gap (docs/known-gaps.md, "Named-recipient notification"): a hook
    // acting for one user can't notify another. Here: social notifications
    // (likes, reposts, follows) are commented out, waiting for a Fóir platform
    // fix. Closes when a hook with the named-recipient grant can notify another
    // user; then restore this line.
    // ...socialNotificationHooks,
  ],
  schedules: [...(app.schedules ?? []), challengeAnnouncementSchedule, { key: 'streak-reminders', name: 'Local evening streak reminders', operationKey: 'streak_reminders', cron: '0 * * * *', timezone: 'UTC', enabled: true }],
  contextDimensions: [...(app.contextDimensions ?? []), ...streakContext],
  // Optional first-party hosted login in this same project/user pool. Register
  // the domain with Fóir, then complete its printed DNS verification separately.
  // Review this new client's exact user scope before applying the config.
  ...(loginOrigin
    ? {
        authClients: [
          {
            clientId: process.env.TILLY_WEB_CLIENT_ID || 'tilly-web',
            name: 'Tilly',
            firstParty: true,
            loginPage: tillyLoginPage(siteOrigin),
            // Fóir gap (docs/known-gaps.md, "Hosted Apple request"): hosted
            // Apple sign-in can't complete on the web. Here: Apple is hidden on
            // the web; the app keeps its native button. Closes when hosted
            // sign-in supports Apple's web flow beside the native identity.
            loginMethods: {
              password: false,
              otp: true,
              disabledProviders: ['apple'],
            },
            grants: webGrants,
            allowedOrigins: [siteOrigin, ...(previewOrigin ? [previewOrigin] : [])],
            redirectUris: [`${siteOrigin}/feed`, ...(previewOrigin ? [`${previewOrigin}/`] : [])],
            postLoginUrl: `${siteOrigin}/feed`,
            initiateLoginUri: `${siteOrigin}/sign-in`,
            customDomains: [new URL(loginOrigin).hostname],
          },
          ...(previewOrigin ? [{
            clientId: process.env.TILLY_PREVIEW_CLIENT_ID || 'tilly-preview', name: 'Tilly editor preview', firstParty: true,
            loginMethods: { password: false, otp: true, disabledProviders: ['apple'] },
            grants: previewGrants,
            allowedOrigins: [previewOrigin], redirectUris: [`${previewOrigin}/`],
            postLoginUrl: `${previewOrigin}/`, initiateLoginUri: `${previewOrigin}/`,
          }] : []),
        ],
      }
    : {}),
  // The role supplies the same two operations; the unchanged iOS key ceiling
  // still excludes them. No billing model is added to any public key.
  userRoles: [
    ...(app.userRoles ?? []).map((role) => role.key === 'member'
      ? { ...role, grants: [...role.grants.filter(grant => grant !== 'notifications:write'), ...webBillingExecutionGrants, 'operations:execute:save_notification_settings', ...safetyClientGrants, ...appearanceClientGrants, ...challengeReadGrants].map(executionGrant) } : role),
    // The only role that grants drafts:read. Assign it to editors in Fóir;
    // never a default role.
    { key: 'preview-editor', name: 'Preview editor', grants: previewGrants, isDefault: false },
  ],
  apiKeys: [
    ...(app.apiKeys ?? []).map(key => ({ ...key, grants: [...new Set([...key.grants, ...notificationClientGrants, ...safetyClientGrants, ...appearanceClientGrants].map(executionGrant))], allowedModels: [...(key.allowedModels ?? []), 'notification-settings', 'user-block', 'content-report', 'moderation-case', 'appearance-account', 'cat-appearance','appearance-vote', ...challengeClientModels] })),
    {
      name: 'Tilly website (public)',
      envVar: 'VITE_PLATFORM_API_KEY',
      kind: 'publishable',
      // With an editor preview, the key holds drafts:read but gives it to
      // nobody who isn't signed in: only a person whose role grants it (the
      // preview-editor role) reads drafts through it.
      grants: [
        ...webGrants.filter(grant => !challengeReadGrants.includes(grant)),
        ...(previewOrigin ? ['drafts:read'] : []),
      ],
      baselineGrants: [
        'records:read',
        'search:read',
        'files:read',
        'designtokens:read',
      ],
      // A separate, limited key within the same project, never another user pool.
      allowedModels: [
        ...(website.models ?? []).map((model) => model.key),
        'ui-copy',
        'notification-settings',
        'user-block', 'content-report', 'moderation-case',
        'appearance-account','cat-appearance','appearance-vote',
        ...challengeClientModels,
        ...(nativeClient.allowedModels ?? []),
      ],
    },
  ],
})

// Fóir gap (docs/known-gaps.md, "Bootstrap ordering"): a dry run accepts
// grants that name app operations not installed yet, and the apply refuses
// them. Here: a fresh project's first push creates the models only; push the
// full root again once the app is installed. Closes when the dry run reports
// what the apply refuses and one push can install the app first.
const bootstrap = process.env.FOIR_BOOTSTRAP_SCHEMA_ONLY === 'true'
const withoutInstallOperations = (grants: readonly string[] | undefined) =>
  grants?.filter(grant => !grant.startsWith('operations:execute:tilly.'))
export default defineConfig(bootstrap ? {
  ...fullConfig,
  apps: {},
  userRoles: fullConfig.userRoles?.map(role => ({ ...role, grants: withoutInstallOperations(role.grants) })),
  authClients: fullConfig.authClients?.map(client => ({ ...client, grants: withoutInstallOperations(client.grants) })),
  apiKeys: fullConfig.apiKeys?.map(key => ({ ...key, grants: withoutInstallOperations(key.grants) })),
} : fullConfig)
