import { defineModel, type ApplyConfigInput } from '@foir/cli/configs'

export const notificationSettings = defineModel({
  key: 'notification-settings', name: 'Notification settings', pluralName: 'Notification settings',
  description: 'Private notification selection intent, local reminder clock and server-derived streak context. Fóir category preferences still gate delivery.',
  fields: [
    { key: 'timeZone', type: 'text', label: 'Reminder time zone', required: true },
    { key: 'reminderHour', type: 'integer', label: 'Local reminder hour', required: true },
    ...['artReady', 'streakReminders', 'communityUpdates'].map(key => ({ key, type: 'boolean' as const, label: key, queryable: true })),
    { key: 'currentStreak', type: 'integer', label: 'Current streak snapshot', queryable: true },
    { key: 'bestStreak', type: 'integer', label: 'Best streak snapshot', queryable: true },
    { key: 'streakDay', type: 'text', label: 'Streak snapshot local date', queryable: true },
  ], access: { ownerPlane: 'user', defaultVisibility: 'private' }, config: { publishing: false, versioning: false, singleton: true },
})
export const notificationClientGrants = ['notifications:read', 'notifications:write', 'operations:execute:save_notification_settings']
const settings = ['records:read:notification-settings', 'records:write:notification-settings']
const jobGrants = ['project:stand', 'records:read.all:notification-settings', 'records:write.all:notification-settings', 'records:read.all:capture-photo', 'notifications:write.named']
export function notificationOperations(origin: string): NonNullable<ApplyConfigInput['operations']> {
  return [
    { key: 'save_notification_settings', name: 'Save notification settings', endpoint: `${origin}/operations/save_notification_settings`, mode: 'sync',
      grants: ['project:stand', ...settings, 'records:create:notification-settings', 'records:attribute:notification-settings'],
      inputSchema: { type: 'object', additionalProperties: false, required: ['timeZone', 'reminderHour', 'artReady', 'streakReminders', 'communityUpdates'], properties: {
        timeZone: { type: 'string', minLength: 1, maxLength: 100 }, reminderHour: { type: 'integer', minimum: 0, maximum: 23 },
        artReady: { type: 'boolean' }, streakReminders: { type: 'boolean' }, communityUpdates: { type: 'boolean' },
      } }, outputSchema: { type: 'object', properties: { ok: { type: 'boolean' } } } },
    { key: 'streak_reminders', name: 'Remind opted-in active streaks', endpoint: `${origin}/operations/streak_reminders`, mode: 'async',
      grants: [...jobGrants, 'records:read:ui-copy'],
      inputSchema: { type: 'object', additionalProperties: false, properties: { dryRun: { type: 'boolean' } } },
      outputSchema: { type: 'object', properties: { ok: { type: 'boolean' }, eligible: { type: 'integer' }, dryRun: { type: 'boolean' } } } },
    { key: 'notification_campaign', name: 'Send an opted-in community notification', endpoint: `${origin}/operations/notification_campaign`, mode: 'async',
      grants: jobGrants,
      inputSchema: { type: 'object', additionalProperties: false, required: ['title', 'message', 'destination', 'minimumStreak', 'dryRun', 'campaignKey'], properties: {
        title: { type: 'string', minLength: 1, maxLength: 100 }, message: { type: 'string', minLength: 1, maxLength: 500 },
        destination: { type: 'string', enum: ['feed', 'capture', 'account'] }, minimumStreak: { type: 'integer', minimum: 0, maximum: 3650 },
        dryRun: { type: 'boolean' }, campaignKey: { type: 'string', pattern: '^[a-zA-Z0-9-]{8,64}$' },
      } }, outputSchema: { type: 'object', properties: { ok: { type: 'boolean' }, eligible: { type: 'integer' }, dryRun: { type: 'boolean' } } } },
  ]
}
// Request-time targeting snapshots, not stored recipient lists or entitlements.
export const streakContext: NonNullable<ApplyConfigInput['contextDimensions']> = [
  { key: 'streakContext', name: 'Streak context', sourceType: 'model', sourceModelKey: 'notification-settings' },
  ...[1, 7, 14].map(days => ({ key: `streak_${days}`, name: `${days}+ day streak`, sourceType: 'segment', evaluationRules: {
    type: 'condition', left: { type: 'field', path: 'user.currentStreak' }, operator: 'greater_than_equals', right: { type: 'literal', value: days },
  } })),
]
