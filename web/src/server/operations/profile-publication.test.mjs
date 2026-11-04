import test from 'node:test'
import assert from 'node:assert/strict'
import { save_profile } from './social.ts'

const page = rows => ({ edges: rows.map(node => ({ node })), pageInfo: { hasNextPage: false, endCursor: null } })

test('new onboarding and a partially-created profile both finish publication through the dispatch client', async () => {
  const original = globalThis.fetch
  try {
    for (const retry of [false, true]) {
      let profile = retry, publicPhoto = false, visibility = 'PRIVATE', imageReads = 0, creates = 0
      globalThis.fetch = async (url, options) => {
        if (new URL(url).origin === 'https://cdn.example.test') {
          imageReads++
          return publicPhoto ? new Response('access transition', { status: 403 })
            : new Response(new Uint8Array([1, 2, 3]), { headers: { 'Content-Type': 'image/jpeg' } })
        }
        assert.equal(new URL(url).origin, 'https://api.example.test')
        const { query, variables: vars = {} } = JSON.parse(options.body)
        if (!query) return Response.json({ errors: [{ message: 'PersistedQueryNotFound', extensions: { code: 'PERSISTED_QUERY_NOT_FOUND' } }] })
        let data
        if (query.includes('query Page')) data = { page: page([]) }
        else if (query.includes('query Mine')) data = { profiles: page(profile ? [{ _id: 'profile', photo: null }] : []) }
        else if (query.includes('SafetyFile')) data = { file: { id: 'profilefile123456', url: 'https://cdn.example.test/profilefile123456?at=fixture', mimeType: 'image/jpeg' } }
        else if (query.includes('SafetyRows')) data = { page: page(vars.digest ? [{ _id: 'approved', digest: vars.digest, status: 'approved' }] : []) }
        else if (query.includes('setFileVisibility')) { publicPhoto = vars.visibility === 'PUBLIC'; data = { setFileVisibility: vars.visibility } }
        else if (query.includes('createProfile')) { profile = true; creates++; data = { createProfile: { record: { _id: 'profile' } } } }
        else if (query.includes('updateProfile')) data = { updateProfile: { record: { _id: 'profile' } } }
        else if (query.includes('SafetyProfile')) data = { profile: { displayName: 'Fixture', username: 'fixture', bio: '', photo: { url: 'https://cdn.example.test/profilefile123456' } } }
        else if (query.includes('PublicationProfile')) data = { profile: { photo: { url: 'https://cdn.example.test/profilefile123456' } } }
        else if (query.includes('setProfileVisibility')) { visibility = query.includes('PUBLIC') ? 'PUBLIC' : 'PRIVATE'; data = { setProfileVisibility: visibility } }
        else throw Error(`Unexpected capability: ${query}`)
        return Response.json({ data })
      }
      const result = await save_profile({ displayName: 'Fixture', username: 'fixture', photoFileId: 'profilefile123456', privacy: 'public' },
        { executionId: 'fixture-attempt' }, { userId: 'creator', apiUrl: 'https://api.example.test', filesOrigin: 'https://cdn.example.test',
          dispatch: { token: () => 'fixture-dispatch', context: 'operation=tilly.save-profile' }, safety: { enabled: true } })
      assert.equal(result.status, 200)
      assert.equal(result.body.id, 'profile')
      assert.equal(visibility, 'PUBLIC')
      assert.equal(publicPhoto, true)
      assert.equal(imageReads, 1)
      assert.equal(creates, retry ? 0 : 1)
    }
  } finally { globalThis.fetch = original }
})
