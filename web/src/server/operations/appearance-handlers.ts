import {operationCredential} from './credentials'
import { createFoirClient } from '@foir/sdk/data'
import type { OperationPayload } from '@foir/sdk/server'
import { all, createOwned } from './social'
import { canonicalCapture } from './tagged-captures'
import { FinalizationRefusal } from './capture-finalization-contract'
import { finalizeCapture, finalizationReceipt, finalizedRequest } from './capture-finalization'
import { appearanceAnswers, appearanceCacheKey, appearanceConsentVersion, appearancePromptVersion, type AppearanceTag } from './appearance-contract'
import { requireAppearanceAccess } from './appearance-policy'
import { appearanceModel, suggestAppearance } from './appearance-provider'
import { readAppearancePhoto } from './appearance-photo'
import {recordAppearanceEvidence} from './appearance-evidence'
import {continueRun} from '@foir/sdk/server'
import { publicationHeld, withContentSafety } from './content-safety'
import { operationApi } from './environment'
import * as finalizeGenerated from './generated/foir.op.finalize_capture.generated'
import * as preferenceGenerated from './generated/foir.op.save_appearance_preferences.generated'
import * as appearanceGenerated from './generated/foir.op.tilly.suggest-cat-appearance.generated'
import type { DispatchEnvelope, OperationIngress, OperationInput, QueryClient, GeneratedOperation } from './types'

const ID = /^[a-z0-9]{10,40}$/
export async function saveAppearancePreferences(foir: QueryClient, input: Record<string, unknown>, owner: string | null) {
  if (!owner || !ID.test(owner)) throw new FinalizationRefusal('Sign in to save your appearance preferences.')
  if (Object.keys(input).some(key => !['enabled','consentVersion'].includes(key)) || typeof input.enabled !== 'boolean' ||
    (input.enabled && input.consentVersion !== appearanceConsentVersion)) throw new FinalizationRefusal('Accept the current photo-analysis disclosure first.')
  const existing = await all<{_id:string;_ownerId:string}>(foir,{field:'appearanceAccounts',where:'{ownerId: {eq: $owner}}',types:'$owner: ID',vars:{owner},node:'_id _ownerId'})
  if (existing.length > 1 || existing.some(row=>row._ownerId!==owner)) throw new FinalizationRefusal('These appearance preferences are unavailable.')
  const fields = {enabled:input.enabled,...(input.enabled?{consentVersion:appearanceConsentVersion,consentedAt:new Date().toISOString()}:{})}
  if (!existing[0]) await createOwned(foir,'AppearanceAccount',fields,owner,`appearance-preferences-${owner}`)
  else await foir.raw('mutation AppearancePreferences($id: ID, $data: AppearanceAccountUpdateInput!) { updateAppearanceAccount(where: {id: {eq: $id}}, data: $data) { record { _id } } }',
    {id:existing[0]._id,data:Object.fromEntries(Object.entries(fields).map(([key,value])=>[key,{set:value}]))})
  return {ok:true}
}
interface AppearanceRow {_id:string;_ownerId:string;photoKey:string;fileId:string;cacheKey:string;revision:string;status:string;runId:string|null;result:unknown}
const rowFields = '_id _ownerId photoKey fileId cacheKey revision status runId result'
/** A native hook is the only admission path. The private receipt verifies the
 * source execution without granting access to anyone's execution history. */
export async function appearanceFromHook(foir: QueryClient, envelope: OperationPayload, owner: string | null,
  provider: {enabled:boolean;apiKey?:string;filesOrigin?:string;stage?:(stage:string)=>void}) {
  provider.stage?.('admission')
  if (envelope.operationKey!=='tilly.suggest-cat-appearance') throw new FinalizationRefusal('The native appearance operation is required.')
  const event = await finalizedRequest(foir,envelope,owner,'appearance')
  const actor = owner!
  const check = async () => {
    const source = await canonicalCapture(foir,event.captureId)
    const receipt = await finalizationReceipt(foir,actor,event.captureId)
    if (!source || source._ownerId!==actor || source.state!=='ready' || source.tagRevision!==event.revision ||
      !receipt || receipt.phase!=='finalized' || receipt.runId!==event.sourceExecutionId || !receipt.appearanceRequested ||
      receipt.fileId!==source.fileId || receipt.revision!==source.tagRevision) throw new FinalizationRefusal('This finalized photo is no longer available for analysis.')
    const settings=(await foir.raw<{appSettings:{appearanceEligibility:string|null}|null}>(
      'query AppearanceSettings { appSettings(naturalKey: "app") { appearanceEligibility } }')).appSettings
    const preferences=await all<{enabled:boolean;consentVersion:string|null}>(foir,{field:'appearanceAccounts',where:'{ownerId: {eq: $owner}}',types:'$owner: ID',vars:{owner:actor},node:'enabled consentVersion'})
    if (preferences.length!==1 || !preferences[0].enabled || preferences[0].consentVersion!==appearanceConsentVersion)
      throw new FinalizationRefusal('Appearance suggestions are switched off for this account.')
    const grants=await all<{_ownerId:string|null;until:string|null}>(foir,{field:'premiumGrants',where:'{ownerId: {eq: $owner}}',types:'$owner: ID',vars:{owner:actor},node:'_ownerId until'})
    requireAppearanceAccess(actor,settings?.appearanceEligibility??null,grants,new Date())
    if (await publicationHeld(foir,'CapturePhoto',source._id,source.fileId)) throw new FinalizationRefusal('This photo is waiting for review.')
    return source
  }
  provider.stage?.('current-access')
  const source=await check()
  provider.stage?.('tags')
  const rows=await all<{_ownerId:string;tagKey:string;catKey:string;bounds:AppearanceTag['bounds']}>(foir,{
    field:'captureCatTags',where:'{photoKey: {eq: $photo}, revision: {eq: $revision}, active: {eq: true}}',
    types:'$photo: String, $revision: String',vars:{photo:source._id,revision:source.tagRevision},node:'_ownerId tagKey catKey bounds',
  })
  if (rows.some(tag=>tag._ownerId!==actor)) throw new FinalizationRefusal('The tagged cats could not be checked.')
  const tags=rows.map(tag=>({key:tag.tagKey,catId:tag.catKey,...(tag.bounds?{bounds:tag.bounds}:{})})).sort((a,b)=>a.key.localeCompare(b.key))
  const cacheKey=await appearanceCacheKey({ownerId:actor,fileId:source.fileId,tags,modelVersion:appearanceModel})
  const find=async()=>{
    const matches=await all<AppearanceRow>(foir,{field:'catAppearances',where:'{ownerId: {eq: $owner}, cacheKey: {eq: $cache}}',
      types:'$owner: ID, $cache: String',vars:{owner:actor,cache:cacheKey},node:rowFields})
    if (matches.length>1 || matches.some(row=>row._ownerId!==actor || row.fileId!==source.fileId || row.photoKey!==source._id))
      throw new FinalizationRefusal('The saved appearance attempt is unavailable.')
    return matches[0]
  }
  provider.stage?.('private-attempt')
  let job=await find()
  if (!job) {
    await createOwned(foir,'CatAppearance',{photoKey:source._id,fileId:source.fileId,cacheKey,revision:source.tagRevision,status:'reserved',
      modelVersion:appearanceModel,promptVersion:appearancePromptVersion,consentVersion:appearanceConsentVersion},actor,`appearance-${cacheKey}`)
    job=await find()
  }
  if (!job) throw new FinalizationRefusal('The appearance attempt could not be saved.')
  if (job.status==='ready') {
    return recordAppearanceEvidence(foir,envelope,source.fileId,tags,job.result)
  }
  if (job.status!=='reserved') return {ok:true,id:job._id,state:job.status==='generating'?'pending':'recovery'}
  provider.stage?.('private-jpeg')
  const image=await readAppearancePhoto(foir,source._id,source.fileId,provider.filesOrigin)
  provider.stage?.('prepared')
  // Separate, explicit paid-purpose configuration is required. The moderation
  // secret is never reused. A dry configuration leaves the claim unspent and
  // performs no image transmission; native quota still meters an admitted run.
  if (!provider.enabled || !provider.apiKey) return {ok:true,id:job._id,state:'not_configured',prepared:true}
  const claimed=await foir.raw<{updateCatAppearance:{record:{_id:string}|null}}>(
    'mutation ClaimAppearance($id: ID, $cache: String, $data: CatAppearanceUpdateInput!) { updateCatAppearance(where: {id: {eq: $id}, cacheKey: {eq: $cache}, status: {eq: "reserved"}}, data: $data) { record { _id } } }',
    {id:job._id,cache:cacheKey,data:{status:{set:'generating'},runId:{set:envelope.executionId}}})
  if (!claimed.updateCatAppearance.record) return {ok:true,id:job._id,state:'pending'}
  try {
    await check()
    const answer=await suggestAppearance({apiKey:provider.apiKey,image,tags})
    await check()
    const stored=await foir.raw<{updateCatAppearance:{record:{_id:string}|null}}>(
      'mutation FinishAppearance($id: ID, $run: String, $data: CatAppearanceUpdateInput!) { updateCatAppearance(where: {id: {eq: $id}, status: {eq: "generating"}, runId: {eq: $run}}, data: $data) { record { _id } } }',
      {id:job._id,run:envelope.executionId,data:{status:{set:'ready'},result:{set:{answer,tags:tags.map(tag=>({key:tag.key,catId:tag.catId}))}}}})
    if (!stored.updateCatAppearance.record) throw new FinalizationRefusal('The appearance result could not be saved.')
    return continueRun({cursor:JSON.stringify({v:2,index:0})})
  } catch {
    // An ambiguous request is never reset to reserved by a retry button.
    await foir.raw('mutation RecoverAppearance($id: ID, $run: String, $data: CatAppearanceUpdateInput!) { updateCatAppearance(where: {id: {eq: $id}, status: {eq: "generating"}, runId: {eq: $run}}, data: $data) { record { _id } } }',
      {id:job._id,run:envelope.executionId,data:{status:{set:'recovery'}}}).catch(()=>{})
    throw new FinalizationRefusal('The appearance suggestion could not finish. Check again later.')
  }
}
const client=(ingress:OperationIngress,generated:GeneratedOperation)=>
  withContentSafety(createFoirClient({apiUrl:operationApi(ingress.apiUrl),dispatch:ingress.dispatch,generated}),ingress)
export async function finalize_capture(input:OperationInput,envelope:DispatchEnvelope,ingress:OperationIngress) {
  return {status:200,body:await finalizeCapture(client(ingress,finalizeGenerated),{...input},ingress.userId??null,envelope.executionId)}
}
export async function save_appearance_preferences(input:OperationInput,_envelope:DispatchEnvelope,ingress:OperationIngress) {
  return {status:200,body:await saveAppearancePreferences(client(ingress,preferenceGenerated),{...input},ingress.userId??null)}
}
export async function suggest_cat_appearance(_input:OperationInput,envelope:DispatchEnvelope,ingress:OperationIngress) {
  console.info('Tilly appearance admission',{trigger:envelope.trigger.type,hasOwner:!!ingress.userId,subjectMatches:envelope.context.userId===ingress.userId})
  const apiKey=await operationCredential(ingress,'appearanceOpenAI')
  const result=await appearanceFromHook(client(ingress,appearanceGenerated),{...envelope,input:{...envelope.input}},ingress.userId??null,
    {enabled:true,apiKey,filesOrigin:ingress.filesOrigin,
      stage:stage=>console.info('Tilly appearance stage',{stage})})
  return result instanceof Response?result:{status:200,body:result}
}
