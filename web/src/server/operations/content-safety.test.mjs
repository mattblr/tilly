import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { buildSchema, parse, validate, VariablesInAllowedPositionRule } from 'graphql'
import { withContentSafety, checkedAudience, checkSharingContent, checkNewCatName, safetyStore, assertSocialAllowed } from './content-safety.ts'
const schema = buildSchema(readFileSync(new URL('../../../../ios/GraphQL/Execution/schema.graphqls', import.meta.url), 'utf8'))
const ingress = { apiUrl: 'https://api.example.test', dispatch: {token:()=> 'fixture-dispatch', context:'operation=tilly.save-profile'}, userId: 'creator', safety: { enabled: true }, filesOrigin: 'https://cdn.example.test' }
const empty = { page: { edges: [], pageInfo: { hasNextPage: false, endCursor: null } } }

test('private audiences never read photos, secrets or the provider', async () => {
  const client = withContentSafety({ raw: async () => { throw Error('unexpected read') } }, ingress)
  assert.equal(await checkedAudience(client, 'CapturePhoto', 'capture', 'private'), 'private')
  assert.equal(await checkedAudience(client, 'Profile', 'profile', 'private'), 'private')
  assert.throws(() => withContentSafety({ raw: async () => empty }, { safety: { enabled: true } }))
})
test('missing moderation credentials persist an error and refuse public text', async () => {
  let kept
  const client = withContentSafety({ raw: async (query, variables) => {
    if (query.includes('SafetyRows')) return empty
    if (query.includes('mutation SafetyCase')) { kept = variables.input; return { createModerationCase: { record: { _id: 'case' } } } }
    throw Error('unexpected read')
  } }, ingress)
  assert.equal(await checkNewCatName(client, 'Biscuit'), false)
  assert.equal(kept.status, 'error')
  assert.equal(kept.text, 'Biscuit')
  assert.equal(kept.fileId, undefined)
})
test('foreign photo URLs cannot make the operation fetch an arbitrary host', async () => {
  const client = withContentSafety({ raw: async () => ({ file: { id: 'file', url: 'https://attacker.example/photo', mimeType: 'image/jpeg' } }) }, ingress)
  await assert.rejects(checkSharingContent(client, { targetType: 'CapturePhoto', targetId: 'capture', text: '', fileId: 'file' }), /configured Fóir CDN/)
})
test('profile publication reuses checked bytes across CDN visibility changes, but never holds or another dispatch', async () => {
  const original = globalThis.fetch
  let published = false, held = false, reads = 0
  const raw = async (query, vars = {}) => {
    if (query.includes('SafetyFile')) return { file: { id: 'profilefile123456',
      url: `https://cdn.example.test/profilefile123456${published ? '' : '?at=fixture'}`, mimeType: 'image/jpeg' } }
    if (query.includes('SafetyProfile')) return { profile: { displayName: 'Fixture', username: 'fixture', bio: '',
      photo: { url: 'https://cdn.example.test/profilefile123456' } } }
    if (query.includes('SafetyRows')) return { page: { ...empty.page, edges: (vars.digest
      ? [{ _id: 'approved', digest: vars.digest, status: 'approved' }]
      : held ? [{ _id: 'hold' }] : []).map(node => ({ node })) } }
    throw Error('Unexpected capability')
  }
  const client = withContentSafety({ raw }, ingress)
  try {
    globalThis.fetch = async url => {
      reads++
      return new URL(url).searchParams.has('at')
        ? new Response(new Uint8Array([1, 2, 3]), { headers: { 'Content-Type': 'image/jpeg' } })
        : new Response('not yet readable', { status: 403 })
    }
    assert.equal(await checkSharingContent(client, { targetType: 'input', targetId: 'profile', text: 'Fixture', fileId: 'profilefile123456' }), true)
    published = true
    assert.equal(await checkedAudience(client, 'Profile', 'profile', 'public'), 'public')
    assert.equal(reads, 1)
    held = true
    assert.equal(await checkedAudience(client, 'Profile', 'profile', 'public'), 'private')
    assert.equal(await checkedAudience(withContentSafety({ raw }, ingress), 'Profile', 'profile', 'public'), 'private')
    assert.equal(reads, 1)
    held = false
    await assert.rejects(checkedAudience(withContentSafety({ raw }, ingress), 'Profile', 'profile', 'public'), /HTTP 403/)
    assert.equal(reads, 2)
  } finally { globalThis.fetch = original }
})
test('failed compare-and-set of a safety result never counts as persistence', async () => {
  const client = { raw: async query => query.includes('SafetyRows') ? (query.includes('status: {in:') ? empty : { page: { ...empty.page, edges: [{ node: { _id: 'case', status: 'error' } }] } }) : { updateModerationCase: { record: null } } }
  await assert.rejects(safetyStore(client, 'creator').keep({ targetType: 'input', targetId: 'name', text: 'Biscuit' }, 'digest', 'approved', []), /changed/)
})
test('blocked social interactions refuse; undo paths can avoid the positive-action check', async () => {
  const client = withContentSafety({ raw: async (_query, variables) => {
    assert.deepEqual(validate(schema, parse(_query), [VariablesInAllowedPositionRule]).map(e=>e.message), [])
    assert.deepEqual(variables, { owner: 'creator', target: 'other' })
    return { userBlocks: { edges: [{ node: { _id: 'block' } }] } }
  } }, ingress)
  await assert.rejects(assertSocialAllowed(client, 'creator', 'other'), /unavailable/)
  await assertSocialAllowed(client, 'creator', 'creator')
})
test('a counterpart block refuses even with provider moderation disabled, while an empty pair permits', async () => {
  const calls = []
  const client = withContentSafety({raw: async (query, variables) => {
    assert.deepEqual(validate(schema, parse(query), [VariablesInAllowedPositionRule]).map(e => e.message), [])
    calls.push(variables)
    return {userBlocks: {edges: variables.owner === 'other' ? [{node: {_id: 'counterpart-block'}}] : []}}
  }}, {...ingress, safety: {enabled: false}})
  await assert.rejects(assertSocialAllowed(client, 'creator', 'other'), /unavailable/)
  assert.deepEqual(calls, [{owner: 'creator', target: 'other'}, {owner: 'other', target: 'creator'}])
  const emptyPair = withContentSafety({raw: async () => ({userBlocks: {edges: []}})}, {...ingress, safety: {enabled: false}})
  await assertSocialAllowed(emptyPair, 'creator', 'other')
})
test('an unavailable reciprocal-block read refuses the action', async () => {
  const client = withContentSafety({raw: async () => {throw Error('block read unavailable')}}, ingress)
  await assert.rejects(assertSocialAllowed(client, 'creator', 'other'), /block read unavailable/)
})
test('public directory names use only config credentials and reuse the exact checked text', async () => {
  const original = globalThis.fetch
  const saved = []
  let calls = 0
  const client = withContentSafety({ raw: async (query, vars = {}) => {
    if (query.includes('appCredential')) return { appCredential: { value: Buffer.from(JSON.stringify({ moderationOpenAI: 'fixture-provider-value' })).toString('base64') } }
    if (query.includes('SafetyRows')) {
      const matching = vars.digest ? saved.filter(row => row.digest === vars.digest) : []
      return { page: { ...empty.page, edges: matching.map(node => ({ node })) } }
    }
    if (query.includes('mutation SafetyCase')) { saved.push({ _id: `case-${saved.length}`, ...vars.input }); return { createModerationCase: { record: { _id: 'case' } } } }
    throw Error('Unexpected capability')
  } }, ingress)
  try {
    globalThis.fetch = async (url, options) => {
      if(String(url).startsWith('https://api.example.test/')) {
        assert.equal(new Headers(options.headers).get('X-Foir-Token'),'fixture-dispatch')
        return Response.json({data:{appCredential:{value:Buffer.from(JSON.stringify({moderationOpenAI:'fixture-provider-value'})).toString('base64')}}})
      }
      calls++
      assert.equal(url, 'https://api.openai.com/v1/moderations')
      assert.equal(options.redirect, 'manual')
      const body = JSON.parse(options.body)
      assert.deepEqual(body.input, [{ type: 'text', text: 'Biscuit' }])
      const categories = ['sexual', 'violence', 'violence/graphic', 'self-harm', 'self-harm/intent', 'self-harm/instructions', 'sexual/minors', 'harassment', 'harassment/threatening', 'hate', 'hate/threatening', 'illicit', 'illicit/violent']
      return Response.json({ results: [{ flagged: false, categories: Object.fromEntries(categories.map(name => [name, false])),
        category_scores: Object.fromEntries(categories.map(name => [name, 0.01])), category_applied_input_types: Object.fromEntries(categories.map(name => [name, ['text']])) }] })
    }
    assert.equal(await checkNewCatName(client, 'Biscuit'), true)
    assert.equal(await checkNewCatName(client, 'Biscuit'), true)
    assert.equal(calls, 1)
    assert.equal(saved.length, 1)
    assert.equal(saved[0].fileId, undefined)
  } finally { globalThis.fetch = original }
})

test('a refused Fóir credential read fails closed without provider execution', async () => {
  let kept
  const client = withContentSafety({ raw: async (query, variables) => {
    if (query.includes('SafetyRows')) return empty
    if (query.includes('mutation SafetyCase')) { kept = variables.input; return { createModerationCase: { record: { _id: 'case' } } } }
    throw Error('Fóir credential read refused')
  } }, ingress)
  assert.equal(await checkNewCatName(client, 'Biscuit'), false)
  assert.equal(kept.status, 'error')
})

test('exact immutable-file approvals survive a CDN URL transition; new text, creator, model and holds cannot borrow them', async () => {
  const original = globalThis.fetch
  const saved = { owner: 'creator', file: 'approvedfile123456', text: 'Friendly cat', model: 'omni-moderation-latest' }
  let held = false, reads = 0
  const make = (actor = 'creator') => withContentSafety({raw:async(q,v)=>{
    if(q.includes('SafetyFile')) return {file:{id:v.id,url:`https://cdn.example.test/${v.id}`,mimeType:'image/jpeg'}}
    if(q.includes('SafetyRows')) {
      if(v.kind) return {page:{edges:held?[{node:{_id:'hold'}}]:[]}}
      if(v.model) {
        assert.match(q,/status: \{eq: "approved"\}/)
        return {page:{edges:Object.keys(saved).every(key=>saved[key]===v[key])?[{node:{_id:'approval'}}]:[]}}
      }
    }
    throw Error('Unexpected authority')
  }}, {...ingress,userId:actor})
  try {
    globalThis.fetch=async()=>{reads++;return new Response('URL transition',{status:403})}
    const content={targetType:'CapturePhoto',targetId:'capture',text:saved.text,fileId:saved.file}
    assert.equal(await checkSharingContent(make(),content),true)
    assert.equal(reads,0)
    for(const changed of [{text:'Changed text'},{fileId:'anotherfile123456'}])
      await assert.rejects(checkSharingContent(make(),{...content,...changed}),/HTTP 403/)
    await assert.rejects(checkSharingContent(make('another-creator'),content),/HTTP 403/)
    saved.model='old-model'
    await assert.rejects(checkSharingContent(make(),content),/HTTP 403/)
    held=true
    assert.equal(await checkSharingContent(make(),content),false)
    assert.equal(reads,4)
  } finally {globalThis.fetch=original}
})

test('the served contract distinguishes record owner IDs from string-valued block IDs', () => {
  const bad = 'query WrongBlock($me: ID) { userBlocks(first: 1, where: {blockedUserId: {eq: $me}}) { edges { node { _id } } } }'
  assert.ok(validate(schema,parse(bad),[VariablesInAllowedPositionRule]).some(e=>e.message.includes('expecting type')))
})
