import { defineModel, type ApplyConfigInput, type FieldDefinitionInput } from '@foir/cli/configs'
import { captureRequestEventSchema, captureFinalizationResultSchema } from '../src/server/operations/capture-finalization-contract.ts'

/** Root-composed consent and owned-request scope. No direct client agent grant:
 * eligibility must remain enforced when regular switches to Premium in Fóir.
 */
export const appearanceSettingFields: FieldDefinitionInput[] = [
  { key: 'appearanceEligibility', type: 'text', label: 'Appearance access: regular or premium', config: { translatable: false } },
]
const config = { publishing: false, versioning: false, cacheControl: { scope: 'NO_CACHE' as const } }
const access = { ownerPlane: 'user' as const, defaultVisibility: 'private' as const }
export const appearanceModels = [
  defineModel({key:'appearance-vote',name:'Public cat appearance evidence',pluralName:'Public cat appearance votes',
    access:{ownerPlane:'project',defaultVisibility:'public'},config,
    fields:[{key:'catKey',type:'text',label:'Cat',required:true,queryable:true},
      {key:'dimension',type:'text',label:'Breed, pattern or observation count',required:true,queryable:true}]}),
  defineModel({key:'appearance-observation',name:'Private cat appearance evidence',pluralName:'Cat appearance observations',
    access:{ownerPlane:'project',defaultVisibility:'private'},config,
    fields:[{key:'catKey',type:'text',label:'Verified cat',required:true,queryable:true},
      {key:'sourceKey',type:'text',label:'Unique immutable source digest',required:true},
      {key:'answer',type:'json',label:'Validated appearance observation',required:true}]}),
  ...(['appearance','artwork'] as const).map(purpose=>defineModel({key:`${purpose}-request`,name:`Private ${purpose} request`,pluralName:`${purpose} requests`,access,config,
    fields:[
      {key:'photoKey',type:'text',label:'Finalized capture',required:true},
      {key:'fileId',type:'text',label:'Immutable source file',required:true},
      {key:'revision',type:'text',label:'Finalized tag revision',required:true},
      {key:'finalizationId',type:'text',label:'Private finalization receipt',required:true},
      {key:'sourceExecutionId',type:'text',label:'Winning finalization execution',required:true},
      {key:'timeZone',type:'text',label:'Finalized time zone',required:true},
    ]})),
  defineModel({ key: 'appearance-account', name: 'Appearance preferences', pluralName: 'Appearance accounts', access, config: {...config, singleton: true},
    fields: [
      { key: 'enabled', type: 'boolean', label: 'Suggest appearances after finalizing a saved photo', required: true },
      { key: 'consentVersion', type: 'text', label: 'Accepted analysis disclosure' },
      { key: 'consentedAt', type: 'date', label: 'Consent recorded at' },
    ] }),
  defineModel({ key: 'cat-appearance', name: 'Cat appearance suggestion', pluralName: 'Cat appearance suggestions', access, config,
    fields: [
      { key: 'photoKey', type: 'text', label: 'Canonical capture', required: true, queryable: true },
      { key: 'fileId', type: 'text', label: 'Immutable source file', required: true },
      { key: 'cacheKey', type: 'text', label: 'Verified input digest', required: true, queryable: true },
      { key: 'revision', type: 'text', label: 'Canonical tag revision', required: true },
      { key: 'status', type: 'text', label: 'Analysis state', required: true, queryable: true },
      { key: 'runId', type: 'text', label: 'Execution identity' },
      { key: 'modelVersion', type: 'text', label: 'Model version', required: true },
      { key: 'promptVersion', type: 'text', label: 'Instruction version', required: true },
      { key: 'consentVersion', type: 'text', label: 'Disclosure version', required: true },
      { key: 'result', type: 'json', label: 'Private structured suggestions' },
    ] }),
  defineModel({ key: 'capture-finalization', name: 'Capture finalization', pluralName: 'Capture finalizations', access, config,
    fields: [
      {key:'photoKey',type:'text',label:'Canonical capture',required:true,queryable:true},
      {key:'fileId',type:'text',label:'Immutable source file',required:true},
      {key:'revision',type:'text',label:'Finalized cat revision',required:true},
      {key:'phase',type:'text',label:'Finalization state',required:true,queryable:true},
      {key:'runId',type:'text',label:'Winning finalization execution'},
      {key:'timeZone',type:'text',label:'Capture time zone',required:true},
      {key:'finalizedAt',type:'date',label:'Finalized at'},
      {key:'appearanceRequested',type:'boolean',label:'Consented analysis requested',required:true},
      {key:'artworkRequested',type:'boolean',label:'Premium artwork requested',required:true},
    ] }),
]
const keeps = (key: string) => [`records:read:${key}`, `records:create:${key}`, `records:attribute:${key}`, `records:write:${key}`]
// Existing records:read ceilings plus allowedModels expose only owned results.
// Publishable keys cannot declare model-qualified records:read permissions.
export const appearanceClientGrants = ['operations:execute:save_appearance_preferences', 'operations:execute:finalize_capture']
export const appearanceEditorGrants = ['records:read:app-settings', 'records:write:app-settings']
export function appearanceOperations(origin: string): NonNullable<ApplyConfigInput['operations']> {
  return [
    {key:'finalize_capture',name:'Finish a saved capture after its note or skip',endpoint:`${origin}/operations/finalize_capture`,mode:'sync',
      grants:['project:stand',...keeps('capture-finalization'),'records:read:capture-photo','records:read:cat','records:read:appearance-account',
        ...['appearance-request','artwork-request'].flatMap(key=>[`records:create:${key}`,`records:attribute:${key}`]),
        'records:read:app-settings','records:read:premium-grant','records:read:moderation-case'],
      inputSchema:{type:'object',additionalProperties:false,required:['captureId','timeZone'],properties:{captureId:{type:'string'},timeZone:{type:'string'}}},
      outputSchema:captureFinalizationResultSchema},
    { key: 'save_appearance_preferences', name: 'Save my appearance preferences', endpoint: `${origin}/operations/save_appearance_preferences`,
      mode: 'sync', grants: ['project:stand', ...keeps('appearance-account')],
      inputSchema: { type: 'object', additionalProperties: false, required: ['enabled'], properties: {
        enabled: { type: 'boolean' }, consentVersion: { type: 'string' },
      } }, outputSchema: { type: 'object', properties: { ok: { type: 'boolean' } } } },

  ]
}
export const captureFinalizationHooks: NonNullable<ApplyConfigInput['hooks']> = [
  // Operation-completed delivery currently loses the initiating user. Private
  // request records carry their owner in verified native dispatch instead.
  {key:'appearance-requested',name:'Suggest appearances for a finalized private request',event:'RECORD_CREATED',
    filter:{modelKey:'appearance-request'},operationKey:'tilly.suggest-cat-appearance',isActive:true},
  {key:'artwork-requested',name:'Draw Premium art for a finalized private request',event:'RECORD_CREATED',
    filter:{modelKey:'artwork-request'},operationKey:'tilly.make-catch-art',isActive:true},
]
