import { test } from 'node:test'
import assert from 'node:assert/strict'
import { setup_status, providerFields } from './setup-status.ts'
import manifest from './manifest.ts'

const ingress = { apiUrl: 'https://api.example.test',
  dispatch: { token: () => 'fixture-dispatch', context: 'operation=tilly.setup-status' } }

async function run(fields, webhookUrl = 'https://api.example.test/apps/project/tilly/webhook/signed') {
  const original = globalThis.fetch
  try {
    globalThis.fetch = async (input, init) => {
      assert.equal(String(input), 'https://api.example.test/graphql')
      assert.equal(new Headers(init.headers).get('x-foir-token'), 'fixture-dispatch')
      const { query } = JSON.parse(init.body)
      if (!query) return Response.json({ errors: [{ message: 'PersistedQueryNotFound', extensions: { code: 'PERSISTED_QUERY_NOT_FOUND' } }] })
      if (query.includes('integrationConfig'))
        return Response.json({ data: { integrationConfig: { name: 'tilly', enabled: true, webhookUrl, config: {}, sources: [], sinks: [], targetModels: [] } } })
      if (query.includes('appCredential'))
        return Response.json({ data: { appCredential: { value: Buffer.from(JSON.stringify(fields)).toString('base64') } } })
      throw new Error(`Unexpected request: ${query.slice(0, 80)}`)
    }
    return await setup_status({}, {}, ingress)
  } finally { globalThis.fetch = original }
}

test('setup status gives the webhook address and the missing provider keys, never a value', async () => {
  const answer = await run({ openai: 'fixture-openai-value', revenueCatApiKey: 'fixture-rc-value', stripeSecretKey: '  ' })
  assert.equal(answer.status, 200)
  assert.equal(answer.body.webhookUrl, 'https://api.example.test/apps/project/tilly/webhook/signed')
  assert.deepEqual(answer.body.missing, providerFields.filter(f => !['openai', 'revenueCatApiKey'].includes(f)))
  assert.equal(JSON.stringify(answer.body).includes('fixture-'), false)
})

test('an app with no inbound address reports none', async () => {
  const answer = await run(Object.fromEntries(providerFields.map(f => [f, 'set'])), '')
  assert.equal(answer.body.webhookUrl, '')
  assert.deepEqual(answer.body.missing, [])
})

test('the console can run setup status, and the operation reads only config and credentials', () => {
  const app = manifest('https://site.example')
  const op = app.operations.find(o => o.key === 'setup-status')
  assert.deepEqual([...op.grants].sort(), ['appconfig:read', 'appsecrets:read'])
  assert.ok(app.ui.placements[0].grants.includes('operations:execute:tilly.setup-status'))
})
