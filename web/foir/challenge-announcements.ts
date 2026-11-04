import { type ApplyConfigInput } from '@foir/cli/configs'

export const challengeAnnouncementGrants = ['project:stand', 'records:read:photo-challenge',
  'records:read.all:notification-settings', 'notifications:write.named']
export const challengeAnnouncementPreviewGrants = ['project:stand', 'records:read:photo-challenge', 'records:read.all:notification-settings']
export function challengeAnnouncementOperations(origin: string): NonNullable<ApplyConfigInput['operations']> {
  return [{ key: 'challenge_announcements', name: 'Announce newly active photo challenges',
    endpoint: `${origin}/operations/challenge_announcements`, mode: 'async', callbackTtlSeconds: 3600,
    retryPolicy: { maxRetries: 3 }, grants: challengeAnnouncementGrants,
    inputSchema: { type: 'object', additionalProperties: false, properties: { dryRun: { type: 'boolean' } } },
    outputSchema: { type: 'object', properties: { ok: { type: 'boolean' }, eligible: { type: 'integer' }, dryRun: { type: 'boolean' } } } },
    { key: 'challenge_announcements_preview', name: 'Preview active challenge invitation audience',
      endpoint: `${origin}/operations/challenge_announcements_preview`, mode: 'async', callbackTtlSeconds: 3600,
      retryPolicy: { maxRetries: 1 }, grants: challengeAnnouncementPreviewGrants,
      inputSchema: { type: 'object', additionalProperties: false, properties: {} },
      outputSchema: { type: 'object', properties: { ok: { type: 'boolean' }, eligible: { type: 'integer' }, dryRun: { type: 'boolean' } } } }]
}
/** Minute-resolution activation; the handler rechecks the exact UTC window.
 * This stays disabled until isolated actorless native recipient sends are proven.
 * It does not activate any older social hook, campaign or reminder schedule. */
export const challengeAnnouncementSchedule: NonNullable<ApplyConfigInput['schedules']>[number] = {
  key: 'challenge-start-announcements', name: 'Announce active photo challenges',
  operationKey: 'challenge_announcements', cron: '* * * * *', timezone: 'UTC', enabled: false,
}

/** Safe out-of-band scheduled verification; this operation has no send/write grants. */
export const challengeAnnouncementPreviewSchedule: NonNullable<ApplyConfigInput['schedules']>[number] = {
  key: 'challenge-start-announcements-preview', name: 'Preview challenge invitation audience',
  operationKey: 'challenge_announcements_preview', cron: '* * * * *', timezone: 'UTC', enabled: false,
}
