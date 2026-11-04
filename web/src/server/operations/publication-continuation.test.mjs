import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { buildSchema, parse, validate, NoUnusedVariablesRule, NoUndefinedVariablesRule } from 'graphql'
import { resumePublication } from './publication.ts'
const schema = buildSchema(readFileSync(new URL('../../../../ios/GraphQL/Execution/schema.graphqls', import.meta.url), 'utf8'))
function validVariables(query) {
  const errors = validate(schema, parse(query), [NoUnusedVariablesRule, NoUndefinedVariablesRule])
  assert.deepEqual(errors.map(error => error.message), [])
}
const owner = 'owner0000000001', capture = 'capture00000001', profile = 'profile00000001', tag = 'tag000000000001'
const audienceId = 'audience0000001'
const connection = (rows, after, first = 1) => {
  const offset = after ? Number(after) : 0, selected = rows.slice(offset, offset + first), more = offset + first < rows.length
  return { edges: selected.map(node => ({ node })), totalCount: rows.length, pageInfo: { hasNextPage: more, endCursor: String(offset + selected.length) } }
}

/** A user with 55 catches, two accepted followers and a repost. State is
 * inspected, not queries. */
function fixture({ setting = 'private', audience = 'private' } = {}) {
  const captures = Array.from({ length: 55 }, (_, i) => ({ _id: `${capture}${String(i).padStart(2, '0')}`, _ownerId: owner, state: 'ready', fileId: `file0000000000${String(i).padStart(2, '0')}` }))
  const posts = captures.map((row, i) => ({ _id: `post0000000000${String(i).padStart(2, '0')}`, _ownerId: owner, photoKey: row._id, reshareOf: null }))
  const tags = captures.map((row, i) => ({ _id: `${tag}${String(i).padStart(2, '0')}`, photoKey: row._id }))
  const reposts = [{ _id: 'repost000000001', _ownerId: owner, photoKey: 'elsewhere000001', reshareOf: 'original0000001' }]
  // The user's approvals of their followers; only accepted ones are listed.
  const follows = [
    { _id: 'follower0000001', _ownerId: owner, followerId: 'follower0000001', status: 'accepted' },
    { _id: 'follower0000002', _ownerId: owner, followerId: 'follower0000002', status: 'accepted' },
  ]
  const audiences = new Map([[audienceId, { _id: audienceId, _ownerId: owner, privacy: audience }]])
  const files = new Map(), viewers = new Map(), grants = new Set(), recordVisibility = []
  let calls = 0, maxCalls = 0
  const update = (query, v) => {
    const type = /update(\w+)\(/.exec(query)[1]
    if (v.data.viewers?.disconnect === true) viewers.set(v.id, null)
    else if (v.data.viewers) { assert.deepEqual(Object.keys(v.data.viewers), ['connect']); assert.ok(audiences.has(v.data.viewers.connect.id)); viewers.set(v.id, v.data.viewers.connect.id) }
    const row = [...captures, ...posts, ...reposts].find(r => r._id === v.id)
    if (row && v.data.audience) row.audience = v.data.audience.set
    return { [`update${type}`]: { record: { _id: v.id } } }
  }
  const raw = async (query, v = {}) => {
    validVariables(query)
    if (++calls > 30) throw new Error('Subrequest budget overflow positive control')
    if (query.includes('query ChosenPrivacy(')) return { profiles: { edges: [{ node: { privacy: setting } }] } }
    if (query.includes('query Audience(')) return { page: { edges: [...audiences.values()].filter(r => r._ownerId === v.owner).map(node => ({ node })) } }
    if (query.includes('setAudienceVisibility')) return { setAudienceVisibility: v.visibility }
    if (query.includes('grantAudienceAccess')) { assert.equal(v.id, audienceId); grants.add(v.who); return { grantAudienceAccess: { granteeId: v.who } } }
    if (query.includes('PublicationPage')) {
      assert.match(query, /first: 1/); assert.match(query, /createdAt: ASC/)
      const field = /page: (\w+)\(/.exec(query)[1]
      const rows = { followApprovals: follows, capturePhotos: captures, capturePosts: reposts }[field]
      assert.ok(rows, field)
      return { page: connection(rows, v.after) }
    }
    if (query.includes('query Page(')) {
      const field = /page: (\w+)\(/.exec(query)[1]
      const rows = field === 'capturePosts' ? posts.filter(r => r.photoKey === v.photo && !r.reshareOf)
        : field === 'captureCatTags' ? tags.filter(r => r.photoKey === v.photo) : []
      return { page: connection(rows, v.after, 100) }
    }
    if (query.includes('setFileVisibility')) { files.set(v.id, v.visibility); return { setFileVisibility: v.visibility } }
    if (/set\w+Visibility/.test(query)) { recordVisibility.push(v.id); return { [/set(\w+Visibility)/.exec(query)[1]]: v.visibility ?? v.v } }
    if (/mutation \w+\(\$id: ID, \$data: \w+UpdateInput!/.test(query) || query.includes('mutation Viewers')) return update(query, v)
    throw new Error(`Unexpected query: ${query.slice(0, 120)}`)
  }
  return { foir: { raw }, captures, posts, tags, reposts, files, viewers, grants, recordVisibility,
    set setting(value) { setting = value }, slice() { maxCalls = Math.max(maxCalls, calls); calls = 0 }, get maxCalls() { return Math.max(maxCalls, calls) } }
}
async function drain(f, initial, { kind = 'save_profile', limit = 1000, beforeSlice = () => {} } = {}) {
  let c = initial
  for (let n = 0; n < limit; n++) {
    f.slice(); beforeSlice(n)
    const out = await resumePublication(kind, f.foir, c)
    if (!(out instanceof Response)) return { out, slices: n + 1 }
    // Use the actual SDK continuation envelope, not a made-up cursor format.
    c = JSON.parse((await out.json()).cursor)
  }
  throw new Error('Continuation failed to terminate')
}
const switchTo = privacy => ({ v: 2, owner, resultId: profile, privacy, records: false, phase: privacy === 'private' ? 'followers' : 'captures' })

test('going private keeps accepted followers and closes every photo, one catch per dispatch', async () => {
  const f = fixture()
  const { out, slices } = await drain(f, switchTo('private'))
  assert.deepEqual(out.body, { ok: true, id: profile })
  // Every approved follower keeps seeing the user's catches.
  assert.deepEqual([...f.grants].sort(), ['follower0000001', 'follower0000002'])
  for (const row of f.captures) assert.equal(f.files.get(row.fileId), 'PRIVATE')
  // Records follow the audience record: the switch never opens or relinks them.
  assert.deepEqual(f.recordVisibility, [])
  assert.equal(f.viewers.size, 0)
  assert.ok(f.captures.every(row => row.audience === 'private'))
  assert.equal(slices, 2 + 55)
  assert.ok(f.maxCalls <= 30, `${f.maxCalls} requests`)
})

test('going public opens the photos without granting anyone', async () => {
  const f = fixture({ setting: 'public', audience: 'public' })
  await drain(f, switchTo('public'))
  for (const row of f.captures) assert.equal(f.files.get(row.fileId), 'PUBLIC')
  assert.ok(f.posts.every(row => row.audience === 'public'))
  assert.equal(f.grants.size, 0)
  assert.deepEqual(f.recordVisibility, [])
})

test('a newer switch stops an older walk before it opens anything else', async () => {
  const f = fixture({ setting: 'public', audience: 'public' })
  await assert.rejects(drain(f, switchTo('public'), { beforeSlice: n => { if (n === 10) f.setting = 'private' } }), /audience changed/)
  // Slices 0 to 9 ran before the switch; nothing opens after it.
  const opened = f.captures.filter(row => f.files.get(row.fileId) === 'PUBLIC').length
  assert.ok(opened <= 10, `${opened} photos opened after the switch`)
})

test('foreign-owned records are refused before any change', async () => {
  const f = fixture({ setting: 'public', audience: 'public' })
  f.captures[0]._ownerId = 'someoneelse0001'
  await assert.rejects(drain(f, { ...switchTo('public'), phase: 'captures' }), /another owner/)
  assert.equal(f.files.size, 0)
})

test('an empty first page with a positive count cannot report a completed walk', async () => {
  const f = fixture()
  const raw = f.foir.raw
  f.foir.raw = async (q, v) => q.includes('PublicationPage') ? { page: { edges: [], totalCount: 4, pageInfo: { hasNextPage: false, endCursor: null } } } : raw(q, v)
  await assert.rejects(drain(f, switchTo('private')), /incomplete/)
})

test('repair links every catch and repost to the audience', async () => {
  const f = fixture({ setting: 'public', audience: 'public' })
  const { out } = await drain(f, { v: 2, owner, resultId: profile, privacy: 'public', records: true, phase: 'captures' }, { kind: 'post_my_catches' })
  assert.deepEqual(out.body, { ok: true, id: profile })
  for (const row of [...f.captures, ...f.posts, ...f.tags, ...f.reposts]) assert.equal(f.viewers.get(row._id), audienceId, row._id)
  assert.ok(f.maxCalls <= 30, `${f.maxCalls} requests`)
})

test('old, foreign and out-of-order cursors are refused', async () => {
  const { publicationSlice } = await import('./publication.ts')
  const ingress = { userId: owner, apiUrl: 'https://api.example.test', dispatch: { token: () => 'fixture', context: 'operation=tilly.save-profile' } }
  const run = cursor => publicationSlice('save_profile', {}, { executionId: 'execution000001', callback: {}, continuation: { cursor: JSON.stringify(cursor) } }, ingress)
  await assert.rejects(run({ v: 1, owner, resultId: profile, audience: 'private', phase: 'captures' }), /Invalid publication continuation/)
  await assert.rejects(run({ ...switchTo('private'), owner: 'someoneelse0001' }), /Invalid publication continuation/)
  await assert.rejects(run({ ...switchTo('public'), phase: 'reposts' }), /Invalid publication continuation/)
  await assert.rejects(run({ ...switchTo('public'), phase: 'followers' }), /Invalid publication continuation/)
})

test('query validation positively rejects the deployed unused-variable failure', () => {
  assert.throws(() => validVariables('query Broken($id: ID) { __typename }'), /never used/)
})

test('operator photo hiding unlinks every record built on the photo, one per dispatch, through the real scoped SDK transport', async () => {
  const {reviewContent}=await import('./safety-handlers.ts')
  const original=globalThis.fetch
  const lists={CapturePost:61,FieldNote:52,CaptureCatTag:8,CatchArt:3}
  const rows=Object.fromEntries(Object.entries(lists).map(([type,count])=>[type,Array.from({length:count},(_,i)=>({_id:`${type.toLowerCase()}${String(i).padStart(12,'0')}`,_ownerId:i%2?owner:'reposter0000001'}))]))
  const hiddenFiles=new Set(),visited=new Map(),linked=new Map(),shownAs=new Map()
  let calls=0,maxCalls=0,cursor
  try {
    globalThis.fetch=async(url,options)=>{
      assert.equal(new URL(url).origin,'https://api.example.test')
      calls++;if(calls>30)throw Error('Dispatch network budget exceeded')
      const {query,variables:v={}}=JSON.parse(options.body)
      if(!query)return Response.json({errors:[{message:'PersistedQueryNotFound',extensions:{code:'PERSISTED_QUERY_NOT_FOUND'}}]})
      validVariables(query)
      let data
      if(query.includes('ReviewItem')) data={moderationCase:{_id:'case00000000001',_ownerId:owner,targetType:'CapturePhoto',targetId:capture,status:'hidden',fileId:'file00000000001'}}
      else if(query.includes('ReviewState')) data={changed:{record:{_id:v.id}}}
      else if(query.includes('ReviewAudit')) data={createModerationAction:{record:{_id:'audit0000000001'}}}
      else if(query.includes('ChallengeRows')) data={challengeEvaluations:{edges:[],pageInfo:{hasNextPage:false,endCursor:null}}}
      else if(query.includes('HeldTarget')) data={capturePhoto:{_id:capture,_ownerId:owner,fileId:'file00000000001',photo:null}}
      else if(query.includes('setFileVisibility')) {hiddenFiles.add(v.id);data={setFileVisibility:v.visibility ?? 'PRIVATE'}}
      else if(query.includes('mutation HideRecord')) {
        const type=/update(\w+)\(/.exec(query)[1]
        assert.deepEqual(v.data.viewers,{disconnect:true})
        if(v.data.audience) shownAs.set(v.id,v.data.audience.set)
        linked.set(v.id,null);visited.set(type,(visited.get(type)??new Set()).add(v.id))
        data={[`update${type}`]:{record:{_id:v.id}}}
      }
      else if(query.includes('HidePhotoReferences')) {
        assert.match(query,/first: 1/)
        const field=/page: (\w+)\(/.exec(query)[1]
        const type=Object.keys(rows).find(type=>type[0].toLowerCase()+type.slice(1)+'s'===field)
        assert.ok(type,field)
        data={page:connection(rows[type],v.after)}
      } else throw Error(`Unexpected review operation: ${query}`)
      return Response.json({data})
    }
    for(let slice=0;slice<1000;slice++) {
      calls=0
      const out=await reviewContent({id:'case00000000001',queue:'check',action:'hide',reason:'Synthetic review'},
        {executionId:'review0000000001',callback:{},...(cursor?{continuation:{cursor}}:{})},
        {userId:null,apiUrl:'https://api.example.test',dispatch:{token:()=> 'fixture-dispatch',context:'operation=review_content'}})
      maxCalls=Math.max(maxCalls,calls)
      if(!(out instanceof Response)) {assert.equal(out.body.ok,true);break}
      cursor=(await out.json()).cursor
      assert.ok(slice<999,'Review did not terminate')
    }
    for(const [type,count] of Object.entries(lists))assert.equal(visited.get(type)?.size,count)
    assert.ok(hiddenFiles.has('file00000000001'))
    // The photo and its posts, reposts included, now show as private.
    assert.equal(shownAs.get(capture),'private')
    for(const post of rows.CapturePost) assert.equal(shownAs.get(post._id),'private')
    // Each record now names no audience, so only its own owner reads it. The
    // walk never reads or creates anyone's audience record.
    for(const list of Object.values(rows))for(const row of list) assert.ok(linked.has(row._id)&&linked.get(row._id)===null,row._id)
    assert.ok(linked.has(capture)&&linked.get(capture)===null)
    assert.ok(maxCalls<=30)
  } finally {globalThis.fetch=original}
})

test('hiding a reported post unlinks it from its owner’s audience and shows it as private', async () => {
  const {reviewContent}=await import('./safety-handlers.ts')
  const original=globalThis.fetch, post='post00000000001', report='report000000001'
  const hidden=[]
  try {
    globalThis.fetch=async(url,options)=>{
      const {query,variables:v={}}=JSON.parse(options.body)
      if(!query)return Response.json({errors:[{message:'PersistedQueryNotFound',extensions:{code:'PERSISTED_QUERY_NOT_FOUND'}}]})
      validVariables(query)
      let data
      if(query.includes('ReviewItem')) data={contentReport:{_id:report,_ownerId:'reporter0000001',targetType:'post',targetId:post,status:'open',targetOwnerId:owner}}
      else if(query.includes('ReportTarget')) data={capturePost:{_id:post,_ownerId:owner,photoKey:capture}}
      else if(query.includes('createModerationCase')) data={createModerationCase:{record:{_id:'case00000000002'}}}
      else if(query.includes('mutation HideRecord')) {hidden.push({type:/update(\w+)\(/.exec(query)[1],...v});data={updateCapturePost:{record:{_id:v.id}}}}
      else if(query.includes('ReviewState')) data={changed:{record:{_id:v.id}}}
      else if(query.includes('ReviewAudit')) data={createModerationAction:{record:{_id:'audit0000000002'}}}
      else throw Error(`Unexpected review operation: ${query}`)
      return Response.json({data})
    }
    const out=await reviewContent({id:report,queue:'report',action:'hide',reason:'Synthetic review'},{executionId:'review0000000002',callback:{}},
      {userId:null,apiUrl:'https://api.example.test',dispatch:{token:()=>'fixture-dispatch',context:'operation=review_content'}})
    assert.equal(out.body.ok,true)
    assert.deepEqual(hidden,[{type:'CapturePost',id:post,data:{viewers:{disconnect:true},audience:{set:'private'}}}])
  } finally {globalThis.fetch=original}
})
