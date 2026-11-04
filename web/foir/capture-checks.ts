import { defineModel, type ApplyConfigInput } from '@foir/cli/configs'

/** After a catch is saved and shared, its checks run in the background: the
 * photo's moderation check, then its photo challenges. The save writes one
 * private request record owned by the user; Fóir's record hook starts the
 * installed check operation as that user. Nothing here is client-writable.
 */
export const captureCheckModels = [
  defineModel({
    key: 'capture-check', name: 'Private capture check request', pluralName: 'Capture check requests',
    access: { ownerPlane: 'user', defaultVisibility: 'private' },
    config: { publishing: false, versioning: false, cacheControl: { scope: 'NO_CACHE' } },
    fields: [
      { key: 'photoKey', type: 'text', label: 'Saved capture', required: true, queryable: true },
      { key: 'fileId', type: 'text', label: 'Immutable source file', required: true },
      { key: 'revision', type: 'text', label: 'Saved tag revision', required: true },
      { key: 'audience', type: 'text', label: 'Audience when saved', required: true },
      { key: 'sourceExecutionId', type: 'text', label: 'Saving execution', required: true },
    ],
  }),
]

/** Always active: a shared catch is only moderated by this hook. */
export const captureCheckHooks: NonNullable<ApplyConfigInput['hooks']> = [
  { key: 'capture-check-requested', name: 'Check a saved catch: moderation, then photo challenges', event: 'RECORD_CREATED',
    filter: { modelKey: 'capture-check' }, operationKey: 'tilly.check-capture', isActive: true },
]

export const captureCheckEventSchema = {
  type: 'object', required: ['recordId', 'modelKey'],
  properties: { recordId: { type: 'string' }, modelKey: { type: 'string', const: 'capture-check' } },
} as const
