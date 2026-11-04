import { test } from 'node:test'
import assert from 'node:assert/strict'
import { draw, preview_art } from './art.ts'
const client = {apiUrl:'https://api.example.test',dispatch:{token:()=> 'fixture-dispatch',context:'operation=tilly.make-catch-art'},artwork:{enabled:true,notify:false}}
const credentialResponse=()=>Response.json({data:{appCredential:{value:Buffer.from(JSON.stringify({openai:'fixture-provider-value'})).toString('base64')}}})
test('the real image-edit request fixes standard filtering and one PNG with no output-moderation call', async () => {
  const original = globalThis.fetch; let calls = 0
  try {
    globalThis.fetch = async (url, options) => {
      if(String(url).startsWith('https://api.example.test/')) return credentialResponse()
      calls++
      assert.equal(url, 'https://api.openai.com/v1/images/edits')
      assert.equal(options.method, 'POST'); assert.equal(options.redirect, 'manual')
      assert.equal(options.body.get('moderation'), 'auto'); assert.equal(options.body.get('n'), '1')
      assert.equal(options.body.get('output_format'), 'png'); assert.equal(options.body.get('size'), '1024x1536')
      assert.equal(options.body.get('model'), 'gpt-image-1-mini')
      return Response.json({ data: [{ b64_json: Buffer.from([1, 2, 3]).toString('base64') }] })
    }
    const bytes = await draw(client, { source: new Uint8Array([7]), prompt: 'Synthetic cat', model: 'gpt-image-1-mini', quality: 'high', shape: { width: 100, height: 200 } })
    assert.deepEqual([...bytes], [1, 2, 3]); assert.equal(calls, 1)
  } finally { globalThis.fetch = original }
})
test('provider moderation refusal is a generic failure, without retry or raw provider details', async () => {
  const original = globalThis.fetch; let calls = 0
  try {
    globalThis.fetch = async url => { if(String(url).startsWith('https://api.example.test/')) return credentialResponse(); calls++; return Response.json({ error: { code: 'moderation_blocked', message: 'sensitive fixture text' } }, { status: 400 }) }
    await assert.rejects(draw(client, { source: new Uint8Array([7]), prompt: 'Synthetic cat' }), error =>
      error.message === 'The image provider refused this artwork request.' && !error.message.includes('sensitive'))
    assert.equal(calls, 1)
  } finally { globalThis.fetch = original }
})

test('disabled artwork refuses both direct drawing and admin preview before credential, file or provider reads',async()=>{
  const original=globalThis.fetch
  try {
    globalThis.fetch=async()=>assert.fail('disabled artwork must make no network call')
    const disabled={...client,artwork:{enabled:false,notify:false}}
    await assert.rejects(draw(disabled,{source:new Uint8Array([7]),prompt:'Fixture'}),/not enabled/)
    const result=await preview_art({photoKey:'fixturecapture123'}, {}, disabled)
    assert.equal(result.status,503);assert.equal(result.body.ok,false)
  } finally {globalThis.fetch=original}
})
