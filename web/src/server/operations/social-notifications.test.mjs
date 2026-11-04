import test from 'node:test'
import assert from 'node:assert/strict'
import { notifySocial, socialNotificationEvent } from './social-notifications.ts'

const actor = 'actorabcdefghij', recipient = 'ownerabcdefghij', catKey = 'catabcdefghijk'
function fixture(options = {}) {
  const sends = [], reads = []
  return { sends, reads, foir: { request: async (query, variables) => {
    reads.push(variables)
    if (options.offline) throw Error('private provider details')
    return { profiles: {edges: [{node: {displayName: 'Alex', username: 'alex', photo: {url: 'https://cdn.foir.dev/avatar.png'}}}]}, uiCopy: {entries: options.entries ?? []} }
  }, notifications: {send: async input => { if (options.accepted === false) throw Error('send refused'); sends.push(input) }} } }
}
for (const kind of ['like', 'repost', 'follow']) test(`${kind} addresses the derived recipient, with a native idempotency key and no email content`, async () => {
  const f = fixture()
  const notice = {kind, actor, recipient, actionId: 'actionabcdefghij', catKey, imageUrl: 'https://cdn.foir.dev/photo.png'}
  assert.equal(await notifySocial(f.foir, notice), true)
  const sent = f.sends[0]
  assert.equal(sent.userId, recipient); assert.equal(sent.category, 'community_updates')
  assert.match(sent.title, /Alex/); assert.equal(sent.email, undefined)
  assert.equal(sent.actionUrl, kind === 'follow' ? `tilly://person/${actor}` : `tilly://cat/${catKey}`)
  assert.equal(sent.imageUrl, `https://cdn.foir.dev/${kind === 'follow' ? 'avatar' : 'photo'}.png`)
  await notifySocial(f.foir, notice)
  assert.deepEqual(f.sends[1], sent, 'A duplicate dispatch sends the same platform idempotency key and payload')
})
test('self-actions perform no profile lookup or send', async () => {
  const f = fixture(); assert.equal(await notifySocial(f.foir, {kind: 'like', actor, recipient: actor, actionId: 'actionabcdefghij', catKey}), false)
  assert.equal(f.reads.length, 0); assert.equal(f.sends.length, 0)
})
test('notification copy resolves through shared words and is plain text', async () => {
  const f = fixture({entries: [{key: 'follow.title', value: '{name} follows your cats'}, {key: 'follow.body', value: 'View their profile'}]})
  await notifySocial(f.foir, {kind: 'follow', actor, recipient, actionId: 'actionabcdefghij'})
  assert.equal(f.sends[0].title, 'Alex follows your cats'); assert.equal(f.sends[0].message, 'View their profile')
})
test('delivery failures propagate so Fóir can retry the native hook', async () => {
  for (const options of [{accepted: false}, {offline: true}]) {
    const f = fixture(options)
    await assert.rejects(notifySocial(f.foir, {kind: 'follow', actor, recipient, actionId: 'actionabcdefghij'}))
  }
})
test('missing cat destination refuses the notification instead of inventing a deep link', async () => {
  const f = fixture(); await assert.rejects(notifySocial(f.foir, {kind: 'like', actor, recipient, actionId: 'actionabcdefghij'}))
  assert.equal(f.sends.length, 0)
})

const actionId = 'actionabcdefghij'
const event = modelKey => ({trigger: {type: 'lifecycle'}, input: {recordId: actionId, modelKey}, context: {userId: actor}})
function hookFixture({model = 'capture-like', source, media, blocked = false} = {}) {
  const f = fixture(), queries = [], copy = f.foir.request
  f.foir.request = async (query, variables) => {
    queries.push(query)
    if (query.includes('SocialSource')) return {source: source === undefined ? {_id: actionId, _ownerId: actor, catKey, photoKey: 'photoabcdefghij', followeeId: recipient, reshareOf: 'postabcdefghijk', audience: 'public'} : source}
    if (query.includes('SocialCanonicalMedia')) return {media: media === undefined ? {_ownerId: recipient, catKey, state: 'ready', photo: {url: 'https://cdn.foir.dev/photo.png'}} : media}
    if (query.includes('SocialLegacyMedia')) return {media: null}
    if (query.includes('SocialNotificationBlock')) return {userBlocks: {edges: blocked && variables.owner === recipient ? [{node: {_id: 'block'}}] : []}}
    return copy(query, variables)
  }
  return {...f, queries, event: event(model)}
}
for (const model of ['capture-like', 'capture-post', 'follow-request']) test(`native ${model} creation derives its recipient from the stored record`, async () => {
  const f = hookFixture({model}); f.event.input.recipientId = 'attackerabcdefghij'
  assert.equal(await socialNotificationEvent(f.foir, f.event, actor), true)
  assert.equal(f.sends[0].userId, recipient)
})
test('manual calls, foreign owners and cat-follow hooks cannot send', async () => {
  const manual = hookFixture(); manual.event.trigger.type = 'manual'
  for (const f of [manual, hookFixture({model: 'cat-follow'})]) {
    await assert.rejects(socialNotificationEvent(f.foir, f.event, actor)); assert.equal(f.sends.length, 0)
    assert.equal(f.queries.length, 0)
  }
  const foreign = hookFixture({source: {_id: actionId, _ownerId: recipient, photoKey: 'photoabcdefghij', catKey}})
  await assert.rejects(socialNotificationEvent(foreign.foir, foreign.event, actor), /owner changed/)
  assert.equal(foreign.sends.length, 0)
})
test('undone actions, inaccessible media, original posts and private reposts send nothing', async () => {
  const source = {_id: actionId, _ownerId: actor, photoKey: 'photoabcdefghij', catKey}
  for (const f of [hookFixture({source: null}), hookFixture({media: null}), hookFixture({model: 'capture-post', source}),
    hookFixture({model: 'capture-post', source: {...source, reshareOf: 'postabcdefghijk', audience: 'private'}})]) {
    assert.equal(await socialNotificationEvent(f.foir, f.event, actor), false); assert.equal(f.sends.length, 0)
  }
})
test('a counterpart block suppresses delivery and an unavailable check fails for native retry', async () => {
  const f = hookFixture({blocked: true})
  assert.equal(await socialNotificationEvent(f.foir, f.event, actor), false); assert.equal(f.sends.length, 0)
  const unavailable = hookFixture(), request = unavailable.foir.request
  unavailable.foir.request = async (query, variables) => {if (query.includes('SocialNotificationBlock')) throw Error('unavailable'); return request(query, variables)}
  await assert.rejects(socialNotificationEvent(unavailable.foir, unavailable.event, actor)); assert.equal(unavailable.sends.length, 0)
})
