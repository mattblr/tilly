import {test} from 'node:test'
import assert from 'node:assert/strict'
import {evaluateChallengePhoto} from './challenge-provider.ts'
import {framedJpeg} from './appearance-photo.fixture.mjs'
const input={apiKey:'fixture-provider-key',image:framedJpeg(),challenge:{modelVersion:'gpt-6-luna',criteria:'A cat is visible.'}}
const completed={status:'completed',service_tier:'default',usage:{input_tokens:8192,output_tokens:240},output:[{type:'message',role:'assistant',content:[{type:'output_text',text:JSON.stringify({qualified:true,catVisible:true,reasonCode:'qualified'})}]}]}
test('exact8192input/240output boundary permits one inference and fixes standard tier',async()=>{
 const original=globalThis.fetch;let countRequest,infers=0
 try{globalThis.fetch=async(url,options)=>{
  const body=JSON.parse(options.body)
  if(url.endsWith('/input_tokens')){countRequest=body;return Response.json({object:'response.input_tokens',input_tokens:8192})}
  infers++;assert.equal(body.service_tier,'default');assert.equal(body.max_output_tokens,240);assert.equal(body.reasoning.effort,'none')
  for(const key of Object.keys(countRequest))assert.deepEqual(body[key],countRequest[key])
  assert.equal(Object.hasOwn(body,'tools'),false);return Response.json(completed)
 };await evaluateChallengePhoto(input);assert.equal(infers,1)}finally{globalThis.fetch=original}
})
test('failed/malformed/oversized/overbudget token counts never dispatch inference or retry',async()=>{
 const original=globalThis.fetch
 try{for(const make of [()=>new Response('private provider refusal',{status:429}),()=>Response.json({object:'response.input_tokens',input_tokens:8193}),
 ()=>Response.json({object:'response.input_tokens',input_tokens:0}),()=>Response.json({object:'response.input_tokens',input_tokens:1.2}),
 ()=>Response.json({object:'response.input_tokens',input_tokens:'12'}),()=>Response.json({input_tokens:12}),()=>Response.json({object:'other',input_tokens:12}),
 ()=>new Response('{broken'),()=>Response.json([]),()=>new Response('x'.repeat(8193)),()=>{throw Error('transport refusal')}]){
  let calls=0;globalThis.fetch=async url=>{calls++;assert.ok(url.endsWith('/input_tokens'));return make()}
  await assert.rejects(evaluateChallengePhoto(input));assert.equal(calls,1)
 }}finally{globalThis.fetch=original}
})
test('inference refusal, malformed usage or a different tier never awards or repeats inference',async()=>{
 const original=globalThis.fetch
 try{for(const make of [()=>new Response('private refusal',{status:500}),()=>Response.json({...completed,service_tier:'priority'}),
 ()=>Response.json({...completed,usage:undefined}),()=>Response.json({...completed,usage:{input_tokens:8193,output_tokens:2}}),
 ()=>Response.json({...completed,usage:{input_tokens:200,output_tokens:241}}),()=>Response.json({...completed,status:'incomplete'}),
 ()=>new Response('x'.repeat(32769)),()=>{throw Error('ambiguous timeout')}]){
  let calls=0;globalThis.fetch=async url=>{calls++;return url.endsWith('/input_tokens')?Response.json({object:'response.input_tokens',input_tokens:8192}):make()}
  await assert.rejects(evaluateChallengePhoto(input));assert.equal(calls,2)
 }}finally{globalThis.fetch=original}
})
