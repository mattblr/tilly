import { challengeAnnouncementHandler } from './challenge-announcements-handler'
import * as announcementGenerated from './generated/foir.op.challenge_announcements.generated'
import { requireInstalledDispatch, InstalledDispatchRefusal } from './installed-operations'
import { billingFailureReason } from '../payments/errors'
import { revenueCatWebhook, reconcileRevenueCatDelivery } from '../payments/revenuecat-handlers'
import { BillingDeliveryRefused } from '../payments/workflow'
import { runAsyncSlice } from './async'
import { publicationSlice } from './publication'
import {
  BillingConfigurationError,
  BillingAccountMissingError,
  billingCheckout,
  billingPortal,
  billingReconcile,
  billingWebhook,
} from '../payments/handlers'
import { evaluateChallenges } from './evaluate-challenges'
import { operationApi } from './environment'
import type { OperationEnv, DispatchEnvelope, OperationInput, OperationResponse } from './types'
export type { OperationEnv } from './types'

// These are operation endpoints, not a client-facing API. Every write begins
// with Fóir's signed dispatch token; no endpoint accepts a user bearer alone.
import {
  requireScopedToken,
  ScopedTokenError,
  readDispatch,
  OperationPayloadError,
} from '@foir/sdk/server'
import { update_capture_tags } from './edit-capture-tags'
import { saveCatch } from './save-catch'
import { saveCatchSlice } from './capture-save'
import { checkCapture } from './capture-check'
import { CaptureRefusal } from './capture-contract'
import {finalize_capture,save_appearance_preferences,suggest_cat_appearance} from './appearance-handlers'
import * as social from './social'
import { profile_counts, tidyFollowersSlice } from './people'
import * as art from './art'
import { claim_premium } from './premium'
import { setup_status } from './setup-status'
import manifest from './manifest'
import { setUserBlock, reportContent, reviewContent } from './safety-handlers'
import { notificationHandlers } from './notification-handlers'
import { socialNotification } from './social-notifications'
import * as notificationSave from './generated/foir.op.save_notification_settings.generated'
import * as notificationReminder from './generated/foir.op.streak_reminders.generated'
import * as notificationCampaign from './generated/foir.op.notification_campaign.generated'
const notifications = notificationHandlers({ save: notificationSave, reminder: notificationReminder, campaign: notificationCampaign })

const routes = {
  finalize_capture,
  save_appearance_preferences,
  suggest_cat_appearance,
  'save-catch': saveCatch,
  update_capture_tags,
  save_profile: social.save_profile,
  like_capture: social.like_capture,
  follow_cat: social.follow_cat,
  follow_user: social.follow_user,
  profile_counts,
  add_field_note: social.add_field_note,
  share_capture: social.share_capture,
  post_my_catches: social.post_my_catches,
  make_catch_art: art.make_catch_art,
  preview_art: art.preview_art,
  claim_premium,
  setup_status,
}
const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { 'cache-control': 'no-store' } })
async function verify(request: Request, env: OperationEnv) {
  if (!env.FOIR_PROJECT_ID || !env.FOIR_TENANT_ID)
    throw new Error(
      'Configure the operation project and tenant before serving requests.',
    )
  const apiUrl = operationApi(env.FOIR_API_ORIGIN)
  const verified = await requireScopedToken(request, {
    expectedProjectId: env.FOIR_PROJECT_ID,
    expectedTenantId: env.FOIR_TENANT_ID,
    jwksUrl: `${apiUrl}/.well-known/jwks.json`,
  })
  return { ...verified, apiUrl, filesOrigin: env.FOIR_FILES_ORIGIN }
}
/** Preserve intentional capture refusals without exposing unexpected failures. */
export function captureRefusalResponse(error: unknown): Response | null {
  return error instanceof CaptureRefusal
    ? json({ ok: false, error: error.message }, error.status)
    : null
}
/** A terminal capture refusal must finish the platform's asynchronous run. */
export async function captureSliceResult(work: () => Promise<OperationResponse | Response>): Promise<OperationResponse | Response> {
  try { return await work() }
  catch (error) {
    if (error instanceof CaptureRefusal)
      return { status: error.status, body: { ok: false, error: error.message } }
    throw error
  }
}
export async function operationFetch(
  request: Request,
  env: OperationEnv,
): Promise<Response | null> {
  const url = new URL(request.url)
  if (request.method === 'GET' && url.pathname === '/_foir/apps/tilly.json') {
    // Controlled host migration: preserve the install and its vault credentials.
    // Only this manifest redirects; signed operation dispatch stays untouched.
    if (env.TILLY_CANONICAL_ORIGIN && env.TILLY_CANONICAL_ORIGIN !== url.origin) {
      const canonical = new URL(env.TILLY_CANONICAL_ORIGIN)
      if (canonical.protocol !== 'https:' || canonical.origin !== env.TILLY_CANONICAL_ORIGIN)
        return json({ error: 'Invalid canonical operation origin.' }, 503)
      return new Response(null, { status: 307, headers: { location: `${canonical.origin}/_foir/apps/tilly.json`, 'cache-control': 'no-store' } })
    }
    return json(manifest(url.origin))
  }
  if (url.pathname === '/inbound/stripe') {
    if (request.method !== 'POST')
      return new Response(null, { status: 405, headers: { allow: 'POST' } })
    try {
      return await (request.headers.has('X-RevenueCat-Webhook-Signature') ? revenueCatWebhook : billingWebhook)(request, {
        projectId: env.FOIR_PROJECT_ID,
        tenantId: env.FOIR_TENANT_ID,
        apiUrl: env.FOIR_API_ORIGIN,
      })
    } catch (error) {
      console.error('Tilly billing delivery refused', {
        reason: billingFailureReason(error),
      })
      return json(
        { error: 'Billing delivery refused' },
        error instanceof ScopedTokenError ||
          error instanceof BillingDeliveryRefused
          ? error.status
          : 503,
      )
    }
  }
  if (!url.pathname.startsWith('/operations/')) return null
  const key = url.pathname.slice('/operations/'.length)
  const billing =
    key === 'web_checkout' || key === 'web_portal' || key === 'reconcile_stripe' || key === 'reconcile_revenuecat'
  const notificationRoute = ['save_notification_settings', 'streak_reminders', 'notification_campaign', 'social_notification'].includes(key)
  const safetyRoute = ['set_user_block', 'report_content', 'review_content'].includes(key)
  const challengeRoute = key === 'evaluate_challenges'
  const checkRoute = key === 'check_capture'
  const tidyRoute = key === 'tidy_followers'
  const announcementRoute = key === 'challenge_announcements'
  if (!isRoute(key) && !billing && !notificationRoute && !safetyRoute && !challengeRoute && !checkRoute && !tidyRoute && !announcementRoute) return json({ error: 'Not found' }, 404)
  if (request.method !== 'POST')
    return new Response(null, { status: 405, headers: { allow: 'POST' } })
  try {
    const ingress = await verify(request, env)
    const envelope = await readDispatch<OperationInput>(request)
    requireInstalledDispatch(key, envelope.operationKey)
    if (key === 'claim_premium' && envelope.operationKey !== 'tilly.claim-premium')
      return json({error: 'Premium verification requires its installed operation dispatch.'}, 403)
    if (key === 'setup_status' && envelope.operationKey !== 'tilly.setup-status')
      return json({error: 'Setup status requires its installed operation dispatch.'}, 403)
    if (announcementRoute) {
      if (envelope.operationKey !== key || !envelope.callback) return json({error: 'An asynchronous challenge announcement dispatch is required.'}, 403)
      return await runAsyncSlice(envelope, ingress.apiUrl, () => challengeAnnouncementHandler(announcementGenerated)(envelope, ingress))
    }
    if (challengeRoute) {
      if (!envelope.callback) return json({error: 'Challenge evaluation requires asynchronous platform dispatch.'}, 400)
      return await runAsyncSlice(envelope, ingress.apiUrl, () => evaluateChallenges(envelope, ingress))
    }
    if (tidyRoute) {
      if (envelope.operationKey !== 'tidy_followers' || !envelope.callback) return json({ error: 'An asynchronous tidy dispatch is required.' }, 403)
      return await runAsyncSlice(envelope, ingress.apiUrl, () => tidyFollowersSlice(envelope, ingress))
    }
    if (checkRoute) {
      if (!envelope.callback) return json({error: 'Capture checks require asynchronous native hook dispatch.'}, 400)
      return await runAsyncSlice(envelope, ingress.apiUrl, () => checkCapture(envelope, ingress))
    }
    if (key === 'social_notification') {
      if (envelope.operationKey !== 'social_notification' || !envelope.callback)
        return json({error:'An asynchronous native social hook dispatch is required.'},403)
      return await runAsyncSlice(envelope, ingress.apiUrl, () => socialNotification(envelope, ingress))
    }
    if (key === 'set_user_block' || key === 'report_content') {
      const out = await (key === 'set_user_block' ? setUserBlock : reportContent)({ ...envelope.input }, envelope, ingress)
      return json(out.body, out.status)
    }
    if (key === 'review_content') return await runAsyncSlice(envelope, ingress.apiUrl, () => reviewContent({ ...envelope.input }, envelope, ingress))
    if (key === 'save_notification_settings') {
      const out = await notifications.save({ ...envelope.input }, ingress)
      return json(out.body, out.status)
    }
    if (key === 'streak_reminders' || key === 'notification_campaign') {
      if (!envelope.callback) return json({ error: 'An asynchronous notification dispatch is required.' }, 403)
      return await runAsyncSlice(envelope, ingress.apiUrl, () => notifications.slice(
        key === 'streak_reminders' ? 'reminder' : 'campaign', envelope, ingress,
      ))
    }
    if (key === 'web_portal')
      return json(await billingPortal(ingress, envelope.executionId))
    if (key === 'web_checkout') {
      const work = async () => ({
        status: 200,
        body: await billingCheckout(ingress),
      })
      return envelope.callback
        ? await runAsyncSlice(envelope, ingress.apiUrl, work)
        : json((await work()).body)
    }
    if (key === 'reconcile_revenuecat') {
      if (envelope.operationKey !== 'tilly.reconcile-revenuecat' || ingress.userId || !envelope.callback)
        return json({error: 'RevenueCat reconciliation requires asynchronous install dispatch.'}, 403)
      return await runAsyncSlice(envelope, ingress.apiUrl, () => reconcileRevenueCatDelivery(
        ingress, envelope.input, envelope.continuation?.cursor,
      ))
    }
    if (key === 'reconcile_stripe') {
      if (ingress.userId || !envelope.callback)
        return json(
          { error: 'Reconciliation requires asynchronous install dispatch.' },
          403,
        )
      return await runAsyncSlice(envelope, ingress.apiUrl, () =>
        billingReconcile(
          ingress,
          envelope.input ?? {},
          envelope.continuation?.cursor,
        ),
      )
    }
    if (!isRoute(key)) return json({ error: 'Not found' }, 404)
    if (key === 'suggest_cat_appearance') {
      if (!envelope.callback) return json({error:'Appearance suggestions require asynchronous native hook dispatch.'},400)
      return await runAsyncSlice(envelope,ingress.apiUrl,async()=>{
        try { return await suggest_cat_appearance(envelope.input,envelope,ingress) }
        catch (error) {
          console.warn('Tilly appearance refused',{kind:error instanceof Error?error.name:'unknown',reason:billingFailureReason(error)})
          return {status:409,body:{ok:false,error:'The appearance suggestion could not finish. Check again later.'}}
        }
      })
    }
    if (key === 'save-catch' && envelope.callback)
      return await runAsyncSlice(envelope, ingress.apiUrl, () => captureSliceResult(() => saveCatchSlice(envelope.input, envelope, ingress)))
    if (key === 'save_profile' || key === 'post_my_catches' || key === 'share_capture')
      return await runAsyncSlice(envelope, ingress.apiUrl, () => publicationSlice(key, envelope.input ?? {}, envelope, ingress))
    if (key === 'make_catch_art' || key === 'preview_art') {
      if (!envelope.callback)
        return json(
          { error: 'Art requires asynchronous platform dispatch.' },
          400,
        )
      return await runAsyncSlice(envelope, ingress.apiUrl, async () => {
        try {
          return await routes[key](envelope.input ?? {}, envelope, ingress)
        } catch {
          return {
            status: 500,
            body: {
              ok: false,
              error: 'Art could not finish. Please try again.',
            },
          }
        }
      })
    }
    const out = await routes[key](envelope.input ?? {}, envelope, ingress)
    return json(out.body, out.status)
  } catch (error) {
    const captureRefusal = captureRefusalResponse(error)
    if (captureRefusal) return captureRefusal
    if (error instanceof InstalledDispatchRefusal)
      return json({error:'Operation dispatch refused'},403)
    if (error instanceof BillingAccountMissingError)
      return json({ ok: false, error: error.message }, 409)
    if (error instanceof BillingConfigurationError)
      return json({ ok: false, error: error.message }, 503)
    if (error instanceof OperationPayloadError)
      return json({ error: error.message }, 400)
    if (error instanceof ScopedTokenError)
      return json({ error: 'Operation dispatch refused' }, error.status)
    console.error('Tilly operation failed', {
      operation: key,
      reason: billingFailureReason(error),
    })
    return json(
      { ok: false, error: 'Operation failed. Check the execution in Fóir.' },
      500,
    )
  }
}
function isRoute(key: string): key is keyof typeof routes {
  return Object.hasOwn(routes, key)
}
