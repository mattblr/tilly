import assert from 'node:assert/strict'
import test from 'node:test'
import { previewGate, previewResponse } from './preview-policy.ts'
const env = {
  FOIR_PREVIEW: 'true', TILLY_PREVIEW_HOST: 'preview.example',
  FOIR_PREVIEW_API_KEY: 'server-only-fixture', FOIR_API_ORIGIN: 'https://api.example',
  TILLY_PREVIEW_LOGIN_ORIGIN: 'https://login.example', TILLY_PREVIEW_AUTH_CLIENT_ID: 'preview',
}
const request = (path = '/', init) => new Request(`https://preview.example${path}`, init)
const active = {outcome:'active',session:{token:'fixture',userId:'editor',email:'editor@example.test',expiresIn:900}}
const editor = async () => ({session:active,access:{userId:'editor',roles:['preview-editor'],scopes:['drafts:read']}})
test('preview accepts only an authenticated editor with live draft authority', async () => {
  assert.equal(await previewGate(request(),env,true,editor),null)
  for (const access of [null,{userId:'user',roles:['member'],scopes:['drafts:read']},{userId:'editor',roles:['preview-editor'],scopes:[]},{userId:'editor',roles:null,scopes:['drafts:read']}]) {
    const response = await previewGate(request(),env,true,async()=>({session:active,access}))
    assert.equal(response.status,403)
    assert.match(response.headers.get('cache-control'),/no-store/)
  }
})
test('signed-out preview redirects through hosted login; transient failures remain retryable',async()=>{
  const response = await previewGate(request(),env,true,async()=>({session:{outcome:'signed-out',reason:'no-cookie'},access:null}))
  assert.equal(response.status,302)
  assert.equal(new URL(response.headers.get('location')).origin,env.TILLY_PREVIEW_LOGIN_ORIGIN)
  const failed = await previewGate(request(),env,true,async()=>{throw new Error('provider unavailable')})
  assert.equal(failed.status,503)
})
test('preview refuses app surfaces and writes before inspecting identity',async()=>{
  for (const path of ['/feed','/welcome','/en-GB/welcome','/_serverFn/location','/en-GB/cats/cat','/%6fperations/save','/_foir/apps/tilly/admin','/api/test','/inbound/stripe']) {
    const response=await previewGate(request(path),env,true,async()=>{throw new Error('should not run')})
    assert.equal(response.status,403,path)
  }
  assert.equal((await previewGate(request('/',{method:'POST'}),env,true,editor)).status,403)
})
test('preview fails closed for host/config/build mismatch and malformed paths',async()=>{
  for (const changes of [{FOIR_PREVIEW_API_KEY:''},{TILLY_PREVIEW_LOGIN_ORIGIN:'http://login.example'},{TILLY_PREVIEW_HOST:'elsewhere.example'},{TILLY_PREVIEW_AUTH_CLIENT_ID:''}])
    assert.equal((await previewGate(request(),{...env,...changes},true,editor)).status,503)
  assert.equal((await previewGate(request(),env,false,editor)).status,503)
  assert.equal((await previewGate(request('/%'),env,true,editor)).status,400)
  assert.equal(await previewGate(request(),{...env,FOIR_PREVIEW:'false'},false,editor),null)
})
test('preview response keeps status and private noindex headers',()=>{
  const response=previewResponse(new Response('not allowed',{status:403}))
  assert.equal(response.status,403)
  assert.match(response.headers.get('x-robots-tag'),/noindex/)
  assert.equal(response.headers.get('referrer-policy'),'no-referrer')
})

test('explicit editor lists require the platform-verified subject, not email or a forged header',async()=>{
 const listed={...env,TILLY_PREVIEW_EDITOR_IDS:'editor'}
 const identity=async()=>({session:active,access:{userId:'editor',roles:[],scopes:['drafts:read']}})
 assert.equal(await previewGate(request(),listed,true,identity),null)
 assert.equal((await previewGate(request('/',{headers:{'x-editor-id':'editor'}}),env,true,identity)).status,403)
 const other=async()=>({session:active,access:{userId:'other',roles:['preview-editor'],scopes:['drafts:read']}})
 assert.equal((await previewGate(request(),listed,true,other)).status,403)
 assert.equal((await previewGate(request(),{...listed,TILLY_PREVIEW_EDITOR_IDS:''},true,identity)).status,403)
})
