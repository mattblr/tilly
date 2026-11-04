import test from 'node:test'
import assert from 'node:assert/strict'
import { announcementCursor, announcementIdentity, challengeActive, challengeAnnouncementSlice } from './challenge-announcements.ts'
import { challengeAnnouncementSchedule, challengeAnnouncementGrants, challengeAnnouncementOperations } from '../../../foir/challenge-announcements.ts'
const owner = 'recipientabcdefghij'
const challenge = { _naturalKey: 'cats-pumpkins', title: 'Halloween cats', description: 'Photograph a cat beside a pumpkin this week.', icon: 'camera', enabled: true,
  startsAt: '2026-11-02T00:00:00Z', endsAt: '2026-11-07T00:00:00Z', criteriaVersion: 'v1', criteria: 'A cat and pumpkin must be visible together.',
  highlightKey: 'pumpkin', targetCount: 1, modelVersion: 'gpt-6-luna' }
const at = new Date('2026-11-03T00:00:00Z')
const page = (rows, after = null) => ({ edges: rows.map(node => ({ node })), pageInfo: { hasNextPage: !!after, endCursor: after } })
function fixture(options = {}) {
  const sends = [], accepted = new Map(), settingsReads = []
  let active = { ...challenge }, loseAcceptance = options.loseAcceptance === true
  const recipients = options.recipients ?? [{ _id: 'settings1', _ownerId: owner, communityUpdates: true }]
  const store = {
    challenges: async () => page([active]),
    challenge: async () => options.disappear ? null : active,
    settings: async after => { settingsReads.push(after); const index = after ? Number(after) : 0; return page(recipients.slice(index, index + 1), index + 1 < recipients.length ? String(index + 1) : null) },
    ownSettings: async id => options.optOut ? { ...recipients.find(row => row._ownerId === id), communityUpdates: false } : recipients.find(row => row._ownerId === id) ?? null,
    // This map simulates the NATIVE notification API's idempotency contract;
    // the application receives no delivery ledger or coordinator port.
    send: async input => {
      sends.push(input); if (options.sendRefused) throw Error('native send refused')
      if (!accepted.has(input.idempotencyKey)) accepted.set(input.idempotencyKey, input)
      if (loseAcceptance) { loseAcceptance = false; throw Error('native acceptance response lost') }
    },
  }
  return { store, sends, accepted, settingsReads, setActive: value => { active = value } }
}
async function run(f, { dryRun = false, clock = () => at, cursor } = {}) {
  for (let slice = 0; slice < 20; slice++) {
    const answer = await challengeAnnouncementSlice(f.store, dryRun, cursor, clock)
    if ('result' in answer) return answer.result
    cursor = answer.cursor
  }
  throw Error('Continuation did not finish')
}
test('the schedule runs every minute, and the grants hold only the business reads and the send', () => {
  assert.equal(challengeAnnouncementSchedule.enabled, true)
  assert.equal(challengeAnnouncementSchedule.cron, '* * * * *')
  assert.deepEqual(challengeAnnouncementGrants, ['project:stand', 'records:read:photo-challenge', 'records:read.all:notification-settings', 'notifications:write.named'])
  assert.deepEqual(challengeAnnouncementOperations('https://example.test').map(op => op.key), ['challenge_announcements'])
})
test('active challenge sends the configured invitation with native expiry and stable recipient identity', async () => {
  const f = fixture(); assert.deepEqual(await run(f), { ok: true, eligible: 1, dryRun: false })
  const sent = f.sends[0]; assert.equal(sent.userId, owner); assert.equal(sent.title, challenge.title); assert.equal(sent.message, challenge.description)
  assert.equal(sent.category, 'community_updates'); assert.equal(sent.actionUrl, `/people/${owner}`); assert.equal(sent.expiresAt, challenge.endsAt)
  assert.match(sent.idempotencyKey, /^challenge-start:/); assert.equal('imageUrl' in sent, false)
  await run(f); assert.equal(f.sends.length, 2); assert.deepEqual(f.sends[0], f.sends[1]); assert.equal(f.accepted.size, 1)
})
test('dry run counts the same audience using only reads and continuation state', async () => {
  const f = fixture(); assert.equal((await run(f, { dryRun: true })).eligible, 1)
  assert.equal(f.sends.length, 0)
  assert.deepEqual(Object.keys(f.store).sort(), ['challenge', 'challenges', 'ownSettings', 'send', 'settings'])
})
test('start is inclusive, end is exclusive, disabled/future/deleted challenges remain silent', async () => {
  assert.equal(challengeActive(challenge, new Date(challenge.startsAt)), true)
  for (const [row, now] of [[{ ...challenge, enabled: false }, at], [challenge, new Date('2026-11-01T23:59:59Z')], [challenge, new Date(challenge.endsAt)]]) {
    const f = fixture(); f.setActive(row); await run(f, { clock: () => now }); assert.equal(f.sends.length, 0)
  }
  const gone=fixture({disappear:true});await run(gone);assert.equal(gone.sends.length,0)
})
test('opt-out or deleted settings wins over list snapshot, no consent is manufactured', async () => {
  const f = fixture({ optOut: true }); await run(f); assert.equal(f.sends.length, 0)
  const missing = fixture(); missing.store.ownSettings = async () => null; await run(missing); assert.equal(missing.sends.length, 0)
})
test('foreign settings identity refuses rather than addressing the listed recipient', async () => {
  const f = fixture(); f.store.ownSettings = async () => ({ _id: 'foreign', _ownerId: 'foreignabcdefghij', communityUpdates: true })
  await assert.rejects(run(f), /changed owner/); assert.equal(f.sends.length, 0)
})
test('a delayed slice rechecks end and enabled state immediately before delivery', async () => {
  for (const mode of ['expire', 'disable']) {
    const f = fixture(); let reads = 0
    f.store.challenge = async () => { reads++; return mode === 'disable' && reads > 1 ? { ...challenge, enabled: false } : challenge }
    const clock = () => mode === 'expire' && reads > 1 ? new Date(challenge.endsAt) : at
    await run(f, { clock }); assert.equal(f.sends.length, 0)
  }
})
test('overlapping schedules rely on native send deduplication, with no winning app execution', async () => {
  const f=fixture();await Promise.all([run(f),run(f)])
  assert.equal(f.sends.length,2);assert.equal(f.accepted.size,1)
})
test('accepted send with lost response retries the same continuation and native key', async () => {
  const f=fixture({loseAcceptance:true})
  const start=await challengeAnnouncementSlice(f.store,false,undefined,()=>at)
  await assert.rejects(challengeAnnouncementSlice(f.store,false,start.cursor,()=>at),/acceptance response lost/)
  assert.deepEqual(await run(f,{cursor:start.cursor}),{ok:true,eligible:1,dryRun:false})
  assert.equal(f.sends.length,2);assert.deepEqual(f.sends[0],f.sends[1]);assert.equal(f.accepted.size,1)
})
test('native refusal propagates without advancing the supplied continuation', async () => {
  const f=fixture({sendRefused:true}),start=await challengeAnnouncementSlice(f.store,false,undefined,()=>at)
  await assert.rejects(challengeAnnouncementSlice(f.store,false,start.cursor,()=>at),/native send refused/)
  await assert.rejects(challengeAnnouncementSlice(f.store,false,start.cursor,()=>at),/native send refused/)
  assert.equal(f.accepted.size,0);assert.deepEqual(f.sends[0],f.sends[1])
})
test('recipient continuation alone resumes after an accepted page response is lost',async()=>{
  const f=fixture({recipients:[
    {_id:'s1',_ownerId:owner,communityUpdates:true},
    {_id:'s2',_ownerId:'recipienttwoabcdef',communityUpdates:true},
    {_id:'s3',_ownerId:'recipientthreeabcd',communityUpdates:true},
  ]})
  const start=await challengeAnnouncementSlice(f.store,false,undefined,()=>at)
  const first=await challengeAnnouncementSlice(f.store,false,start.cursor,()=>at)
  assert.equal(JSON.parse(first.cursor).recipientAfter,'1');assert.equal(JSON.parse(first.cursor).eligible,1)
  // The platform retries from its previous cursor when the callback is lost.
  await challengeAnnouncementSlice(f.store,false,first.cursor,()=>at)
  assert.deepEqual(await run(f,{cursor:first.cursor}),{ok:true,eligible:3,dryRun:false})
  assert.deepEqual(f.settingsReads,[undefined,'1','1','2']);assert.equal(f.sends.length,4);assert.equal(f.accepted.size,3)
})
test('identity is stable for the same version/window and distinct for a new version/window', async () => {
  const id=await announcementIdentity(challenge)
  assert.equal(id,await announcementIdentity({...challenge,description:'Edited invitation'}))
  assert.notEqual(id,await announcementIdentity({...challenge,criteriaVersion:'v2'}))
  assert.notEqual(id,await announcementIdentity({...challenge,endsAt:'2026-11-08T00:00:00Z'}))
})
test('continuation refuses changed criteria, version, window or audience binding before a send',async()=>{
  for(const patch of [{criteria:'Changed rules'},{criteriaVersion:'v2'},{endsAt:'2026-11-08T00:00:00Z'}]){
    const f=fixture(),start=await challengeAnnouncementSlice(f.store,false,undefined,()=>at)
    f.setActive({...challenge,...patch});await assert.rejects(run(f,{cursor:start.cursor}),/rules changed/);assert.equal(f.sends.length,0)
  }
  const f=fixture(),start=await challengeAnnouncementSlice(f.store,false,undefined,()=>at)
  f.store.audienceScope='test:another';await assert.rejects(run(f,{cursor:start.cursor}),/rules changed/)
})
test('rules changed during the final preference read refuse before native delivery',async()=>{
  const f=fixture(),read=f.store.ownSettings
  f.store.ownSettings=async id=>{const intent=await read(id);f.setActive({...challenge,criteria:'Changed rules'});return intent}
  await assert.rejects(run(f),/rules changed/);assert.equal(f.sends.length,0)
})
test('bad/unbound cursors and nonadvancing pages fail instead of completing a partial audience',async()=>{
  for(const cursor of ['','null','[]','{}','{"v":1,"finished":true,"eligible":-1}',
    '{"v":1,"finished":false,"eligible":0,"current":"cats-pumpkins"}',
    '{"v":1,"finished":false,"eligible":0,"recipientAfter":"1"}',
    '{"v":1,"finished":false,"eligible":0,"unexpected":true}'])assert.throws(()=>announcementCursor(cursor))
  const f=fixture();f.store.challenges=async()=>page([challenge],'loop')
  const start=await challengeAnnouncementSlice(f.store,true,undefined,()=>at)
  const parsed=JSON.parse(start.cursor);delete parsed.current
  await assert.rejects(challengeAnnouncementSlice(f.store,true,JSON.stringify(parsed),()=>at),/did not advance/)
})

test('announcement handler rejects user, manual and missing-callback delivery before data access', async () => {
  const { challengeAnnouncementHandler } = await import('./challenge-announcements-handler.ts')
  const handler = challengeAnnouncementHandler({})
  const envelope = { input: {}, executionId: 'scheduled', trigger: { type: 'schedule' }, context: {}, callback: { opaque: 'fixture' } }
  for (const [value, ingress] of [
    [{ ...envelope, trigger: { type: 'api' } }, {}],
    [{ ...envelope, callback: undefined }, {}],
    [envelope, { userId: owner }],
    [{ ...envelope, context: { userId: owner } }, {}],
  ]) assert.equal((await handler(value, ingress)).status, 403)
})

test('the store reads every opted-in person and sends to whoever it is given', async () => {
  const { challengeAnnouncementStore } = await import('./challenge-announcements-store.ts')
  const calls = []
  const store = challengeAnnouncementStore({ raw: async (query, variables) => {
    calls.push({ query, variables })
    if (query.includes('ChallengeStartNotice')) return { sendNotification: true }
    return { notificationSettingss: page([]) }
  } })
  assert.equal(store.audienceScope, 'all-opted-in')
  await store.settings()
  assert.doesNotMatch(calls[0].query, /where:/)
  await store.send({ userId: owner }); assert.equal(calls.length, 2)
})
