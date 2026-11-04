import test from 'node:test'
import assert from 'node:assert/strict'
import { operationCredential } from './credentials.ts'

const ingress={apiUrl:'https://api.example.test',dispatch:{token:()=> 'fixture-dispatch',context:'operation=fixture'}}
async function read(fields,{status=200}={}) {
  const before=globalThis.fetch;const calls=[]
  try {
    globalThis.fetch=async(url,init)=>{
      calls.push(String(url))
      assert.equal(String(url),'https://api.example.test/graphql')
      assert.equal(new Headers(init.headers).get('X-Foir-Token'),'fixture-dispatch')
      assert.equal(new Headers(init.headers).has('Authorization'),false)
      assert.match(JSON.parse(init.body).query,/appCredential/)
      return status===200 ? Response.json({data:{appCredential:{value:Buffer.from(JSON.stringify(fields)).toString('base64')}}})
        : Response.json({errors:[{message:'Fixture credential read refused'}]},{status})
    }
    return await operationCredential(ingress,'appearanceOpenAI')
  } finally {
    globalThis.fetch=before
    assert.equal(calls.length,1)
  }
}
test('provider credential uses only the verified dispatch and the requested Fóir field',async()=>{
  assert.equal(await read({appearanceOpenAI:' fixture-appearance ',moderationOpenAI:'unrelated-fixture'}),'fixture-appearance')
})
test('missing paid-purpose field cannot borrow the moderation credential',async()=>{
  await assert.rejects(read({moderationOpenAI:'unrelated-fixture'}),/not configured in Fóir/)
})
test('a denied credential read is terminal and makes no additional request',async()=>{
  await assert.rejects(read({}, {status:403}),/refused/)
})
