import {test} from 'node:test'
import assert from 'node:assert/strict'
import {reviewContent} from './safety-handlers.ts'
import {challengeCriteriaDigest} from './challenge-contract.ts'
const owner='fixtureowner00001',captureId='fixturecapture001',fileId='fixturephotofile1'
const challenge={_naturalKey:'postbox',title:'Postbox',description:'Cat and postbox',badgeFileId:null,enabled:true,startsAt:'2026-11-01T00:00:00Z',endsAt:'2026-11-06T00:00:00Z',criteriaVersion:'v1',criteria:'Cat and postbox visible.',highlightKey:'postbox',targetCount:1,modelVersion:'gpt-6-luna'}
const digest=await challengeCriteriaDigest(challenge)
const page=rows=>({edges:rows.map(node=>({node:structuredClone(node)})),pageInfo:{hasNextPage:false,endCursor:null}})
function fixture({missingSource=false,wrongOwner=false,refuseWrite=false}={}){
 let holdStatus='hidden'
 const capture={_id:captureId,_createdAt:'2026-11-02T12:00:00Z',_ownerId:wrongOwner?'foreignowner0001':owner,fileId,state:'ready',tagRevision:'r1',challengeRevision:'existing',challengeHighlights:[{challengeKey:'postbox',criteriaDigest:digest,highlightKey:'postbox'}]}
 const evaluation={_id:'evaluation000001',_ownerId:owner,challengeKey:'postbox',challengeVersion:'v1',captureId,fileId,revision:'r1',criteriaDigest:digest,modelVersion:'gpt-6-luna',status:'qualified',outcome:'qualified',attemptCount:1,retryCount:0,runId:'run1',evaluatedAt:null,reasonCode:'qualified'}
 const award={_id:'awardfixture0001',_ownerId:owner,challengeKey:'postbox',challengeVersion:'v1',criteriaDigest:digest,title:'Postbox',progress:1,targetCount:1,active:true,earnedAt:'2026-11-02T00:00:00Z'}
 const actions=[]
 const fetch=async(url,options)=>{
  assert.equal(new URL(url).origin,'https://api.example.test')
  const {query,variables:v={}}=JSON.parse(options.body)
  if(!query)return Response.json({errors:[{message:'PersistedQueryNotFound',extensions:{code:'PERSISTED_QUERY_NOT_FOUND'}}]})
  let data
  if(query.includes('ReviewItem'))data={moderationCase:{_id:'casefixture00001',_ownerId:owner,targetType:'CapturePhoto',targetId:captureId,status:holdStatus,fileId}}
  else if(query.includes('HeldTarget')||query.includes('CanonicalCapture')||query.includes('CaptureChallengeState'))data={capturePhoto:missingSource?null:structuredClone(capture)}
  else if(query.includes('HideReviewedFile')){actions.push('narrowFile');data={setFileVisibility:'PRIVATE'}}
  else if(query.includes('ChallengeRows')){
   if(query.includes('photoChallenges('))data={photoChallenges:page([challenge])}
   else if(query.includes('challengeEvaluations('))data={challengeEvaluations:page([evaluation])}
   else if(query.includes('challengeAwards('))data={challengeAwards:page([award])}
   else if(query.includes('capturePhotos('))data={capturePhotos:page(missingSource?[]:[capture])}
   else if(query.includes('moderationCases('))data={moderationCases:page(holdStatus==='hidden'?[{targetId:captureId,fileId}]:[])}
   else throw Error(query)
  }
  else if(query.includes('SafetyRows'))data={page:{edges:holdStatus==='hidden'?[{node:{_id:'casefixture00001'}}]:[]}}
  else if(query.includes('ChallengeEvaluationCAS')){
   if(refuseWrite)return Response.json({errors:[{message:'Fixture ledger write refused'}]})
   assert.equal(v.owner,owner);for(const[key,value]of Object.entries(v.data))evaluation[key]=value.set
   actions.push('invalidateEvidence');data={updateChallengeEvaluation:{record:{_id:evaluation._id}}}
  }
  else if(query.includes('CaptureChallengeCAS')){assert.equal(v.owner,owner);for(const[key,value]of Object.entries(v.data))capture[key]=value.set;actions.push('removeHighlight');data={updateCapturePhoto:{record:{_id:captureId}}}}
  else if(query.includes('ChallengeAwardCAS')){assert.equal(v.owner,owner);for(const[key,value]of Object.entries(v.data))award[key]=value.set;actions.push('revokeAward');data={updateChallengeAward:{record:{_id:award._id}}}}
  else throw Error(query)
  return Response.json({data})
 }
 return {fetch,evaluation,award,capture,actions,release(){holdStatus='released'}}
}
const run=(action='hide')=>reviewContent({id:'casefixture00001',queue:'check',action,reason:'Synthetic hold'},
 {executionId:'fixtureexecution01',callback:{},continuation:{cursor:JSON.stringify({phase:action==='hide'?'ChallengeAwards':'ChallengeRestore'})}},
 {userId:null,apiUrl:'https://api.example.test',dispatch:{token:()=> 'fixture-dispatch',context:'operation=review_content'}})
test('operator hold continuation removes private qualification/highlight/badge after narrowing file',async()=>{
 const f=fixture(),original=globalThis.fetch
 try{globalThis.fetch=f.fetch;const result=await run();assert.ok(result instanceof Response);assert.equal((await result.json()).cursor,JSON.stringify({phase:'CapturePost'}))
  assert.equal(f.evaluation.status,'removed');assert.equal(f.award.active,false);assert.equal(f.award.progress,0);assert.equal(f.capture.challengeHighlights.length,0)
  assert.deepEqual(f.actions,['narrowFile','invalidateEvidence','removeHighlight','revokeAward'])
 }finally{globalThis.fetch=original}
})
test('missing source retains persisted original-owner identity for private award revocation',async()=>{
 const f=fixture({missingSource:true}),original=globalThis.fetch
 try{globalThis.fetch=f.fetch;await run();assert.equal(f.award.active,false);assert.equal(f.evaluation.status,'removed');assert.ok(!f.actions.includes('removeHighlight'))}
 finally{globalThis.fetch=original}
})
test('owner mismatch and ledger refusal fail closed without reporting completed review',async()=>{
 const original=globalThis.fetch
 try{for(const options of [{wrongOwner:true},{refuseWrite:true}]){const f=fixture(options);globalThis.fetch=f.fetch;await assert.rejects(run());assert.equal(f.award.active,true);assert.equal(f.evaluation.status,'qualified');assert.equal(f.actions[0],'narrowFile')}}
 finally{globalThis.fetch=original}
})

test('operator release restores prior outcome and private badge without a new provider attempt',async()=>{
 const f=fixture(),original=globalThis.fetch
 try{globalThis.fetch=f.fetch;await run();assert.equal(f.award.active,false);assert.equal(f.evaluation.outcome,'qualified')
 f.release();const restored=await run('release');assert.equal(restored.body.ok,true);assert.equal(f.evaluation.status,'qualified');assert.equal(f.award.active,true);assert.equal(f.capture.challengeHighlights.length,1);assert.equal(f.evaluation.attemptCount,1)
 }finally{globalThis.fetch=original}
})
