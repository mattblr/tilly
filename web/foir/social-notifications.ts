import type { ApplyConfigInput } from '@foir/cli/configs'

export const socialNotificationModels = ['capture-like', 'follow-request', 'capture-post'] as const
export const socialNotificationEventSchema = {
  type: 'object', required: ['recordId', 'modelKey'],
  properties: { recordId: { type: 'string', pattern: '^[a-z0-9]{10,40}$' },
    modelKey: { type: 'string', enum: [...socialNotificationModels] }, seq: { type: 'integer' } },
}
export function socialNotificationOperations(origin: string): NonNullable<ApplyConfigInput['operations']> {
  return [{ key: 'social_notification', name: 'Notify a social activity recipient',
    endpoint: `${origin}/operations/social_notification`, mode: 'async', callbackTtlSeconds: 3600,
    retryPolicy: { maxRetries: 3 },
    quotas: { rules: [{ points: 3000, duration: 86400, scope: 'user', message: 'Social notifications have reached their daily limit.' }] },
    grants: ['project:stand', 'notifications:write.named', 'records:read.all:user-block',
      ...['capture-like', 'follow-request', 'capture-post', 'capture-photo', 'cat', 'profile', 'ui-copy'].map(model => `records:read:${model}`)],
    inputSchema: socialNotificationEventSchema,
    outputSchema: { type: 'object', properties: { ok: { type: 'boolean' }, notified: { type: 'boolean' } } },
  }]
}
/** Only persisted social-record creation triggers delivery. Cat follows remain private.
 * Integration in progress: actual native hook sends still bind recipients to
 * the firing user. Keep hooks inactive until named-recipient authority passes;
 * no broader key or platform source patch substitutes for that contract. */
export const socialNotificationHooks: NonNullable<ApplyConfigInput['hooks']> = socialNotificationModels.map(model => ({
  key: `${model}-notification`, name: `Notify after ${model} creation`, event: 'RECORD_CREATED',
  filter: { modelKey: model }, operationKey: 'social_notification',
  isActive: process.env.TILLY_SOCIAL_NOTIFICATION_HOOKS_ENABLED === 'true',
}))
