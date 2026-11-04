import assert from 'node:assert/strict'
import test from 'node:test'
import { endFollows, follow_user, share_capture, tidyFollowers } from './social.ts'
import { countsOf, profile_counts } from './people.ts'

const me = 'user00000000a', them = 'user00000000b', other = 'user00000000c'

/**
 * A Fóir double that enforces what Development showed: only a record's owner
 * may change it, delete it or change who it is shared with; anyone may write
 * a record for another user (attribute); a record is read by its owner, its
 * grantees, or whoever can read the audience its `viewers` names; a reference
 * must name a record the writer can read. Served through the real SDK transport.
 */
function project({ privacy = { [me]: 'public', [them]: 'public', [other]: 'public' } } = {}) {
  const rows = new Map()
  let sequence = 0, actor = null
  const add = (model, owner, data) => {
    const _id = `${model.slice(0, 6).toLowerCase()}${String(++sequence).padStart(9, '0')}`
    rows.set(_id, { _id, _model: model, _ownerId: owner, _visibility: 'PRIVATE', _grants: new Set(), ...data })
    return _id
  }
  const direct = (row, who) => row._ownerId === who || row._visibility === 'PUBLIC' || row._grants.has(who)
  const readable = (row, who) => direct(row, who) || (row.viewers && rows.has(row.viewers) && direct(rows.get(row.viewers), who))
  const of = (model, test = () => true, who = actor) => [...rows.values()].filter(row => row._model === model && (who === null || readable(row, who)) && test(row))
  const own = id => { const row = rows.get(id); if (!row || row._ownerId !== actor) throw new Error('record not found'); return row }
  const share = id => { const row = rows.get(id); if (!row || row._ownerId !== actor) throw new Error('you do not have permission to manage access on this resource'); return row }
  const viewersOf = (input, writer) => {
    if (input?.viewers?.disconnect === true) return null
    const id = input?.viewers?.id ?? input?.viewers?.connect?.id
    if (id && !(rows.has(id) && direct(rows.get(id), writer))) throw new Error('validation failed: viewers: names a record that does not exist or that you cannot read')
    return id
  }
  const page = (list, first = 100) => ({ page: { edges: list.slice(0, first).map(node => ({ node })), pageInfo: { hasNextPage: false, endCursor: null } } })
  const answer = (query, v) => {
    if (query.includes('query ChosenPrivacy(') || query.includes('query P(')) {
      const who = v.owner ?? v.t
      return { profiles: { totalCount: 1, edges: who in privacy ? [{ node: { privacy: privacy[who] } }] : [] } }
    }
    if (query.includes('query SocialBlock')) return { userBlocks: { edges: [] } }
    if (query.includes('query CountsAllowed')) return {
      profiles: { edges: v.p in privacy ? [{ node: { privacy: privacy[v.p] } }] : [] },
      audience: { edges: of('Audience', row => row._ownerId === v.p).map(node => ({ node })) } }
    if (query.includes('query Audience(') || query.includes('query TheirAudience')) return page(of('Audience', row => row._ownerId === v.owner))
    if (query.includes('query TidyAudience')) return { access: { grants: [...share(v.id)._grants].map(granteeId => ({ granteeId })) } }
    // Counts: Fóir aggregates over what the asking user may read.
    if (query.includes('followApprovalAggregate(')) {
      const list = of('FollowApproval', row => row.status === 'accepted' &&
        (query.includes('ownerId: { eq: $p }') ? row._ownerId === v.p : row.followerId === v.p))
      return { n: { truncated: false, groups: [{ key: null, count: list.length }] } }
    }
    if (query.includes('capturePhotoAggregate(') || query.includes('captureCatTagAggregate(')) return { n: { truncated: false, groups: [] } }
    if (query.includes('page: followRequests')) return page(of('FollowRequest', row =>
      (!v.follower || row._ownerId === v.follower) && (!v.followee || row.followeeId === v.followee) &&
      (!v.ids || v.ids.includes(row._id)) && (!v.me || row.followeeId === v.me) && (!v.p || (v.ids ? row.followeeId === v.p : row._ownerId === v.p))))
    if (query.includes('followApprovals(')) {
      const list = of('FollowApproval', row =>
        (!v.followee || row._ownerId === v.followee) && (!v.follower || row.followerId === v.follower) && (!v.me || row._ownerId === v.me) &&
        (!v.ids || v.ids.includes(row.requestId)) && (!v.p || (v.ids ? row.followerId === v.p : row._ownerId === v.p)) &&
        (!query.includes('status: { eq: "accepted" }') || row.status === 'accepted'))
      return page(list)
    }
    if (query.includes('query O(')) return { capturePost: rows.get(v.id) ?? null }
    if (query.includes('page: capturePosts')) return page(of('CapturePost', row => row._ownerId === v.me && row.photoKey === v.p && row.reshareOf))
    const create = /create(\w+)\(input:/.exec(query)
    if (create) {
      const viewers = viewersOf(v.input, actor)
      return { [`create${create[1]}`]: { record: { _id: add(create[1], v.owner ?? actor, { ...v.input, ...(viewers ? { viewers } : {}) }) } } }
    }
    const visibility = /set(\w+)Visibility/.exec(query)
    if (visibility) { const value = v.visibility ?? (query.includes('PUBLIC') ? 'PUBLIC' : v.v); share(v.id)._visibility = value; return { [`set${visibility[1]}Visibility`]: value } }
    const grant = /grant(\w+)Access/.exec(query)
    if (grant) { share(v.id)._grants.add(v.who); return { [`grant${grant[1]}Access`]: { granteeId: v.who } } }
    const revoke = /revoke(\w+)Access/.exec(query)
    if (revoke) { share(v.id)._grants.delete(v.who); return { [`revoke${revoke[1]}Access`]: 1 } }
    const update = /update(\w+)\(where/.exec(query)
    if (update) {
      const row = own(v.id)
      for (const [key, value] of Object.entries(v.data)) row[key] = key === 'viewers' ? viewersOf(v.data, actor) : value.set
      return { [`update${update[1]}`]: { record: { _id: v.id } } }
    }
    const remove = /delete(\w+)\(id/.exec(query)
    if (remove) { own(v.id); rows.delete(v.id); return { [`delete${remove[1]}`]: true } }
    throw new Error(`Unexpected request: ${query.slice(0, 100)}`)
  }
  const fetch = async (url, options) => {
    const { query, variables = {} } = JSON.parse(options.body)
    if (!query) return Response.json({ errors: [{ message: 'PersistedQueryNotFound', extensions: { code: 'PERSISTED_QUERY_NOT_FOUND' } }] })
    try { return Response.json({ data: answer(query, variables) }) }
    catch (error) { return Response.json({ errors: [{ message: error.message }] }) }
  }
  /** A data client acting as one user, or (null) one that reads every owner's records. */
  const as = who => ({ raw: async (q, v) => { const before = actor; actor = who; try { return structuredClone(answer(q, v ?? {})) } finally { actor = before } } })
  const audienceOf = owner => [...rows.values()].find(row => row._model === 'Audience' && row._ownerId === owner)
  return { rows, fetch, as, audienceOf, set actor(value) { actor = value },
    requests: (follower, followee) => of('FollowRequest', row => row._ownerId === follower && row.followeeId === followee, null),
    approvals: (followee, follower) => of('FollowApproval', row => row._ownerId === followee && row.followerId === follower, null),
    /** Whether `who` can read `owner`'s catches: through their audience record. */
    sees: (who, owner) => { const audience = audienceOf(owner); return !!audience && direct(audience, who) } }
}
const ingress = (userId, operation) => ({ userId, apiUrl: 'https://api.example.test', dispatch: { token: () => 'fixture-dispatch', context: `operation=${operation}` } })
let run = 0
async function as(p, userId, work, operation = 'follow_user') {
  const original = globalThis.fetch
  globalThis.fetch = p.fetch; p.actor = userId
  try { return await work({ executionId: `execution${String(++run).padStart(6, '0')}` }, ingress(userId, operation)) }
  finally { globalThis.fetch = original; p.actor = null }
}
const follow = (p, who, input) => as(p, who, (envelope, ingress) => follow_user(input, envelope, ingress))
/** Each user's audience exists from their profile's first save. */
async function profiles(p, privacy) {
  const { audienceFor } = await import('./audience.ts')
  for (const [who, value] of Object.entries(privacy)) await audienceFor(p.as(who), who, value)
}

test('a public user is followed at once: my request, their approval through their audience', async () => {
  const p = project(); await profiles(p, { [me]: 'public', [them]: 'public' })
  const out = await follow(p, me, { userId: them, following: true })
  assert.deepEqual([out.status, out.body.status], [200, 'accepted'])
  const [request] = p.requests(me, them), [approval] = p.approvals(them, me)
  assert.equal(request._ownerId, me); assert.deepEqual([...request._grants], [them]); assert.equal(request._visibility, 'PRIVATE')
  assert.equal(approval._ownerId, them); assert.equal(approval.status, 'accepted'); assert.equal(approval.viewers, p.audienceOf(them)._id)
  assert.equal((await follow(p, me, { userId: them, following: true })).body.status, 'accepted')
  assert.equal(p.approvals(them, me).length, 1)
})

test('a private user gets a request only they can read, and accepting lets me see their catches', async () => {
  const p = project({ privacy: { [me]: 'public', [them]: 'private' } }); await profiles(p, { [me]: 'public', [them]: 'private' })
  assert.equal((await follow(p, me, { userId: them, following: true })).body.status, 'requested')
  assert.equal((await follow(p, me, { userId: them, following: true })).body.status, 'requested')
  assert.equal(p.requests(me, them).length, 1); assert.equal(p.approvals(them, me).length, 0)
  assert.equal(p.sees(me, them), false)
  assert.equal((await follow(p, them, { userId: me, follower: 'accept' })).body.status, 'accepted')
  const [approval] = p.approvals(them, me)
  assert.equal(approval._ownerId, them); assert.equal(approval.requestId, p.requests(me, them)[0]._id)
  assert.equal(p.sees(me, them), true)
  assert.equal((await follow(p, me, { userId: them, following: true })).body.status, 'accepted')
})

test('declining or removing takes access back; following again asks again', async () => {
  const p = project({ privacy: { [me]: 'public', [them]: 'private' } }); await profiles(p, { [me]: 'public', [them]: 'private' })
  await follow(p, me, { userId: them, following: true })
  await follow(p, them, { userId: me, follower: 'accept' })
  await follow(p, them, { userId: me, follower: 'remove' })
  assert.equal(p.sees(me, them), false)
  const [removed] = p.approvals(them, me)
  // No audience: only them, and me through my grant, read it.
  assert.equal(removed.status, 'removed'); assert.equal(removed.viewers, null)
  assert.equal([...p.rows.values()].filter(r => r._model === 'Audience' && r._ownerId === them).length, 1)
  assert.ok(removed._grants.has(me), 'my app can tell I was removed')

  assert.equal((await follow(p, me, { userId: them, following: true })).body.status, 'requested')
  assert.equal(p.requests(me, them).length, 1)
  await follow(p, them, { userId: me, follower: 'decline' })
  const latest = p.requests(me, them)[0]
  assert.equal(p.approvals(them, me).find(row => row.requestId === latest._id).status, 'declined')
  assert.equal(p.sees(me, them), false)
})

test('only the user asked can answer, and only an actual request', async () => {
  const p = project({ privacy: { [me]: 'public', [them]: 'private', [other]: 'public' } }); await profiles(p, { [me]: 'public', [them]: 'private', [other]: 'public' })
  await follow(p, me, { userId: them, following: true })
  assert.equal((await follow(p, other, { userId: me, follower: 'accept' })).status, 404)
  assert.equal(p.approvals(other, me).length, 0)
  assert.equal((await follow(p, me, { userId: them, follower: 'maybe' })).status, 400)
})

test('unfollowing ends the follow at once; the private user’s app takes back the access when it tidies', async () => {
  const p = project({ privacy: { [me]: 'public', [them]: 'private' } }); await profiles(p, { [me]: 'public', [them]: 'private' })
  await follow(p, me, { userId: them, following: true })
  await follow(p, them, { userId: me, follower: 'accept' })
  assert.equal((await follow(p, me, { userId: them, following: false })).body.active, false)
  assert.equal(p.requests(me, them).length, 0)
  // Fóir lets only the owner take a grant back.
  assert.equal(p.sees(me, them), true)
  // I count as their follower while I keep their grant, until their app tidies.
  assert.equal((await countsOf(p.as(them), them)).followers, 1)
  await tidyFollowers(p.as(them), them)
  assert.equal(p.sees(me, them), false)
  assert.equal(p.approvals(them, me)[0].status, 'left')
  assert.deepEqual(await countsOf(p.as(them), them), { followers: 0, following: 0, cats: 0, catches: 0 })
  assert.equal((await countsOf(p.as(me), me)).following, 0)
})

test('tidying also takes back a grant left without any standing follow', async () => {
  const p = project({ privacy: { [me]: 'public', [them]: 'private' } }); await profiles(p, { [me]: 'public', [them]: 'private' })
  const { setFollowerAccess } = await import('./audience.ts')
  await setFollowerAccess(p.as(them), p.audienceOf(them)._id, other, true)
  await tidyFollowers(p.as(them), them)
  assert.equal(p.sees(other, them), false)
})

test('counts are what the asker may read; a follow counts while its approval is accepted', async () => {
  const p = project({ privacy: { [me]: 'private', [them]: 'private', [other]: 'public' } }); await profiles(p, { [me]: 'private', [them]: 'private', [other]: 'public' })
  await follow(p, me, { userId: them, following: true })
  await follow(p, them, { userId: me, follower: 'accept' })
  await follow(p, me, { userId: other, following: true })
  await follow(p, other, { userId: them, following: true })
  // Their accepted follower sees a private user's counts.
  assert.deepEqual(await countsOf(p.as(me), them), { followers: 1, following: 0, cats: 0, catches: 0 })
  // Fóir confines a run to what its user may read: anyone else sees 0.
  assert.deepEqual(await countsOf(p.as(other), them), { followers: 0, following: 0, cats: 0, catches: 0 })
  // A public user's approvals are public: who I follow counts for anyone
  // where they can read the approval.
  assert.equal((await countsOf(p.as(them), me)).following, 2)
  assert.equal((await countsOf(p.as(other), me)).following, 1)
  // A pending request counts nowhere.
  assert.equal((await countsOf(p.as(them), other)).followers, 1)
})

test('a private user’s counts are for them and their accepted followers; a public user’s for anyone', async () => {
  const p = project({ privacy: { [me]: 'private', [them]: 'private', [other]: 'public' } }); await profiles(p, { [me]: 'private', [them]: 'private', [other]: 'public' })
  const counts = (who, userId) => as(p, who, (envelope, ingress) => profile_counts({ userId }, envelope, ingress), 'profile_counts')
  await follow(p, me, { userId: them, following: true })
  assert.equal((await counts(me, them)).status, 403, 'a request is not enough')
  await follow(p, them, { userId: me, follower: 'accept' })
  assert.deepEqual((await counts(me, them)).body, { ok: true, followers: 1, following: 0, cats: 0, catches: 0 })
  assert.equal((await counts(them, them)).status, 200)
  const refused = await counts(other, them)
  assert.deepEqual([refused.status, refused.body.error], [403, 'This account is private.'])
  assert.equal((await counts(them, other)).status, 200)
})

test('blocking ends following both ways, with the access it gave', async () => {
  const p = project({ privacy: { [me]: 'private', [them]: 'private' } }); await profiles(p, { [me]: 'private', [them]: 'private' })
  await follow(p, me, { userId: them, following: true })
  await follow(p, them, { userId: me, follower: 'accept' })
  await follow(p, them, { userId: me, following: true })
  await follow(p, me, { userId: them, follower: 'accept' })
  await endFollows(p.as(me), me, them)
  assert.equal(p.requests(me, them).length, 0)
  assert.equal(p.sees(them, me), false)
  assert.deepEqual(p.approvals(me, them).map(row => row.status), ['removed'])
})

test('a reshare follows the resharer’s profile setting, and only a public post can be reshared', async () => {
  const p = project({ privacy: { [me]: 'private', [them]: 'public' } }); await profiles(p, { [me]: 'private', [them]: 'public' })
  const original = { catKey: 'cat00000000001', photoKey: 'photo000000001', area: null }
  const make = async audience => (await p.as(them).raw('mutation C($input: CreateCapturePostInput!, $owner: ID, $key: String) { createCapturePost(input: $input) { record { _id } } }',
    { input: { ...original, audience }, owner: them })).createCapturePost.record._id
  const publicPost = await make('public'), privatePost = await make('private')
  for (const id of [publicPost, privatePost]) p.rows.get(id)._visibility = 'PUBLIC'
  const share = input => as(p, me, (envelope, ingress) => share_capture(input, envelope, ingress), 'tilly.share-capture')
  assert.equal((await share({ reshareOf: privatePost, comment: 'Look' })).status, 403)
  const out = await share({ reshareOf: publicPost, comment: 'Look' })
  assert.equal(out.status, 200)
  const repost = p.rows.get(out.body.id)
  assert.equal(repost._ownerId, me); assert.equal(repost.reshareOf, publicPost)
  assert.equal(repost.viewers, p.audienceOf(me)._id); assert.equal(repost.audience, 'private')
  assert.equal(repost._visibility, 'PRIVATE')
})
