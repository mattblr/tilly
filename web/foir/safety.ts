import { challengeReviewGrants } from '../src/server/operations/safety-manifest.ts'
import { followGrants } from '../src/server/operations/audience-grants.ts'
import { defineModel, type ApplyConfigInput } from '@foir/cli/configs'
export { safetyReviewGrants } from '../src/server/operations/safety-manifest.ts'

const config = { publishing: false, versioning: false }
const owned = { ownerPlane: 'user' as const, defaultVisibility: 'private' as const }
const text = (key: string, label: string, required = true) => ({ key, label, type: 'text' as const, required, queryable: true })

export const safetyModels = [
  defineModel({ key: 'user-block', name: 'User block', pluralName: 'User blocks',
    description: 'Private creator-owned block selection. Only signed operations change it.',
    fields: [text('blockedUserId', 'Blocked account')], access: owned, config }),
  defineModel({ key: 'content-report', name: 'Content report', pluralName: 'Content reports',
    description: 'A private report; the reported account cannot read the reporter or details.',
    fields: [text('targetType', 'Content kind'), text('targetId', 'Content'), text('targetOwnerId', 'Content owner', false),
      text('reason', 'Reason'), { key: 'details', type: 'text', label: 'Details' }, text('status', 'Review status'),
      { key: 'resolution', type: 'text', label: 'Response' }], access: owned, config }),
  defineModel({ key: 'moderation-case', name: 'Moderation case', pluralName: 'Moderation cases',
    description: 'Server-authored content decision tied to exact media and text, private to its creator and authorized reviewers.',
    fields: [text('targetType', 'Content kind'), text('targetId', 'Content'), text('digest', 'Checked content digest'),
      text('fileId', 'Photo file', false), { key: 'text', type: 'text', label: 'Checked words' },
      text('status', 'Decision'), { key: 'categories', type: 'json', label: 'Flagged categories' },
      text('model', 'Moderation model', false), { key: 'reviewReason', type: 'text', label: 'Review reason' },
      text('reviewedBy', 'Reviewer', false), { key: 'reviewedAt', type: 'date', label: 'Reviewed at' }], access: owned, config }),
  defineModel({ key: 'moderation-action', name: 'Moderation action', pluralName: 'Moderation actions',
    description: 'Private operator decision history. No user can author or change it.',
    fields: [text('targetType', 'Content kind'), text('targetId', 'Content'), text('action', 'Decision'),
      text('reason', 'Reason'), text('actor', 'Operator')],
    access: { ownerPlane: 'project', defaultVisibility: 'private' }, config }),
]

const keeps = (key: string) => [`records:read:${key}`, `records:create:${key}`, `records:attribute:${key}`, `records:write:${key}`]
export const safetyModelKeys = safetyModels.map(model => model.key)
export const safetyClientGrants = ['operations:execute:set_user_block', 'operations:execute:report_content']
export { safetyPublicationGrants, safetyReadGrants, safetyInteractionGrants } from '../src/server/operations/safety-manifest.ts'
const targetReads = ['profile', 'capture-post', 'field-note', 'capture-photo'].map(model => `records:read:${model}`)
export const reviewedModels = ['profile', 'capture-post', 'field-note', 'capture-photo', 'capture-cat-tag', 'catch-art']
export function safetyOperations(origin: string): NonNullable<ApplyConfigInput['operations']> {
  return [
    { key: 'set_user_block', name: 'Block or unblock an account', mode: 'sync', endpoint: `${origin}/operations/set_user_block`,
      // Blocking ends following both ways, with the access it gave.
      grants: ['project:stand', ...keeps('user-block'), 'records:delete:user-block', 'records:read:profile', ...followGrants],
      inputSchema: { type: 'object', additionalProperties: false, required: ['userId', 'blocked'], properties: { userId: { type: 'string' }, blocked: { type: 'boolean' } } },
      outputSchema: { type: 'object', properties: { ok: { type: 'boolean' }, active: { type: 'boolean' } } } },
    { key: 'report_content', name: 'Report content for review', mode: 'sync', endpoint: `${origin}/operations/report_content`,
      grants: ['project:stand', ...targetReads, ...keeps('content-report')],
      inputSchema: { type: 'object', additionalProperties: false, required: ['targetType', 'targetId', 'reason'], properties: {
        targetType: { type: 'string', enum: ['post', 'note', 'profile'] }, targetId: { type: 'string' },
        reason: { type: 'string', enum: ['unsafe', 'harassment', 'spam', 'privacy', 'other'] }, details: { type: 'string', maxLength: 1000 },
      } }, outputSchema: { type: 'object', properties: { ok: { type: 'boolean' }, id: { type: 'string' } } } },
    { key: 'review_content', name: 'Review reported or flagged content', mode: 'async', endpoint: `${origin}/operations/review_content`,
      grants: ['project:stand', ...challengeReviewGrants, ...['content-report', 'moderation-case', ...reviewedModels].flatMap(model => [`records:read.all:${model}`, `records:write.all:${model}`]),
        'records:create:moderation-action', 'records:create:moderation-case', 'records:attribute:moderation-case', 'files:read.all', 'files:write.all'],
      inputSchema: { type: 'object', additionalProperties: false, required: ['queue', 'id', 'action', 'reason'], properties: {
        queue: { type: 'string', enum: ['report', 'check'] }, id: { type: 'string' },
        action: { type: 'string', enum: ['preview', 'dismiss', 'approve', 'hide', 'hide_photo', 'release'] }, reason: { type: 'string', maxLength: 1000 },
      } }, outputSchema: { type: 'object', properties: { ok: { type: 'boolean' }, pending: { type: 'boolean' }, preview: { type: 'object', properties: {
        text: { type: 'string' }, author: { type: 'string' }, photoUrl: { type: 'string' },
      } } } } },
  ]
}

