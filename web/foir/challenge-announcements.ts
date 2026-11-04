import { type ApplyConfigInput } from '@foir/cli/configs'

export const challengeAnnouncementGrants = ['project:stand', 'records:read:photo-challenge',
  'records:read.all:notification-settings', 'notifications:write.named']
export function challengeAnnouncementOperations(origin: string): NonNullable<ApplyConfigInput['operations']> {
  return [{ key: 'challenge_announcements', name: 'Announce newly active photo challenges',
    endpoint: `${origin}/operations/challenge_announcements`, mode: 'async', callbackTtlSeconds: 3600,
    retryPolicy: { maxRetries: 3 }, grants: challengeAnnouncementGrants,
    inputSchema: { type: 'object', additionalProperties: false, properties: { dryRun: { type: 'boolean' } } },
    outputSchema: { type: 'object', properties: { ok: { type: 'boolean' }, eligible: { type: 'integer' }, dryRun: { type: 'boolean' } } } }]
}
/** Minute-resolution activation; the handler rechecks the exact UTC window. */
export const challengeAnnouncementSchedule: NonNullable<ApplyConfigInput['schedules']>[number] = {
  key: 'challenge-start-announcements', name: 'Announce active photo challenges',
  operationKey: 'challenge_announcements', cron: '* * * * *', timezone: 'UTC', enabled: true,
}
