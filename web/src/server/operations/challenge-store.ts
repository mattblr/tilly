import type {QueryClient} from './types'
import {createOwned} from './social'
import {challengeDigest, ChallengeRefusal, type ChallengeEvaluation, type PhotoChallenge} from './challenge-contract'

export const evaluationFields='_id _ownerId challengeKey challengeVersion captureId fileId revision criteriaDigest modelVersion status outcome attemptCount retryCount runId evaluatedAt reasonCode'
export interface ChallengeAwardRow {
  _id:string;_ownerId:string;challengeKey:string;challengeVersion:string;criteriaDigest:string;title:string
  progress:number;targetCount:number;active:boolean;earnedAt:string|null
}
export const awardFields='_id _ownerId challengeKey challengeVersion criteriaDigest title progress targetCount active earnedAt'
/** Bounded native pagination: a partial result is never interpreted as absence. */
export async function challengeRows<T>(foir:QueryClient,field:string,node:string,where:string,types:string,vars:Record<string,unknown>,limit=2000):Promise<T[]> {
  const rows:T[]=[],seen=new Set<string>();let after:string|null=null
  do {
    const result:Record<string,{edges:{node:T}[];pageInfo:{hasNextPage:boolean;endCursor:string|null}}>=await foir.raw(
      `query ChallengeRows($after: String${types?', '+types:''}) { ${field}(first: 100, after: $after${where?', where: '+where:''}) { edges { node { ${node} } } pageInfo { hasNextPage endCursor } } }`,{...vars,after})
    const page=result[field]
    if(!page||!Array.isArray(page.edges)||!page.pageInfo||typeof page.pageInfo.hasNextPage!=='boolean')throw new ChallengeRefusal(503,'Challenge data is incomplete.')
    rows.push(...page.edges.map(edge=>edge.node));if(rows.length>limit)throw new ChallengeRefusal(503,'Challenge data exceeds its safe bound.')
    if(!page.pageInfo.hasNextPage)break
    const next=page.pageInfo.endCursor;if(!next||seen.has(next))throw new ChallengeRefusal(503,'Challenge pagination did not advance.')
    seen.add(next);after=next
  }while(after)
  return rows
}
export async function challengeCatalog(foir:QueryClient) {
  return challengeRows<PhotoChallenge>(foir,'photoChallenges','_naturalKey title description badgeFileId enabled startsAt endsAt criteriaVersion criteria highlightKey targetCount modelVersion','','',{},32)
}
export async function evaluationByKey(foir:QueryClient,owner:string,key:string) {
  const rows=await challengeRows<ChallengeEvaluation>(foir,'challengeEvaluations',evaluationFields,'{ownerId: {eq: $owner}, naturalKey: {eq: $key}}','$owner: ID, $key: String',{owner,key},1)
  if(rows.some(row=>row._ownerId!==owner))throw new ChallengeRefusal(403,'This challenge attempt belongs to another account.')
  return rows[0]??null
}
export async function ownEvaluations(foir:QueryClient,owner:string,where:string,types:string,vars:Record<string,unknown>) {
  const rows=await challengeRows<ChallengeEvaluation>(foir,'challengeEvaluations',evaluationFields,`{ownerId: {eq: $owner}, ${where}}`,`$owner: ID, ${types}`,{owner,...vars})
  if(rows.some(row=>row._ownerId!==owner))throw new ChallengeRefusal(403,'Challenge evidence belongs to another account.')
  return rows
}
export async function createEvaluation(foir:QueryClient,owner:string,key:string,input:Record<string,unknown>) {
  await createOwned(foir,'ChallengeEvaluation',{naturalKey:key,...input},owner,key)
  const row=await evaluationByKey(foir,owner,key)
  if(!row)throw new ChallengeRefusal(503,'The challenge attempt could not be saved.')
  return row
}
/** CAS the native status/attempt/retry/run identity before any provider request.
 * No lease expiry resets ambiguous paid work. A crashed evaluating row stays in
 * recovery for reconciliation rather than quietly buying the same call again. */
export async function updateEvaluation(foir:QueryClient,row:ChallengeEvaluation,fields:Record<string,unknown>) {
  const result=await foir.raw<{updateChallengeEvaluation:{record:{_id:string}|null}}>(
    `mutation ChallengeEvaluationCAS($id: ID, $owner: ID, $status: String, $attempt: Int, $retry: Int, $data: ChallengeEvaluationUpdateInput!) {
      updateChallengeEvaluation(where: {id: {eq: $id}, ownerId: {eq: $owner}, status: {eq: $status}, attemptCount: {eq: $attempt}, retryCount: {eq: $retry}}, data: $data) { record { _id } }
    }`,{id:row._id,owner:row._ownerId,status:row.status,attempt:row.attemptCount,retry:row.retryCount,data:Object.fromEntries(Object.entries(fields).map(([key,value])=>[key,value===null?{setNull:true}:{set:value}]))})
  return !!result.updateChallengeEvaluation?.record
}
export async function awardByDigest(foir:QueryClient,owner:string,digest:string) {
  const rows=await challengeRows<ChallengeAwardRow>(foir,'challengeAwards',awardFields,'{ownerId: {eq: $owner}, naturalKey: {eq: $key}}','$owner: ID, $key: String',{owner,key:`award-${await challengeDigest([owner,digest])}`},1)
  if(rows.some(row=>row._ownerId!==owner||row.criteriaDigest!==digest))throw new ChallengeRefusal(503,'Challenge award identity changed.')
  return rows[0]??null
}
export async function writeAward(foir:QueryClient,owner:string,digest:string,challenge:Pick<PhotoChallenge,'_naturalKey'|'criteriaVersion'|'title'|'badgeFileId'|'targetCount'>,progress:number,old:ChallengeAwardRow|null,now:Date) {
  const active=progress>=challenge.targetCount,earnedAt=old?.earnedAt??(active?now.toISOString():null)
  if(!old){
    await createOwned(foir,'ChallengeAward',{naturalKey:`award-${await challengeDigest([owner,digest])}`,challengeKey:challenge._naturalKey,challengeVersion:challenge.criteriaVersion,criteriaDigest:digest,
      // The badge picture is kept as it was when the badge was earned.
      title:challenge.title,...(challenge.badgeFileId?{badge:challenge.badgeFileId}:{}),progress,targetCount:challenge.targetCount,active,...(earnedAt?{earnedAt}:{})},owner,`award-${await challengeDigest([owner,digest])}`)
    return false // Re-read after either a new create or an idempotency replay.
  }
  if(old.progress===progress&&old.active===active)return true
  const result=await foir.raw<{updateChallengeAward:{record:{_id:string}|null}}>(
    'mutation ChallengeAwardCAS($id: ID, $owner: ID, $progress: Int, $active: Boolean, $data: ChallengeAwardUpdateInput!) { updateChallengeAward(where: {id: {eq: $id}, ownerId: {eq: $owner}, progress: {eq: $progress}, active: {eq: $active}}, data: $data) { record { _id } } }',
    {id:old._id,owner,progress:old.progress,active:old.active,data:{progress:{set:progress},active:{set:active},...(earnedAt?{earnedAt:{set:earnedAt}}:{})}})
  return !!result.updateChallengeAward?.record
}
