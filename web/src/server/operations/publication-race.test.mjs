import test from 'node:test'
import assert from 'node:assert/strict'
import { showProfile } from './social.ts'
import { withContentSafety } from './content-safety.ts'

const page = rows => ({ page: { edges: rows.map(node => ({ node })), pageInfo: { hasNextPage: false, endCursor: null } } })
const ingress = { userId: 'creator', safety: { enabled: true } }

/** A reviewer persists a hold while a stale save is still showing the
 * profile. Inspect the final visibility, not just the answer. */
function profilePublication(trigger) {
  let held = false, visibility = 'PRIVATE'
  const trace = []
  const client = withContentSafety({ raw: async (query, vars = {}) => {
    if (query.includes('SafetyProfile')) return { profile: { displayName: 'Fixture', username: 'fixture', bio: '', photo: null } }
    if (query.includes('PublicationProfile')) return { profile: { photo: null } }
    if (query.includes('SafetyRows')) {
      if (vars.digest) return page([{ _id: 'approved', digest: vars.digest, status: 'approved' }])
      if (trigger === 'read-failure' && visibility === 'PUBLIC') throw Error('hold read unavailable')
      return page(held ? [{ _id: 'held' }] : [])
    }
    if (query.includes('setProfileVisibility')) {
      visibility = query.includes('PUBLIC') ? 'PUBLIC' : 'PRIVATE'; trace.push(visibility)
      if (trigger === 'hold' && visibility === 'PUBLIC') held = true
      return { setProfileVisibility: visibility }
    }
    throw Error(`Unexpected capability: ${query}`)
  } }, ingress)
  return { client, trace, get visibility() { return visibility } }
}

test('an unheld profile shows; a hold placed while it was shown wins', async () => {
  const allowed = profilePublication('none')
  assert.equal(await showProfile(allowed.client, 'profile'), 'public')
  assert.equal(allowed.visibility, 'PUBLIC')
  const racing = profilePublication('hold')
  assert.equal(await showProfile(racing.client, 'profile'), 'private')
  assert.equal(racing.visibility, 'PRIVATE')
  assert.deepEqual(racing.trace, ['PUBLIC', 'PRIVATE'])
})

test('a failed final hold read hides the profile before reporting the failure', async () => {
  const failing = profilePublication('read-failure')
  await assert.rejects(showProfile(failing.client, 'profile'), /hold read unavailable/)
  assert.equal(failing.visibility, 'PRIVATE')
})
