import test from 'node:test'
import assert from 'node:assert/strict'
import {finalizeCapture} from './capture-finalization.ts'
import {captureRequestEvent} from './capture-finalization-contract.ts'
import {appearanceFromHook,saveAppearancePreferences} from './appearance-handlers.ts'
import {appearanceConsentVersion} from './appearance-contract.ts'
import {withContentSafety} from './content-safety.ts'
import {framedJpeg,segment} from './appearance-photo.fixture.mjs'
const owner='owner0000000001',capture='capture00000001',file='file00000000001',run='finalizerun00001'
const page=rows=>({page:{edges:rows.map(node=>({node})),pageInfo:{hasNextPage:false,endCursor:null}}})
function fixture(count=1) {
  const source={_id:capture,_ownerId:owner,state:'ready',fileId:file,tagRevision:'revision-a'}
  const preferences={_id:'preferences0001',_ownerId:owner,enabled:true,consentVersion:appearanceConsentVersion}
  const settings={appearanceEnabled:true,appearanceEligibility:'regular',artworkEnabled:false}
  const tags=Array.from({length:count},(_,i)=>({_ownerId:owner,tagKey:`cat-${i}`,catKey:`cat0000000000${i}`}))
  const state={receipt:null,requests:{},job:null,held:false,grants:[],providerCalls:0,imageReads:0,failStore:false,afterProvider:()=>{}}
  const raw=async(query,vars={})=>{
    if(query.includes('query CanonicalCapture'))return{capturePhoto:vars.id===capture?structuredClone(source):null}
    if(query.includes('page: captureFinalizations'))return page(state.receipt?[structuredClone(state.receipt)]:[])
    if(query.includes('page: appearanceAccounts'))return page([structuredClone(preferences)])
    if(query.includes('page: premiumGrants'))return page(structuredClone(state.grants))
    if(query.includes('Settings'))return{appSettings:structuredClone(settings)}
    for(const type of ['AppearanceRequest','ArtworkRequest'])if(query.includes(`create${type}`)) {
      state.requests[type]??={_id:type==='AppearanceRequest'?'request00000001':'request00000002',_ownerId:vars.owner,...vars.input}
      return{[`create${type}`]:{record:{_id:state.requests[type]._id}}}
    }
    if(query.includes('query FinalizedRequest'))return{request:structuredClone(state.requests.AppearanceRequest??null)}
    if(query.includes('SafetyRows'))return page(state.held?[{_id:'hold00000000001'}]:[])
    if(query.includes('createCaptureFinalization')){
      state.receipt??={_id:'receipt00000001',_ownerId:vars.owner,...vars.input,runId:null}
      return{createCaptureFinalization:{record:{_id:state.receipt._id}}}
    }
    if(query.includes('FinalizeCaptureOnce')){
      if(state.receipt.phase!=='reserved')return{updateCaptureFinalization:{record:null}}
      for(const[k,v]of Object.entries(vars.data))state.receipt[k]=v.set
      return{updateCaptureFinalization:{record:{_id:state.receipt._id}}}
    }
    if(query.includes('AppearancePreferences')){
      assert.equal(vars.id,preferences._id)
      for(const[k,v]of Object.entries(vars.data))preferences[k]=v.set
      return{updateAppearanceAccount:{record:{_id:preferences._id}}}
    }
    if(query.includes('page: captureCatTags'))return page(structuredClone(tags))
    if(query.includes('page: catAppearances'))return page(state.job?[structuredClone(state.job)]:[])
    if(query.includes('createCatAppearance')){
      state.job??={_id:'appearance00001',_ownerId:vars.owner,...vars.input,runId:null,result:null}
      return{createCatAppearance:{record:{_id:state.job._id}}}
    }
    if(query.includes('AppearanceDerivative'))return{capturePhoto:{photo:{variants:{small:{url:`https://cdn.example.test/${file}?transform=opaque`,width:3,height:2}}}}}
    if(query.includes('ClaimAppearance')||query.includes('FinishAppearance')||query.includes('RecoverAppearance')){
      const expected=query.includes('ClaimAppearance')?'reserved':'generating'
      if(state.job.status!==expected||(vars.run&&state.job.runId!==vars.run))return{updateCatAppearance:{record:null}}
      if(state.failStore&&query.includes('FinishAppearance'))throw Error('storage result unknown')
      for(const[k,v]of Object.entries(vars.data))state.job[k]=v.set
      return{updateCatAppearance:{record:{_id:state.job._id}}}
    }
    throw Error(`Unexpected private fixture query ${query.slice(0,80)}`)
  }
  const client=withContentSafety({raw},{userId:owner,safety:{enabled:true},filesOrigin:'https://cdn.example.test'})
  const envelope=()=>({executionId:'hookrun00000001',operationKey:'tilly.suggest-cat-appearance',trigger:{type:'lifecycle'},
    context:{userId:owner,actorId:'',projectId:'project',tenantId:'tenant',timestamp:new Date().toISOString()},
    input:{recordId:'request00000001',modelKey:'appearance-request'}})
  const finalize=(execution=run)=>finalizeCapture(client,{captureId:capture,timeZone:'Europe/London'},owner,execution)
  const prepare=async()=>{await finalize();return envelope()}
  const fetch=async(url,options)=>{
    if(String(url).startsWith('https://cdn.example.test/')){state.imageReads++;return new Response(framedJpeg(segment(254,[...new TextEncoder().encode('private GPS metadata')])),{headers:{'content-type':'image/jpeg'}})}
    assert.equal(url,'https://api.openai.com/v1/responses');state.providerCalls++
    const body=JSON.parse(options.body),image=body.input[0].content[1].image_url
    assert.equal(Buffer.from(image.split(',')[1],'base64').includes(Buffer.from('private GPS')),false)
    const regions=JSON.parse(body.input[0].content[0].text).regions
    assert.equal(regions.length,count);state.afterProvider()
    return Response.json({status:'completed',output:[{type:'message',role:'assistant',content:[{type:'output_text',text:JSON.stringify({cats:regions.map(({index})=>({index,status:'unknown',possibilities:[],coatLength:'unknown',pattern:'unknown'}))})}]}]})
  }
  return{source,preferences,settings,tags,state,client,envelope,finalize,prepare,fetch}
}
const provider={enabled:true,apiKey:'synthetic-provider-value',filesOrigin:'https://cdn.example.test'}
test('concurrent finalizers emit one metered request; duplicate new executions emit neither flag',async()=>{
  const f=fixture(),results=await Promise.all([f.finalize(),f.finalize('anotherfinalize1')])
  assert.equal(results.filter(r=>r.appearanceRequested).length,1)
  assert.equal((await f.finalize('laterfinalize001')).appearanceRequested,false)
  assert.equal((await f.finalize(f.state.receipt.runId)).appearanceRequested,true)
  assert.equal(f.state.receipt._ownerId,owner);assert.equal(f.state.receipt.phase,'finalized')
  assert.equal(Object.keys(f.state.requests).length,1)
})
test('unsaved, foreign, held, opted-out and ineligible captures emit no provider request',async()=>{
  const f=fixture();f.source.state='saving';await assert.rejects(f.finalize(),/completed capture/)
  f.source.state='ready';f.source._ownerId='anotherowner001';await assert.rejects(f.finalize(),/completed capture/)
  for(const mutate of [f=>{f.state.held=true},f=>{f.preferences.enabled=false},f=>{f.settings.appearanceEligibility='premium'},f=>{f.settings.appearanceEligibility='invalid'}]){
    const f=fixture();mutate(f);assert.equal((await f.finalize()).appearanceRequested,false);assert.equal(f.state.providerCalls,0);assert.equal(Object.keys(f.state.requests).length,0)
  }
})
test('API/schedule and forged-user hook envelopes refuse before reading or sending media',()=>{
  const f=fixture()
  for(const trigger of ['api','ui','schedule'])assert.throws(()=>captureRequestEvent({...f.envelope(),trigger:{type:trigger}},owner,'appearance'),/native finalized-capture request hook/)
  assert.throws(()=>captureRequestEvent(f.envelope(),'anotherowner001','appearance'),/native finalized-capture request hook/)
})
test('a private request must bind its owner and exact finalization, not caller-supplied result fields',async()=>{
  for(const patch of [{_ownerId:'otherowner00001'},{sourceExecutionId:'anotherfinalize1'},{fileId:'anotherfile0001'},{finalizationId:'otherreceipt001'}]) {
    const f=fixture(),event=await f.prepare();Object.assign(f.state.requests.AppearanceRequest,patch)
    await assert.rejects(appearanceFromHook(f.client,event,owner,provider));assert.equal(f.state.imageReads,0);assert.equal(f.state.providerCalls,0)
  }
})
test('one eight-cat hook makes one paid request; cache and concurrent duplicate claims do not repeat it',async()=>{
  const f=fixture(8),event=await f.prepare(),old=globalThis.fetch
  globalThis.fetch=f.fetch
  try{
    const results=await Promise.all([appearanceFromHook(f.client,event,owner,provider),appearanceFromHook(f.client,{...event,executionId:'otherhookrun001'},owner,provider)])
    assert.equal(f.state.providerCalls,1);assert.equal(f.state.job.status,'ready')
    assert.equal(f.state.job.result.answer.cats.length,8);assert.equal(f.state.job.result.tags.length,8)
    let current=event,cache
    for(let n=0;n<10;n++){
      cache=await appearanceFromHook(f.client,current,owner,provider)
      if(!(cache instanceof Response))break
      current={...event,continuation:{cursor:(await cache.json()).cursor}}
    }
    assert.equal(cache.ok,true);assert.equal(f.state.providerCalls,1);assert.ok(results.some(r=>r instanceof Response))
  }finally{globalThis.fetch=old}
})
test('disabled paid configuration still verifies the scoped derivative and makes no provider call',async()=>{
  const f=fixture(),event=await f.prepare(),old=globalThis.fetch;globalThis.fetch=f.fetch
  try{
    const result=await appearanceFromHook(f.client,event,owner,{...provider,enabled:false,apiKey:undefined})
    assert.equal(result.prepared,true);assert.equal(f.state.imageReads,1);assert.equal(f.state.providerCalls,0);assert.equal(f.state.job.status,'reserved')
  }finally{globalThis.fetch=old}
})
test('ambiguous result persistence and consent withdrawn during a request stop for recovery',async()=>{
  const old=globalThis.fetch
  try{
    for(const mutate of [f=>{f.state.failStore=true},f=>{f.state.afterProvider=()=>{f.preferences.enabled=false}}]){
      const f=fixture(),event=await f.prepare();mutate(f);globalThis.fetch=f.fetch
      await assert.rejects(appearanceFromHook(f.client,event,owner,provider),/could not finish/)
      assert.equal(f.state.providerCalls,1);assert.equal(f.state.job.status,'recovery');assert.equal(f.state.job.result,null)
      try{await appearanceFromHook(f.client,event,owner,provider)}catch{}
      assert.equal(f.state.providerCalls,1)
    }
  }finally{globalThis.fetch=old}
})
test('preference changes require current versioned consent and server-supplied timestamps',async()=>{
  const f=fixture()
  await assert.rejects(saveAppearancePreferences(f.client,{enabled:true},owner),/disclosure/)
  await assert.rejects(saveAppearancePreferences(f.client,{enabled:true,consentVersion:appearanceConsentVersion,consentedAt:'forged'},owner),/disclosure/)
  await saveAppearancePreferences(f.client,{enabled:true,consentVersion:appearanceConsentVersion},owner)
  assert.ok(Number.isFinite(Date.parse(f.preferences.consentedAt)))
  await saveAppearancePreferences(f.client,{enabled:false},owner);assert.equal(f.preferences.enabled,false)
})
