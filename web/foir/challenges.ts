import { defineModel } from '@foir/cli/configs'

const ledgerConfig = { publishing: false, versioning: false, cacheControl: {scope: 'NO_CACHE' as const} }
const privateOwner = {ownerPlane: 'user' as const, defaultVisibility: 'private' as const}
/** A published revision is a competition contract. Change criteriaVersion when
 * changing criteria, dates, threshold or model; never reuse a version to rewrite
 * already-earned evidence. Operators can disable new evaluations immediately. */
export const photoChallenge = defineModel({
  key: 'photo-challenge', name: 'Photo challenge', pluralName: 'Photo challenges',
  access: {ownerPlane: 'project', defaultVisibility: 'public'},
  config: {...ledgerConfig, publishing: true, versioning: true},
  fields: [
    {key:'title',type:'text',label:'Challenge title',required:true},
    {key:'description',type:'text',label:'What to photograph',required:true},
    {key:'icon',type:'text',label:'Badge icon',required:true,config:{translatable:false}},
    {key:'enabled',type:'boolean',label:'Allow automatic evaluation',required:true},
    {key:'startsAt',type:'date',label:'Starts at (inclusive UTC)',required:true},
    {key:'endsAt',type:'date',label:'Ends at (exclusive UTC)',required:true},
    {key:'criteriaVersion',type:'text',label:'Immutable challenge rules version',required:true,config:{translatable:false}},
    {key:'criteria',type:'text',label:'Visible qualification criteria for the AI',required:true,config:{translatable:false}},
    {key:'highlightKey',type:'text',label:'Published post highlight key',required:true,config:{translatable:false}},
    {key:'targetCount',type:'integer',label:'Distinct qualifying captures needed for badge',required:true},
    {key:'modelVersion',type:'text',label:'Approved evaluation model',required:true,config:{translatable:false}},
  ],
})
export const challengeEvaluation = defineModel({
  key:'challenge-evaluation',name:'Private challenge evaluation',pluralName:'Challenge evaluations',access:privateOwner,config:ledgerConfig,
  fields:[
    {key:'challengeKey',type:'text',label:'Published challenge',required:true,queryable:true},
    {key:'challengeVersion',type:'text',label:'Published rules version',required:true,queryable:true},
    {key:'captureId',type:'text',label:'Canonical capture',required:true,queryable:true},
    {key:'fileId',type:'text',label:'Immutable photo file',required:true},
    {key:'revision',type:'text',label:'Capture revision at evaluation',required:true},
    {key:'criteriaDigest',type:'text',label:'Exact rules digest',required:true,queryable:true},
    {key:'modelVersion',type:'text',label:'Approved model',required:true,config:{translatable:false}},
    {key:'status',type:'text',label:'reserved, evaluating, qualified, not-qualified, unavailable, recovery or removed',required:true,queryable:true},
    {key:'outcome',type:'text',label:'Immutable qualified or not-qualified provider result'},
    {key:'attemptCount',type:'integer',label:'Paid attempts reserved',required:true},
    {key:'retryCount',type:'integer',label:'Explicit preparation retries used',required:true},
    {key:'runId',type:'text',label:'Winning operation execution'},
    {key:'evaluatedAt',type:'date',label:'Evaluation completed'},
    {key:'reasonCode',type:'text',label:'Bounded result category'},
  ],
})
export const challengeAward = defineModel({
  key:'challenge-award',name:'Private earned challenge badge',pluralName:'Earned challenge badges',access:privateOwner,config:ledgerConfig,
  fields:[
    {key:'challengeKey',type:'text',label:'Published challenge',required:true,queryable:true},
    {key:'challengeVersion',type:'text',label:'Published rules version',required:true,queryable:true},
    {key:'criteriaDigest',type:'text',label:'Exact rules digest',required:true},
    {key:'title',type:'text',label:'Badge title at award',required:true},
    {key:'icon',type:'text',label:'Badge icon at award',required:true,config:{translatable:false}},
    {key:'progress',type:'integer',label:'Distinct qualifying captures',required:true},
    {key:'targetCount',type:'integer',label:'Required captures',required:true},
    {key:'active',type:'boolean',label:'Qualification remains valid',required:true},
    {key:'earnedAt',type:'date',label:'First earned at'},
  ],
})
export const challengeModels = [photoChallenge, challengeEvaluation, challengeAward]
export const challengeClientModels = ['photo-challenge','challenge-evaluation','challenge-award']
export const challengeReadGrants = challengeClientModels.map(key=>`records:read:${key}`)
export const challengeEditorGrants = ['records:read.all:photo-challenge','records:create:photo-challenge','records:write.all:photo-challenge','records:publish.all:photo-challenge','drafts:read']
export const challengeOperationGrants = ['project:stand','records:read:photo-challenge','records:read:capture-photo','records:write:capture-photo','records:read:moderation-case',
  ...['challenge-evaluation','challenge-award'].flatMap(key=>[`records:read:${key}`,`records:create:${key}`,`records:attribute:${key}`,`records:write:${key}`])]
export const challengeInputSchema = {type:'object',additionalProperties:false,required:['captureId','revision'],properties:{
  captureId:{type:'string',pattern:'^[a-z0-9]{10,40}$'},revision:{type:'string',minLength:1,maxLength:80,pattern:'^[a-zA-Z0-9-]+$'},
  retry:{type:'boolean'},
}}
export const challengeOutputSchema = {type:'object',properties:{ok:{type:'boolean'},state:{type:'string'},results:{type:'array',items:{type:'object',properties:{challengeKey:{type:'string'},status:{type:'string'},progress:{type:'integer'},targetCount:{type:'integer'},awarded:{type:'boolean'}}}}}}
