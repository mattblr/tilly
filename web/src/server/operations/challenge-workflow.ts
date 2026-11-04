import type {QueryClient} from './types'
import {canonicalCapture} from './tagged-captures'
import {safetyStore} from './content-safety'
import {readAppearancePhoto} from './appearance-photo'
import {evaluateChallengePhoto} from './challenge-provider'
import {ChallengeRefusal, challengeAnswer, challengeCriteriaDigest, challengeEvidenceKey, challengeProgress, captureInChallenge,
  maxCaptureChallenges, photoChallenge, type ChallengeAnswer, type ChallengeEvaluation, type PhotoChallenge} from './challenge-contract'
import {awardByDigest, challengeCatalog, challengeRows, createEvaluation, evaluationByKey, ownEvaluations, updateEvaluation, writeAward} from './challenge-store'

export type ChallengeCursor={v:1;afterChallengeKey:string}
export function challengeCursor(value:string|undefined):ChallengeCursor|undefined {
  if(value===undefined)return undefined
  let row:ChallengeCursor
  try {row=JSON.parse(value)}catch {throw new ChallengeRefusal(400,'Invalid challenge continuation.')}
  if(!row||row.v!==1||typeof row.afterChallengeKey!=='string'||!/^[a-z][a-z0-9-]{0,39}$/.test(row.afterChallengeKey)||Object.keys(row).sort().join(',')!=='afterChallengeKey,v')
    throw new ChallengeRefusal(400,'Invalid challenge continuation.')
  return row
}
export interface ChallengeProvider {
  enabled:boolean;apiKey?:string;filesOrigin?:string
  /** Optional injections are local test seams; runtime uses the bounded adapters. */
  readPhoto?:typeof readAppearancePhoto
  evaluate?:(input:{apiKey:string;image:Uint8Array;challenge:PhotoChallenge})=>Promise<ChallengeAnswer>
}
export interface ChallengeResult {challengeKey:string;status:string;progress:number;targetCount:number;awarded:boolean}
export interface ChallengeWorkflowResult { [key:string]:unknown;ok:true;state:string;results:ChallengeResult[];nextCursor?:ChallengeCursor}
const inputKeys=['captureId','revision','retry']
function checkedInput(raw:Record<string,unknown>) {
  if(Object.keys(raw).some(key=>!inputKeys.includes(key))||typeof raw.captureId!=='string'||!/^[a-z0-9]{10,40}$/.test(raw.captureId)||
    typeof raw.revision!=='string'||!/^[a-zA-Z0-9-]{1,80}$/.test(raw.revision)||
    (raw.retry!==undefined&&typeof raw.retry!=='boolean'))throw new ChallengeRefusal(400,'This challenge request is invalid.')
  return {captureId:raw.captureId,revision:raw.revision,retry:raw.retry===true}
}
async function checkedCapture(foir:QueryClient,owner:string,id:string,revision?:string) {
  const capture=await canonicalCapture(foir,id)
  if(!capture||capture._ownerId!==owner)throw new ChallengeRefusal(403,'Only the photographer can evaluate this capture.')
  if(capture.state!=='ready'||(revision!==undefined&&capture.tagRevision!==revision))throw new ChallengeRefusal(409,'This capture changed. Reload it before checking challenges.')
  if(await safetyStore(foir,owner).holds({targetType:'CapturePhoto',targetId:capture._id,fileId:capture.fileId,text:''}))throw new ChallengeRefusal(409,'This capture is waiting for review.')
  return capture
}
interface CaptureChallengeState {_id:string;_ownerId:string;fileId:string;state:string;tagRevision:string;challengeRevision:string|null;challengeHighlights:unknown}
interface VerifiedHighlight {challengeKey:string;criteriaDigest:string;highlightKey:string}
function storedHighlights(value:unknown):VerifiedHighlight[] {
  if(value===null||value===undefined)return []
  if(!Array.isArray(value)||value.length>32||value.some(row=>!row||typeof row!=='object'||
    !/^[a-z][a-z0-9-]{0,39}$/.test(row.challengeKey)||!/^[a-f0-9]{64}$/.test(row.criteriaDigest)||!/^[a-z][a-z0-9-]{0,39}$/.test(row.highlightKey)))
    throw new ChallengeRefusal(503,'Verified challenge highlights are unavailable.')
  return value
}
async function setVerifiedHighlight(foir:QueryClient,owner:string,captureId:string,fileId:string,challenge:Pick<PhotoChallenge,'_naturalKey'|'highlightKey'>,digest:string,qualified:boolean) {
  for(let attempt=0;attempt<4;attempt++) {
    const row=(await foir.raw<{capturePhoto:CaptureChallengeState|null}>('query CaptureChallengeState($id: String) { capturePhoto(id: $id) { _id _ownerId fileId state tagRevision challengeRevision challengeHighlights } }',{id:captureId})).capturePhoto
    if(!row||row._ownerId!==owner||row.fileId!==fileId||row.state!=='ready')throw new ChallengeRefusal(409,'The challenge capture changed.')
    const old=storedHighlights(row.challengeHighlights)
    const next=old.filter(item=>item.criteriaDigest!==digest)
    if(qualified)next.push({challengeKey:challenge._naturalKey,criteriaDigest:digest,highlightKey:challenge.highlightKey})
    next.sort((a,b)=>a.criteriaDigest.localeCompare(b.criteriaDigest))
    if(JSON.stringify(old)===JSON.stringify(next))return
    const revision=crypto.randomUUID()
    const condition=row.challengeRevision===null?'challengeRevision: {isNull: true}':'challengeRevision: {eq: $previous}'
    const result=await foir.raw<{updateCapturePhoto:{record:{_id:string}|null}}>(
      `mutation CaptureChallengeCAS($id: ID, $owner: ID, $file: String, $revision: String${row.challengeRevision===null?'':', $previous: String'}, $data: CapturePhotoUpdateInput!) { updateCapturePhoto(where: {id: {eq: $id}, ownerId: {eq: $owner}, fileId: {eq: $file}, tagRevision: {eq: $revision}, state: {eq: "ready"}, ${condition}}, data: $data) { record { _id } } }`,
      {id:captureId,owner,file:fileId,revision:row.tagRevision,...(row.challengeRevision===null?{}:{previous:row.challengeRevision}),data:{challengeHighlights:{set:next},challengeRevision:{set:revision}}})
    if(result.updateCapturePhoto?.record)return
  }
  throw new ChallengeRefusal(409,'Challenge highlights changed concurrently. Check again.')
}
/** Reconciliation also removes evidence whose source was deleted, replaced or
 * held after evaluation. Batch native reads keep this bounded without fetching
 * private image bytes or running AI again. */
async function validateEvidenceSources(foir:QueryClient,owner:string,rows:ChallengeEvaluation[]) {
  const qualified=rows.filter(row=>row.status==='qualified')
  if(qualified.length>512)throw new ChallengeRefusal(503,'Challenge progress exceeds its safe bound.')
  for(let offset=0;offset<qualified.length;offset+=100){
    const slice=qualified.slice(offset,offset+100),ids=slice.map(row=>row.captureId),files=slice.map(row=>row.fileId)
    const sources=await challengeRows<{_id:string;_ownerId:string;fileId:string;state:string}>(foir,'capturePhotos','_id _ownerId fileId state',
      '{id: {in: $ids}}','$ids: [ID!]',{ids},100)
    const holds=await challengeRows<{targetId:string|null;fileId:string|null}>(foir,'moderationCases','targetId fileId',
      '{status: {eq: "hidden"}, OR: [{targetType: {eq: "CapturePhoto"}, targetId: {in: $captures}}, {fileId: {in: $files}}]}',
      '$captures: [String!], $files: [String!]',{captures:ids,files},512)
    for(const row of slice){
      const source=sources.find(source=>source._id===row.captureId)
      if(!source||source._ownerId!==owner||source.fileId!==row.fileId||source.state!=='ready'||holds.some(hold=>hold.targetId===row.captureId||hold.fileId===row.fileId)){
        if(!await updateEvaluation(foir,row,{status:'removed',reasonCode:'source_unavailable'}))throw new ChallengeRefusal(409,'Challenge evidence changed during its safety check.')
        row.status='removed';row.reasonCode='source_unavailable'
        if(source&&source._ownerId===owner&&source.fileId===row.fileId&&source.state==='ready')
          await setVerifiedHighlight(foir,owner,row.captureId,row.fileId,{_naturalKey:row.challengeKey,highlightKey:row.challengeKey},row.criteriaDigest,false)
      }
    }
  }
}
async function reconcileAward(foir:QueryClient,owner:string,challenge:Pick<PhotoChallenge,'_naturalKey'|'criteriaVersion'|'title'|'badgeFileId'|'targetCount'>,digest:string,now:Date) {
  for(let attempt=0;attempt<4;attempt++) {
    const rows=await ownEvaluations(foir,owner,'criteriaDigest: {eq: $digest}','$digest: String',{digest})
    await validateEvidenceSources(foir,owner,rows)
    const progress=challengeProgress(rows,owner,challenge as PhotoChallenge,digest)
    const old=await awardByDigest(foir,owner,digest)
    if(!await writeAward(foir,owner,digest,challenge,progress,old,now))continue
    // A correction arriving between the aggregate read and the CAS must not
    // leave a falsely active badge. Re-read the ledger before reporting success.
    const latest=await ownEvaluations(foir,owner,'criteriaDigest: {eq: $digest}','$digest: String',{digest})
    if(challengeProgress(latest,owner,challenge as PhotoChallenge,digest)===progress)return progress
  }
  throw new ChallengeRefusal(409,'Challenge progress changed concurrently. Check again.')
}
function assertEvidence(row:ChallengeEvaluation,owner:string,captureId:string,fileId:string,digest:string) {
  if(row._ownerId!==owner||row.captureId!==captureId||row.fileId!==fileId||row.criteriaDigest!==digest||
    !Number.isInteger(row.attemptCount)||row.attemptCount<0||row.attemptCount>1||!Number.isInteger(row.retryCount)||row.retryCount<0||row.retryCount>1)
    throw new ChallengeRefusal(503,'The challenge evidence identity changed.')
}
/** Internal deletion/hold reconciliation only. This is deliberately absent from
 * the operation input: users cannot manually add, remove or correct challenge
 * qualification. Call only with the owner established by verified ingress. */
export async function invalidateChallengeCapture(foir:QueryClient,owner:string,captureId:string,now=new Date(),afterDigest?:string):Promise<{nextDigest?:string}> {
  const rows=await ownEvaluations(foir,owner,'captureId: {eq: $capture}','$capture: String',{capture:captureId})
  if(rows.length===0)return {}
  const capture=await canonicalCapture(foir,captureId)
  if(capture&&capture._ownerId!==owner)throw new ChallengeRefusal(403,'Challenge evidence belongs to another account.')
  const sourceInvalid=!capture||capture.state!=='ready'||await safetyStore(foir,owner).holds({targetType:'CapturePhoto',targetId:captureId,fileId:capture.fileId,text:''})
  if(!sourceInvalid)throw new ChallengeRefusal(409,'This challenge capture remains eligible.')
  const pending=rows.filter(row=>!afterDigest||row.criteriaDigest>afterDigest).sort((a,b)=>a.criteriaDigest.localeCompare(b.criteriaDigest))
  for(const row of pending.slice(0,1)){
    if(row.status!=='removed'&&!await updateEvaluation(foir,row,{status:'removed',reasonCode:'source_unavailable'}))throw new ChallengeRefusal(409,'Challenge evidence changed during its safety check.')
    if(capture?.state==='ready'&&capture.fileId===row.fileId)
      await setVerifiedHighlight(foir,owner,captureId,row.fileId,{_naturalKey:row.challengeKey,highlightKey:row.challengeKey},row.criteriaDigest,false)
    const award=await awardByDigest(foir,owner,row.criteriaDigest)
    if(award)await reconcileAward(foir,owner,{_naturalKey:award.challengeKey,criteriaVersion:award.challengeVersion,title:award.title,badgeFileId:null,targetCount:award.targetCount},row.criteriaDigest,now)
  }
  return pending.length>1?{nextDigest:pending[0].criteriaDigest}:{}
}
/** Operator hold release restores only an already-recorded AI outcome after
 * exact source/rule revalidation. Missing legacy outcomes are never invented.
 * There is no client input for this and no extra provider call. */
export async function restoreChallengeCapture(foir:QueryClient,owner:string,captureId:string,now=new Date(),afterDigest?:string):Promise<{nextDigest?:string}> {
  const rows=await ownEvaluations(foir,owner,'captureId: {eq: $capture}','$capture: String',{capture:captureId})
  if(rows.length===0)return {}
  const capture=await canonicalCapture(foir,captureId)
  if(!capture)return {} // A released hold cannot resurrect deleted content.
  if(capture._ownerId!==owner)throw new ChallengeRefusal(403,'Challenge evidence belongs to another account.')
  if(capture.state!=='ready'||await safetyStore(foir,owner).holds({targetType:'CapturePhoto',targetId:captureId,fileId:capture.fileId,text:''}))return {}
  const catalog=(await challengeCatalog(foir)).map(photoChallenge)
  const pending=rows.filter(row=>!afterDigest||row.criteriaDigest>afterDigest).sort((a,b)=>a.criteriaDigest.localeCompare(b.criteriaDigest))
  for(const row of pending.slice(0,1)){
    if(row.status!=='removed'||row.reasonCode!=='source_unavailable'||!['qualified','not-qualified'].includes(row.outcome??'')||row.fileId!==capture.fileId)continue
    const challenge=catalog.find(rule=>rule._naturalKey===row.challengeKey&&rule.criteriaVersion===row.challengeVersion)
    if(!challenge||await challengeCriteriaDigest(challenge)!==row.criteriaDigest||Date.parse(capture._createdAt)<Date.parse(challenge.startsAt)||Date.parse(capture._createdAt)>=Date.parse(challenge.endsAt))continue
    const status=row.outcome as 'qualified'|'not-qualified'
    if(!await updateEvaluation(foir,row,{status,reasonCode:status==='qualified'?'qualified':'restored_outcome'}))throw new ChallengeRefusal(409,'Challenge evidence changed during restoration.')
    await setVerifiedHighlight(foir,owner,captureId,capture.fileId,challenge,row.criteriaDigest,status==='qualified')
    await reconcileAward(foir,owner,challenge,row.criteriaDigest,now)
  }
  return pending.length>1?{nextDigest:pending[0].criteriaDigest}:{}
}
/** One challenge per dispatch. The wrapper awaits this slice and returns the
 * signed Fóir continuation; no second queue or unobserved background promise. */
export async function evaluateCaptureChallenges(foir:QueryClient,raw:Record<string,unknown>,owner:string|null,runId:string,provider:ChallengeProvider,
  cursor?:ChallengeCursor,now=new Date()):Promise<ChallengeWorkflowResult> {
  const input=checkedInput(raw)
  if(!owner||!/^[a-z0-9]{10,40}$/.test(owner)||!runId)throw new ChallengeRefusal(401,'Sign in to check photo challenges.')
  const capture=await checkedCapture(foir,owner,input.captureId,input.revision)
  const catalog=(await challengeCatalog(foir)).map(photoChallenge).filter(challenge=>captureInChallenge(challenge,capture._createdAt,now)).sort((a,b)=>a._naturalKey.localeCompare(b._naturalKey))
  if(catalog.length>maxCaptureChallenges)throw new ChallengeRefusal(503,'Too many photo challenges overlap.')
  const available=catalog.filter(challenge=>!cursor||challenge._naturalKey>cursor.afterChallengeKey),challenge=available[0]
  if(!challenge)return {ok:true,state:'ready',results:[]}
  const digest=await challengeCriteriaDigest(challenge),key=`challenge-${await challengeEvidenceKey(owner,capture._id,capture.fileId,digest)}`
  let row=await evaluationByKey(foir,owner,key)
  if(!row)row=await createEvaluation(foir,owner,key,{challengeKey:challenge._naturalKey,challengeVersion:challenge.criteriaVersion,captureId:capture._id,fileId:capture.fileId,
    revision:capture.tagRevision,criteriaDigest:digest,modelVersion:challenge.modelVersion,status:'reserved',attemptCount:0,retryCount:0})
  assertEvidence(row,owner,capture._id,capture.fileId,digest)
  if(row.status==='unavailable'&&((row.reasonCode==='not_configured'&&provider.enabled)||(input.retry&&row.reasonCode==='preparation_failed'&&row.attemptCount===0&&row.retryCount===0))) {
    const fields={status:'reserved',reasonCode:null,...(input.retry?{retryCount:1}:{})}
    if(await updateEvaluation(foir,row,fields))row={...row,...fields,status:'reserved'}
  }
  if(row.status==='reserved') {
    if(!provider.enabled||!provider.apiKey) {
      await updateEvaluation(foir,row,{status:'unavailable',reasonCode:'not_configured'})
      row={...row,status:'unavailable',reasonCode:'not_configured'}
    } else {
      let image:Uint8Array|undefined
      try {image=await (provider.readPhoto??readAppearancePhoto)(foir,capture._id,capture.fileId,provider.filesOrigin)}
      catch {await updateEvaluation(foir,row,{status:'unavailable',reasonCode:'preparation_failed'});row={...row,status:'unavailable',reasonCode:'preparation_failed'}}
      if(image) {
        await checkedCapture(foir,owner,capture._id,input.revision)
        if(await updateEvaluation(foir,row,{status:'evaluating',attemptCount:1,runId})) {
          row={...row,status:'evaluating',attemptCount:1,runId}
          try {
            const answer=challengeAnswer(await (provider.evaluate??evaluateChallengePhoto)({apiKey:provider.apiKey,image,challenge}))
            const current=await checkedCapture(foir,owner,capture._id)
            if(current.fileId!==capture.fileId)throw new Error('The photo file changed.')
            // Re-read rules after provider work. Unpublished/disabled/changed
            // criteria cannot award from a stale in-flight response.
            const currentRule=(await challengeCatalog(foir)).map(photoChallenge).find(item=>item._naturalKey===challenge._naturalKey)
            if(!currentRule||!currentRule.enabled||await challengeCriteriaDigest(currentRule)!==digest)throw new Error('Challenge rules changed.')
            const status=answer.qualified?'qualified':'not-qualified'
            if(!await updateEvaluation(foir,row,{status,outcome:status,evaluatedAt:now.toISOString(),reasonCode:answer.reasonCode,revision:current.tagRevision}))throw new Error('Challenge attempt changed.')
            row={...row,status,outcome:status,reasonCode:answer.reasonCode,revision:current.tagRevision}
          } catch {
            await updateEvaluation(foir,row,{status:'recovery',reasonCode:'ambiguous_provider_result'})
            row={...row,status:'recovery',reasonCode:'ambiguous_provider_result'}
          }
        } else row=(await evaluationByKey(foir,owner,key))!
      }
    }
  }
  assertEvidence(row,owner,capture._id,capture.fileId,digest)
  // A correction may have raced the provider. Always re-read the winning row
  // before exposing its highlight or computing a badge.
  row=(await evaluationByKey(foir,owner,key))!
  assertEvidence(row,owner,capture._id,capture.fileId,digest)
  for(let attempt=0;attempt<4;attempt++){
    await setVerifiedHighlight(foir,owner,capture._id,capture.fileId,challenge,digest,row.status==='qualified')
    const latest=(await evaluationByKey(foir,owner,key))!
    assertEvidence(latest,owner,capture._id,capture.fileId,digest)
    if(latest.status===row.status)break
    row=latest
    if(attempt===3)throw new ChallengeRefusal(409,'Challenge evidence changed concurrently. Check again.')
  }
  const progress=await reconcileAward(foir,owner,challenge,digest,now)
  const result={challengeKey:challenge._naturalKey,status:row.status,progress,targetCount:challenge.targetCount,awarded:progress>=challenge.targetCount}
  return {ok:true,state:row.status==='evaluating'?'pending':row.status==='unavailable'||row.status==='recovery'?'unavailable':'ready',results:[result],
    ...(available.length>1?{nextCursor:{v:1 as const,afterChallengeKey:challenge._naturalKey}}:{})}
}
