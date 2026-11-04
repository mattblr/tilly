import test from 'node:test'
import assert from 'node:assert/strict'
import { createHmac, generateKeyPairSync, sign } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { revenueCatWebhook, reconcileRevenueCatDelivery } from '../web/src/server/payments/revenuecat-handlers.ts'
import { claim_premium } from '../web/src/server/operations/premium.ts'
import { billingOperations } from '../web/src/server/payments/manifest.ts'
const actor='fixtureactor01',other='fixtureactor02',until='2099-01-01T00:00:00Z'
const scope={projectId:'fixture-project',tenantId:'fixture-tenant',apiUrl:'https://api.handlers-fixture.test'}
const ingress={apiUrl:scope.apiUrl,dispatch:{token:()=> 'fixture-dispatch'}}
const secrets={revenueCatApiKey:'fixture-provider-key',revenueCatWebhookSecret:'fixture-signing-secret'}
const settings={revenueCatAppId:'app_fixture'}
const {publicKey,privateKey}=generateKeyPairSync('ed25519')
const jwk={...publicKey.export({format:'jwk'}),kid:'fixture-key',alg:'EdDSA',use:'sig'}
function request(userId,id='fixture-event') {
 const now=Math.floor(Date.now()/1000)
 const head=Buffer.from(JSON.stringify({alg:'EdDSA',kid:jwk.kid})).toString('base64url')
 const payload=Buffer.from(JSON.stringify({iss:'foir-platform',sub:`${scope.tenantId}|${scope.projectId}|tilly`,grants:['appsecrets:read','appconfig:read'],jti:'fixture-jti',iat:now,nbf:now-1,exp:now+300,...(userId?{cid:userId}:{})})).toString('base64url')
 const jwt=`${head}.${payload}.${sign(null,Buffer.from(`${head}.${payload}`),privateKey).toString('base64url')}`
 const body=JSON.stringify({api_version:'1.0',event:{id,type:'RENEWAL',app_id:settings.revenueCatAppId,environment:'SANDBOX',app_user_id:actor}})
 const digest=createHmac('sha256',secrets.revenueCatWebhookSecret).update(`${now}.${body}`).digest('hex')
 return new Request('https://site.test/inbound/stripe',{method:'POST',body,headers:{'X-Foir-Token':jwt,'X-RevenueCat-Webhook-Signature':`t=${now},v1=${digest}`}})
}
async function fixture(work,{joined=false,active=false,grant=null,activeCount=0,fields=secrets}={}) {
 const original=globalThis.fetch,starts=[],users=[],queries=[]
 globalThis.fetch=async(input,init)=>{
  const url=String(input)
  if(url.endsWith('/.well-known/jwks.json'))return Response.json({keys:[jwk]})
  if(url.startsWith('https://api.revenuecat.com/')){
   assert.equal(url,`https://api.revenuecat.com/v1/subscribers/${actor}`)
   return Response.json({subscriber:{entitlements:active?{premium:{expires_date:until,product_identifier:'monthly'}}:{},subscriptions:{monthly:{is_sandbox:false,store:'app_store'}}}})
  }
  assert.equal(url,`${scope.apiUrl}/graphql`)
  assert.ok(new Headers(init.headers).get('x-foir-token'));assert.equal(new Headers(init.headers).get('authorization'),null)
  const {query,variables}=JSON.parse(init.body)
  if(!query)return Response.json({errors:[{message:'PersistedQueryNotFound',extensions:{code:'PERSISTED_QUERY_NOT_FOUND'}}]})
  queries.push(query)
  if(query.includes('appCredential'))return Response.json({data:{appCredential:{value:Buffer.from(JSON.stringify(fields)).toString('base64')}}})
  if(query.includes('integrationConfig'))return Response.json({data:{integrationConfig:{name:'tilly',enabled:true,config:settings,sources:[],sinks:[],targetModels:[]}}})
  if(query.includes('query AppUser(')){users.push(variables.id);return Response.json({data:{user:null}})}
  if(query.includes('startOperation')){starts.push(variables);return Response.json({data:{startOperation:{executionId:'fixture-run',joined,replayed:false}}})}
  if(query.includes('query RevenueCatClaim')){
   assert.equal(variables.key,`revenuecat~${actor}`);assert.equal(variables.owner,actor)
   return Response.json({data:{premiumGrant:grant,premiumGrants:{totalCount:activeCount}}})
  }
  assert.fail(`Unexpected request (including any write or delegated execution): ${query}`)
 }
 try{return await work({starts,users,queries})}finally{globalThis.fetch=original}
}
test('webhook requires install identity and configured scope',async()=>{
 await fixture(async({queries})=>{
  await assert.rejects(revenueCatWebhook(request(actor),scope),e=>e.status===403)
  assert.deepEqual(queries,[])
  await assert.rejects(revenueCatWebhook(request(),{...scope,tenantId:''}),/scope first/)
 })
})
test('different vendor events share one writer concurrency key; joined deliveries remain retryable',async()=>{
 for(const joined of [false,true])await fixture(async({starts})=>{
  for(const id of ['event-one','event-two']){
   const answer=await revenueCatWebhook(request(undefined,id),scope)
   assert.equal(answer.status,joined?503:200)
  }
  assert.deepEqual(starts, [0,1].map(()=>({operationKey:'reconcile-revenuecat',input:{actorIds:[actor]},concurrencyKey:'revenuecat-lifecycle'})))
 },{joined})
})
test('signed callers cannot enter the writer even with valid selectors',async()=>{
 await fixture(async({queries})=>{
  await assert.rejects(reconcileRevenueCatDelivery({...ingress,userId:actor},{actorIds:[other]}),/install dispatch/)
  assert.deepEqual(queries,[])
 })
})
test('unknown scoped users skip writes and use native continuations',async()=>{
 await fixture(async({users})=>{
  const next=await reconcileRevenueCatDelivery(ingress,{actorIds:[actor,other]},undefined)
  assert.equal((await next.json()).cursor,'1')
  assert.deepEqual(await reconcileRevenueCatDelivery(ingress,{actorIds:[actor,other]},'1'),{status:200,body:{ok:true}})
  assert.deepEqual(users,[actor,other])
 })
})
test('invalid selectors/cursors refuse before network',async()=>{
 await fixture(async({queries})=>{
  for(const input of [null,{}, {actorIds:[]},{actorIds:['email@example.test']},{actorIds:Array(201).fill(actor)}])await assert.rejects(reconcileRevenueCatDelivery(ingress,input),/selectors/)
  for(const cursor of ['', '-1','01','1','NaN'])await assert.rejects(reconcileRevenueCatDelivery(ingress,{actorIds:[actor]},cursor),/continuation/)
  assert.deepEqual(queries,[])
 })
})
test('claim derives actor from ingress and never creates, updates or delegates',async()=>{
 await fixture(async({queries,starts})=>{
  assert.deepEqual(await claim_premium({actorId:other},{},{...ingress,userId:actor}),{status:200,body:{ok:true,active:true,until}})
  assert.equal(queries.length,2);assert.deepEqual(starts,[])
 },{active:true,grant:{_ownerId:actor,note:'Subscription',until},activeCount:1})
})
test('payment awaiting webhook is pending, never successful client-side access',async()=>{
 for(const grant of [null,{_ownerId:actor,note:'Subscription',until:'2098-01-01T00:00:00Z'}])await fixture(async()=>{
  assert.deepEqual((await claim_premium({},{},{...ingress,userId:actor})).body,{ok:false,error:'PREMIUM_SYNC_PENDING'})
 },{active:true,grant})
})
test('canonical success waits for legacy cleanup to finish',async()=>{
 await fixture(async()=>{assert.equal((await claim_premium({},{},{...ingress,userId:actor})).body.error,'PREMIUM_SYNC_PENDING')},
 {active:true,grant:{_ownerId:actor,note:'Subscription',until},activeCount:2})
})
test('inactive status waits for legacy grant withdrawal and preserves unrelated grants',async()=>{
 for(const activeCount of [0,1])await fixture(async()=>{
  const answer=await claim_premium({},{},{...ingress,userId:actor})
  assert.equal(answer.body.ok,activeCount===0)
 },{activeCount})
})
test('wrong-owner canonical and missing provider credential refuse',async()=>{
 await fixture(async()=>{await assert.rejects(claim_premium({},{},{...ingress,userId:actor}),/identity/)},{grant:{_ownerId:other,note:'Subscription',until}})
 await fixture(async()=>{assert.equal((await claim_premium({},{},{...ingress,userId:actor})).status,503)},{fields:{}})
 await fixture(async({queries})=>{assert.equal((await claim_premium({}, {}, ingress)).status,403);assert.deepEqual(queries,[])})
})
test('only the isolated writer holds record-write authority; no role can invoke it',()=>{
 const op=billingOperations.find(x=>x.key==='reconcile-revenuecat')
 assert.equal(op.supports_async,true);assert.ok(op.grants.includes('records:write.all:premium-grant'))
 assert.equal(billingOperations.some(x=>x.key==='refresh-revenuecat-grant'),false)
 const roles=readFileSync(new URL('../web/foir/app.ts',import.meta.url),'utf8')
 assert.equal(roles.includes('operations:execute:tilly.reconcile-revenuecat'),false)
})
