import {test} from 'node:test'
import assert from 'node:assert/strict'
import {photoChallenge,captureInChallenge,challengeCriteriaDigest,challengeAnswer,challengeProgress,challengeModel} from './challenge-contract.ts'
import {challengeCursor,evaluateCaptureChallenges,invalidateChallengeCapture,restoreChallengeCapture} from './challenge-workflow.ts'
import {evaluateChallengePhoto} from './challenge-provider.ts'
import {framedJpeg} from './appearance-photo.fixture.mjs'
const owner='fixtureactor00001',captureId='fixturecapture001',fileId='fixturephotofile1'
const now=new Date('2026-11-03T12:00:00Z')
const challenge={_naturalKey:'postbox-week',title:'Postbox cats',description:'Find a cat near a postbox.',icon:'postbox',enabled:true,startsAt:'2026-11-01T00:00:00Z',endsAt:'2026-11-06T00:00:00Z',criteriaVersion:'v1',criteria:'A real cat and a postbox are clearly visible.',highlightKey:'postbox',targetCount:1,modelVersion:challengeModel}
const positive={qualified:true,catVisible:true,reasonCode:'qualified'}
const connection=rows=>({edges:rows.map(node=>({node:structuredClone(node)})),pageInfo:{hasNextPage:false,endCursor:null}})
function fixture(){
 const capture={_id:captureId,_ownerId:owner,_createdAt:'2026-11-02T12:00:00Z',fileId,tagRevision:'revision-1',state:'ready',challengeRevision:null,challengeHighlights:[]}
 const evaluations=[],awards=[],catalog=[structuredClone(challenge)]
 let reads=0,calls=0,preparationFails=false,providerFails=false,held=false,beforeAnswer=null
 const foir={async raw(query,vars={}){
   if(query.includes('query CanonicalCapture')||query.includes('query CaptureChallengeState'))return {capturePhoto:structuredClone(capture)}
   if(query.includes('query SafetyRows'))return {page:{edges:held?[{node:{_id:'hold'}}]:[]}}
   if(query.includes('query ChallengeRows')){
     if(query.includes('photoChallenges('))return {photoChallenges:connection(catalog)}
     if(query.includes('capturePhotos('))return {capturePhotos:connection(vars.ids.includes(capture._id)?[capture]:[])}
     if(query.includes('moderationCases('))return {moderationCases:connection(held?[{targetId:capture._id,fileId:capture.fileId}]:[])}
     const field=query.includes('challengeEvaluations(')?'challengeEvaluations':'challengeAwards'
     let rows=field==='challengeEvaluations'?evaluations:awards
     rows=rows.filter(row=>(!vars.owner||row._ownerId===vars.owner)&&(!vars.key||row._naturalKey===vars.key)&&(!vars.digest||row.criteriaDigest===vars.digest)&&(!vars.capture||row.captureId===vars.capture)&&(!vars.challenge||row.challengeKey===vars.challenge))
     return {[field]:connection(rows)}
   }
   if(query.includes('mutation C(')){
     const isEvaluation=query.includes('CreateChallengeEvaluationInput'),rows=isEvaluation?evaluations:awards,field=isEvaluation?'createChallengeEvaluation':'createChallengeAward'
     let row=rows.find(row=>row._naturalKey===vars.input.naturalKey&&row._ownerId===vars.owner)
     if(!row){row={runId:null,evaluatedAt:null,reasonCode:null,earnedAt:null,...structuredClone(vars.input),_naturalKey:vars.input.naturalKey,_id:`fixture-row-${rows.length}`, _ownerId:vars.owner};rows.push(row)}
     return {[field]:{record:{_id:row._id}}}
   }
   if(query.includes('mutation ChallengeEvaluationCAS')){
     const row=evaluations.find(row=>row._id===vars.id&&row._ownerId===vars.owner&&row.status===vars.status&&row.attemptCount===vars.attempt&&row.retryCount===vars.retry)
     if(row)for(const [key,value]of Object.entries(vars.data))row[key]=value.set
     return {updateChallengeEvaluation:{record:row?{_id:row._id}:null}}
   }
   if(query.includes('mutation ChallengeAwardCAS')){
     const row=awards.find(row=>row._id===vars.id&&row._ownerId===vars.owner&&row.progress===vars.progress&&row.active===vars.active)
     if(row)for(const[key,value]of Object.entries(vars.data))row[key]=value.set
     return {updateChallengeAward:{record:row?{_id:row._id}:null}}
   }
   if(query.includes('mutation CaptureChallengeCAS')){
     const matched=capture._id===vars.id&&capture._ownerId===vars.owner&&capture.fileId===vars.file&&capture.tagRevision===vars.revision&&capture.challengeRevision===(vars.previous??null)
     if(matched)for(const[key,value]of Object.entries(vars.data))capture[key]=value.set
     return {updateCapturePhoto:{record:matched?{_id:capture._id}:null}}
   }
   throw Error(`Unrecognized fixture query ${query}`)
 }}
 const provider={enabled:true,apiKey:'fixture-provider-key',async readPhoto(){reads++;if(preparationFails)throw Error('offline');return framedJpeg()},async evaluate(){calls++;if(beforeAnswer)await beforeAnswer();if(providerFails)throw Error('ambiguous');return positive}}
 const run=(input={},cursor)=>evaluateCaptureChallenges(foir,{captureId,revision:capture.tagRevision,...input},owner,'fixture-run',provider,cursor,now)
 return {foir,provider,run,capture,evaluations,awards,catalog,get calls(){return calls},get reads(){return reads},set preparationFails(v){preparationFails=v},set providerFails(v){providerFails=v},set held(v){held=v},set beforeAnswer(v){beforeAnswer=v}}
}
test('published rules bound UTC capture window, delayed grace, model and threshold',async()=>{
 assert.deepEqual(photoChallenge(challenge),challenge)
 assert.equal(captureInChallenge(challenge,challenge.startsAt,now),true)
 assert.equal(captureInChallenge(challenge,challenge.endsAt,new Date(challenge.endsAt)),false)
 assert.equal(captureInChallenge(challenge,'2026-11-05T23:59:59Z',new Date('2026-11-06T23:59:59Z')),true)
 assert.equal(captureInChallenge(challenge,'2026-11-05T23:59:59Z',new Date('2026-11-07T00:00:00Z')),false)
 for(const changed of [{targetCount:31},{modelVersion:'unapproved'},{startsAt:challenge.endsAt},{criteria:''},{icon:'external-url'}])assert.throws(()=>photoChallenge({...challenge,...changed}))
 assert.notEqual(await challengeCriteriaDigest(challenge),await challengeCriteriaDigest({...challenge,criteriaVersion:'v2'}))
 assert.throws(()=>challengeAnswer({...positive,catVisible:false}))
 assert.throws(()=>challengeAnswer({...positive,reasonCode:'unclear'}))
})
test('actual persistence path awards once, survives retries and invalidates a held source without resaving a catch',async()=>{
 const f=fixture(),result=await f.run()
 assert.equal(result.results[0].awarded,true);assert.equal(result.results[0].status,'qualified')
 assert.equal(f.calls,1);assert.equal(f.evaluations.length,1);assert.equal(f.awards.length,1)
 assert.equal(f.awards[0].active,true);assert.equal(f.capture.challengeHighlights[0].highlightKey,'postbox')
 await f.run();assert.equal(f.calls,1);assert.equal(f.awards[0].progress,1)
 await assert.rejects(f.run({removeChallengeKey:'postbox-week'}),/invalid/)
 f.held=true;await invalidateChallengeCapture(f.foir,owner,captureId,now)
 assert.equal(f.evaluations[0].status,'removed');assert.equal(f.awards[0].active,false);assert.equal(f.awards[0].progress,0);assert.equal(f.capture.challengeHighlights.length,0)
 f.held=false;await f.run({retry:true});assert.equal(f.calls,1);assert.equal(f.awards[0].active,false)
})
test('disabled provider never reads or sends an image and later configuration consumes only one attempt',async()=>{
 const f=fixture();f.provider.enabled=false;delete f.provider.apiKey
 const first=await f.run();assert.equal(first.state,'unavailable');assert.equal(f.reads,0);assert.equal(f.calls,0);assert.equal(f.evaluations[0].attemptCount,0)
 f.provider.enabled=true;f.provider.apiKey='fixture-provider-key';await f.run();assert.equal(f.calls,1);assert.equal(f.awards[0].active,true)
})
test('pre-request preparation allows one explicit retry; ambiguous provider result never retries',async()=>{
 const f=fixture();f.preparationFails=true;await f.run();assert.equal(f.evaluations[0].reasonCode,'preparation_failed');assert.equal(f.calls,0)
 await f.run();assert.equal(f.reads,1)
 f.preparationFails=false;await f.run({retry:true});assert.equal(f.evaluations[0].retryCount,1);assert.equal(f.calls,1)
 const failed=fixture();failed.providerFails=true;await failed.run();assert.equal(failed.evaluations[0].status,'recovery')
 failed.providerFails=false;await failed.run({retry:true});assert.equal(failed.calls,1);assert.equal(failed.awards[0].active,false)
})
test('foreign, stale, held, expired and disabled captures never enter provider',async()=>{
 const f=fixture();f.capture._ownerId='foreignactor0001';await assert.rejects(f.run(),/photographer/)
 f.capture._ownerId=owner;await assert.rejects(f.run({revision:'stale'}),/changed/)
 f.held=true;await assert.rejects(f.run(),/review/)
 f.held=false;f.catalog[0].enabled=false;assert.deepEqual((await f.run()).results,[])
 f.catalog[0].enabled=true;f.capture._createdAt='2026-10-31T23:59:59Z';assert.deepEqual((await f.run()).results,[])
 assert.equal(f.calls,0)
})
test('a source hold racing AI completion refuses the result without a stale highlight or false badge',async()=>{
 const f=fixture();f.beforeAnswer=async()=>{f.held=true}
 const result=await f.run();assert.equal(result.results[0].status,'recovery');assert.equal(f.capture.challengeHighlights.length,0);assert.equal(f.awards[0].active,false);assert.equal(f.calls,1)
})
test('changed or disabled rules during AI work refuse qualification',async()=>{
 const f=fixture();f.beforeAnswer=()=>{f.catalog[0].enabled=false};await f.run();assert.equal(f.evaluations[0].status,'recovery');assert.equal(f.awards[0].active,false)
})
test('concurrent duplicate operation executions claim only one provider attempt',async()=>{
 const f=fixture();await Promise.all([f.run(),f.run()]);assert.equal(f.calls,1);assert.equal(f.evaluations.length,1);assert.equal(f.awards.length,1)
})
test('continuations bound a dispatch to one AI request and validate cursors',async()=>{
 const f=fixture();f.catalog.push({...challenge,_naturalKey:'tree-week',highlightKey:'tree'})
 const first=await f.run();assert.equal(f.calls,1);assert.deepEqual(first.nextCursor,{v:1,afterChallengeKey:'postbox-week'})
 const second=await f.run({},first.nextCursor);assert.equal(f.calls,2);assert.equal(second.results[0].challengeKey,'tree-week');assert.equal(second.nextCursor,undefined)
 assert.deepEqual(challengeCursor(JSON.stringify(first.nextCursor)),first.nextCursor)
 for(const value of ['{}','null','{"v":2,"afterChallengeKey":"postbox-week"}','{"v":1,"afterChallengeKey":"postbox-week","owner":"x"}'])assert.throws(()=>challengeCursor(value))
})
test('progress refuses foreign or duplicate evidence rather than inflating a badge',async()=>{
 const f=fixture();await f.run();const row=f.evaluations[0],digest=row.criteriaDigest
 assert.equal(challengeProgress([row],owner,challenge,digest),1)
 assert.throws(()=>challengeProgress([row,row],owner,challenge,digest))
 assert.throws(()=>challengeProgress([{...row,_ownerId:'foreign'}],owner,challenge,digest))
})
test('hold release restores immutable AI outcome without reanalysis, but changed rules and missing legacy outcome refuse restoration',async()=>{
 const f=fixture();await f.run();const earned=f.awards[0].earnedAt;assert.equal(f.evaluations[0].outcome,'qualified')
 f.held=true;await invalidateChallengeCapture(f.foir,owner,captureId,now);assert.equal(f.awards[0].active,false);assert.equal(f.evaluations[0].outcome,'qualified')
 f.held=false;await restoreChallengeCapture(f.foir,owner,captureId,now);assert.equal(f.awards[0].active,true);assert.equal(f.awards[0].earnedAt,earned);assert.equal(f.calls,1)
 f.held=true;await invalidateChallengeCapture(f.foir,owner,captureId,now);f.held=false;f.catalog[0].criteria+=' Changed.'
 await restoreChallengeCapture(f.foir,owner,captureId,now);assert.equal(f.awards[0].active,false)
 f.catalog[0].criteria=challenge.criteria;delete f.evaluations[0].outcome
 await restoreChallengeCapture(f.foir,owner,captureId,now);assert.equal(f.awards[0].active,false);assert.equal(f.calls,1)
})
test('hold and release reconciliation slice one challenge outcome per continuation',async()=>{
 const f=fixture();f.catalog.push({...challenge,_naturalKey:'tree-week',highlightKey:'tree'})
 const first=await f.run();await f.run({},first.nextCursor);assert.equal(f.calls,2)
 f.held=true;let next=await invalidateChallengeCapture(f.foir,owner,captureId,now);assert.ok(next.nextDigest);assert.equal(f.awards.filter(row=>row.active).length,1)
 next=await invalidateChallengeCapture(f.foir,owner,captureId,now,next.nextDigest);assert.equal(next.nextDigest,undefined);assert.equal(f.awards.filter(row=>row.active).length,0)
 f.held=false;next=await restoreChallengeCapture(f.foir,owner,captureId,now);assert.ok(next.nextDigest)
 await restoreChallengeCapture(f.foir,owner,captureId,now,next.nextDigest);assert.equal(f.awards.filter(row=>row.active).length,2);assert.equal(f.calls,2)
})
test('real Responses adapter counts identical sanitized input before one bounded standard inference and never retries',async()=>{
 const original=globalThis.fetch;let calls=0,countBody
 try{
   globalThis.fetch=async(url,options)=>{
     calls++;assert.equal(options.redirect,'manual');const body=JSON.parse(options.body)
     assert.equal(options.body.includes(owner),false);assert.equal(options.body.includes(captureId),false);assert.equal(options.body.includes(fileId),false)
     if(url.endsWith('/input_tokens')){countBody=body;return Response.json({object:'response.input_tokens',input_tokens:512})}
     assert.equal(url,'https://api.openai.com/v1/responses');assert.equal(body.store,false);assert.equal(body.max_output_tokens,240);assert.equal(body.text.format.strict,true);assert.equal(body.service_tier,'default')
     for(const key of ['model','instructions','input','reasoning','text'])assert.deepEqual(body[key],countBody[key])
     return Response.json({status:'completed',service_tier:'default',usage:{input_tokens:512,output_tokens:30},output:[{type:'message',role:'assistant',content:[{type:'output_text',text:JSON.stringify(positive)}]}]})
   }
   assert.deepEqual(await evaluateChallengePhoto({apiKey:'fixture-provider-key',image:framedJpeg(),challenge}),positive);assert.equal(calls,2)
   globalThis.fetch=async()=>{calls++;return Response.json({status:'incomplete'})}
   await assert.rejects(evaluateChallengePhoto({apiKey:'fixture-provider-key',image:framedJpeg(),challenge}));assert.equal(calls,3)
 }finally{globalThis.fetch=original}
})
