import test from 'node:test'
import assert from 'node:assert/strict'
import { evaluateChallenges } from './evaluate-challenges.ts'
import manifest from './manifest.ts'

async function probe({ fields = {}, refused = false } = {}) {
  const fetchBefore = globalThis.fetch, logBefore = console.info
  const calls = [], logs = []
  try {
    console.info = (...args) => logs.push(args)
    globalThis.fetch = async (url, init) => {
      assert.equal(String(url), 'https://api.example.test/graphql')
      assert.equal(new Headers(init.headers).get('X-Foir-Token'), 'fixture-dispatch')
      assert.equal(new Headers(init.headers).has('Authorization'), false)
      const query = JSON.parse(init.body).query
      if (!query) return Response.json({ errors: [{ message: 'Persisted query fixture miss', extensions: { code: 'PERSISTED_QUERY_NOT_FOUND' } }] })
      calls.push(query)
      if (query.includes('appCredential'))
        return refused ? Response.json({ errors: [{ message: 'Fixture credential permission refused' }] }, { status: 403 })
          : Response.json({ data: { appCredential: { value: Buffer.from(JSON.stringify(fields)).toString('base64') } } })
      assert.match(query, /query CanonicalCapture/)
      return Response.json({ data: { capturePhoto: null } })
    }
    const response = await evaluateChallenges({ input: { captureId: 'fixturecapture001', revision: 'revision-1' }, executionId: 'fixture-run' }, {
      apiUrl: 'https://api.example.test', userId: 'fixtureactor00001',
      dispatch: { token: () => 'fixture-dispatch', context: 'operation=tilly.evaluate-challenges' },
    })
    assert.equal(response.status, 403)
    return { credentialReads: calls.filter(query => query.includes('appCredential')).length,
      availability: logs.find(args => args[0] === 'Tilly challenge provider availability')?.[1] }
  } finally { globalThis.fetch = fetchBefore; console.info = logBefore }
}
test('challenge analysis directly selects the general OpenAI field from the verified install owner', async () => {
  assert.deepEqual(await probe({ fields: { openai: 'fixture-general-key' } }), {
    credentialReads: 1, availability: { credentialConfigured: true },
  })
  const properties = manifest('https://site.example').credentials.schema.properties
  assert.ok(properties.openai)
  assert.equal(properties.challengeOpenAI, undefined)
})
test('missing or refused general credential never borrows another purpose field or calls a provider', async () => {
  for (const options of [
    { fields: { challengeOpenAI: 'fixture-unused-key', appearanceOpenAI: 'fixture-appearance-key', moderationOpenAI: 'fixture-moderation-key' } },
    { fields: { openai: '  ' } },
    { refused: true },
  ]) assert.deepEqual(await probe(options), {
    credentialReads: 1, availability: { credentialConfigured: false },
  })
})

