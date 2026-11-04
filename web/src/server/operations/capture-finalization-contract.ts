import type { OperationPayload } from '@foir/sdk/server'
const ID = /^[a-z0-9]{10,40}$/
export function captureRequestEventSchema(purpose:'appearance'|'artwork') {
  return {type:'object',required:['recordId','modelKey'],properties:{recordId:{type:'string'},modelKey:{type:'string',const:`${purpose}-request`}}} as const
}
export function captureRequestEvent(envelope:Pick<OperationPayload,'trigger'|'input'|'context'>,owner:string|null,purpose:'appearance'|'artwork') {
  if(envelope.trigger.type!=='lifecycle'||!owner||envelope.context.userId!==owner||
    envelope.input.modelKey!==`${purpose}-request`||typeof envelope.input.recordId!=='string'||!ID.test(envelope.input.recordId))
    throw new FinalizationRefusal('A native finalized-capture request hook is required.')
  return envelope.input.recordId
}
export const captureFinalizationResultSchema = {
  type: 'object', additionalProperties: false,
  required: ['ok', 'captureId', 'revision', 'timeZone', 'appearanceRequested', 'artworkRequested'],
  properties: { ok: { type: 'boolean' }, captureId: { type: 'string' }, revision: { type: 'string' },
    timeZone: { type: 'string' }, appearanceRequested: { type: 'boolean' }, artworkRequested: { type: 'boolean' } },
} as const
export class FinalizationRefusal extends Error {}
