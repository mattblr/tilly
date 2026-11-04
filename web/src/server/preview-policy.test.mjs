import assert from 'node:assert/strict'
import test from 'node:test'
import { previewGate, previewResponse } from './preview-policy.ts'
const env = {
  FOIR_PREVIEW: 'true', TILLY_PREVIEW_HOST: 'preview.example', FOIR_API_ORIGIN: 'https://api.example',
  TILLY_PREVIEW_LOGIN_ORIGIN: 'https://login.example', TILLY_PREVIEW_AUTH_CLIENT_ID: 'preview',
}
const build = { preview: true, apiKey: 'website-fixture' }
const request = (path = '/', init) => new Request(`https://preview.example${path}`, init)
const active = {outcome:'active',session:{token:'fixture',userId:'editor',email:'editor@example.test',expiresIn:900}}
const editor = async () => ({session:active,access:{userId:'editor',roles:['preview-editor'],scopes:['drafts:read']}})
test('preview accepts a signed-in person whose role grants drafts:read', async () => {
  assert.equal(await previewGate(request(),env,build,editor),null)
  // Fóir's answer decides, whichever role grants the scope.
  assert.equal(await previewGate(request(),env,build,async()=>({session:active,access:{userId:'editor',roles:['other'],scopes:['drafts:read']}})),null)
  for (const access of [null,{userId:'user',roles:['preview-editor'],scopes:['drafts:read']},{userId:'editor',roles:['preview-editor'],scopes:[]},{userId:'editor',roles:['member'],scopes:['records:read']}]) {
    const response = await previewGate(request(),env,build,async()=>({session:active,access}))
    assert.equal(response.status,403)
    assert.match(response.headers.get('cache-control'),/no-store/)
  }
})
test('a caller header never stands in for Fóir’s answer',async()=>{
  const member=async()=>({session:active,access:{userId:'editor',roles:['member'],scopes:[]}})
  assert.equal((await previewGate(request('/',{headers:{'x-editor-id':'editor'}}),env,build,member)).status,403)
})
test('the gate asks Fóir with the website key',async()=>{
  let key
  await previewGate(request(),env,build,async(_request,_env,apiKey)=>{key=apiKey;return editor()})
  assert.equal(key,build.apiKey)
})
test('signed-out preview redirects through hosted login back to the page; transient failures remain retryable',async()=>{
  const response = await previewGate(request('/blog/post'),env,build,async()=>({session:{outcome:'signed-out',reason:'no-cookie'},access:null}))
  assert.equal(response.status,302)
  const location = new URL(response.headers.get('location'))
  assert.equal(location.origin,env.TILLY_PREVIEW_LOGIN_ORIGIN)
  assert.ok(location.href.includes(encodeURIComponent('https://preview.example/blog/post')))
  const failed = await previewGate(request(),env,build,async()=>{throw new Error('provider unavailable')})
  assert.equal(failed.status,503)
})
test('after sign-in the home page forwards returnTo on this site only',async()=>{
  const back = await previewGate(request(`/?returnTo=${encodeURIComponent('https://preview.example/blog/post')}`),env,build,editor)
  assert.equal(back.status,302)
  assert.equal(back.headers.get('location'),'https://preview.example/blog/post')
  for (const target of ['https://elsewhere.example/','//elsewhere.example/','javascript:alert(1)'])
    assert.equal(await previewGate(request(`/?returnTo=${encodeURIComponent(target)}`),env,build,editor),null,target)
  const refused = await previewGate(request(`/?returnTo=${encodeURIComponent('https://preview.example/blog/post')}`),env,build,async()=>({session:active,access:{userId:'editor',roles:[],scopes:[]}}))
  assert.equal(refused.status,403)
})
test('preview refuses app surfaces and writes before inspecting identity',async()=>{
  for (const path of ['/feed','/welcome','/en-GB/welcome','/_serverFn/location','/en-GB/cats/cat','/%6fperations/save','/_foir/apps/tilly/admin','/api/test','/inbound/stripe']) {
    const response=await previewGate(request(path),env,build,async()=>{throw new Error('should not run')})
    assert.equal(response.status,403,path)
  }
  assert.equal((await previewGate(request('/',{method:'POST'}),env,build,editor)).status,403)
})
test('preview fails closed for host/config/build mismatch and malformed paths',async()=>{
  for (const changes of [{TILLY_PREVIEW_LOGIN_ORIGIN:'http://login.example'},{TILLY_PREVIEW_HOST:'elsewhere.example'},{TILLY_PREVIEW_AUTH_CLIENT_ID:''}])
    assert.equal((await previewGate(request(),{...env,...changes},build,editor)).status,503)
  assert.equal((await previewGate(request(),env,{...build,apiKey:''},editor)).status,503)
  assert.equal((await previewGate(request(),env,{...build,preview:false},editor)).status,503)
  assert.equal((await previewGate(request('/%'),env,build,editor)).status,400)
  assert.equal(await previewGate(request(),{...env,FOIR_PREVIEW:'false'},{...build,preview:false},editor),null)
})
test('preview response keeps status and private noindex headers',()=>{
  const response=previewResponse(new Response('not allowed',{status:403}))
  assert.equal(response.status,403)
  assert.match(response.headers.get('x-robots-tag'),/noindex/)
  assert.equal(response.headers.get('referrer-policy'),'no-referrer')
})
