import test from 'node:test'
import assert from 'node:assert/strict'
import { operationFetch, captureRefusalResponse, captureSliceResult } from './dispatch.ts'
import { CaptureRefusal } from './capture-contract.ts'
import { runAsyncSlice } from './async.ts'
const env = {
  FOIR_PROJECT_ID: 'example-project',
  FOIR_TENANT_ID: 'example-tenant',
}
test('capture refusals preserve their intended status and safe message', async () => {
  for (const [status, message] of [
    [400, 'Save a fresh private camera photo before tagging cats.'],
    [403, 'Only the person who took this photo can edit its cats.'],
    [409, 'The cats changed in another window. Reload before editing.'],
  ]) {
    const response = captureRefusalResponse(new CaptureRefusal(status, message))
    assert.equal(response.status, status)
    assert.equal(response.headers.get('cache-control'), 'no-store')
    assert.deepEqual(await response.json(), { ok: false, error: message })
  }
  assert.equal(captureRefusalResponse(new Error('private internal details')), null)
  assert.equal(captureRefusalResponse({ status: 403, message: 'untrusted lookalike' }), null)
})
test('an asynchronous capture refusal awaits a terminal callback before acknowledgement', { timeout: 2000 }, async () => {
  const original = globalThis.fetch
  const calls = []
  let release
  const callback = new Promise(resolve => { release = resolve })
  try {
    globalThis.fetch = async (_url, options) => {
      calls.push(JSON.parse(options.body))
      await callback
      return Response.json({ status: 'failed', cancelled: false, applied: true })
    }
    const result = runAsyncSlice({
      executionId: 'fixture-execution',
      callback: { endpoint: 'https://api-dev.foir.dev/v1/steps/fixture-execution/reply', token: 'fixture-callback-token', signingKey: 'fixture-signing-key' },
    }, 'https://api-dev.foir.dev', () => captureSliceResult(async () => {
      throw new CaptureRefusal(400, 'Save a fresh private camera photo before tagging cats.')
    }))
    let acknowledged = false
    void result.then(() => { acknowledged = true })
    while (calls.length === 0) await new Promise(resolve => setTimeout(resolve, 1))
    assert.equal(acknowledged, false)
    assert.deepEqual(calls[0], { failure: {
      code: 'OPERATION_FAILED',
      message: 'Save a fresh private camera photo before tagging cats.',
      retryable: false,
    } })
    release()
    assert.equal((await result).status, 202)
    const failure = new Error('unexpected internal failure')
    await assert.rejects(captureSliceResult(async () => { throw failure }), error => error === failure)
  } finally {
    release?.()
    globalThis.fetch = original
  }
})
test('plain user bearers cannot call operation routes directly', async () => {
  const response = await operationFetch(
    new Request('https://site.example/operations/save_profile', {
      method: 'POST',
      headers: { authorization: 'Bearer user-session' },
      body: '{}',
    }),
    env,
  )
  assert.equal(response.status, 401)
})
test('unknown routes and methods never reach handlers', async () => {
  assert.equal(
    (
      await operationFetch(
        new Request('https://site.example/operations/unknown'),
        env,
      )
    ).status,
    404,
  )
  assert.equal(
    (
      await operationFetch(
        new Request('https://site.example/operations/constructor'),
        env,
      )
    ).status,
    404,
  )
  assert.equal(
    (
      await operationFetch(
        new Request('https://site.example/operations/save_profile'),
        env,
      )
    ).status,
    405,
  )
})
test('marketing traffic falls through; public manifest holds no credentials', async () => {
  assert.equal(
    await operationFetch(new Request('https://site.example/'), env),
    null,
  )
  const response = await operationFetch(
    new Request('https://site.example/_foir/apps/tilly.json'),
    env,
  )
  assert.equal(response.status, 200)
  const manifest = await response.json()
  assert.ok(
    manifest.operations.every((op) => op.endpoint.startsWith('/operations/')),
  )
  assert.equal(manifest.credentials.schema.properties.openai.default, undefined)
})
test('controlled manifest relocation preserves signed operation routes', async () => {
  const moved = {...env, TILLY_CANONICAL_ORIGIN:'https://new.example'}
  const response = await operationFetch(new Request('https://old.example/_foir/apps/tilly.json'),moved)
  assert.equal(response.status,307)
  assert.equal(response.headers.get('location'),'https://new.example/_foir/apps/tilly.json')
  assert.equal(response.headers.get('cache-control'),'no-store')
  assert.equal((await operationFetch(new Request('https://old.example/operations/save_profile'),moved)).status,405)
  assert.equal((await operationFetch(new Request('https://new.example/_foir/apps/tilly.json'),moved)).status,200)
  assert.equal((await operationFetch(new Request('https://old.example/_foir/apps/tilly.json'),{...env,TILLY_CANONICAL_ORIGIN:'http://new.example'})).status,503)
})

test('challenge analysis and announcements refuse plain user credentials before any handler work', async () => {
  for (const key of ['evaluate_challenges','challenge_announcements','challenge_announcements_preview']) {
    const response=await operationFetch(new Request(`https://site.example/operations/${key}`, {
      method:'POST',headers:{authorization:'Bearer user-session'},body:'{}',
    }), {...env,TILLY_CHALLENGES_ENABLED:'true',TILLY_CHALLENGE_ANNOUNCEMENTS_ENABLED:'true'})
    assert.equal(response.status,401)
  }
})
