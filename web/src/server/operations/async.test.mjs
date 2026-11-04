import test from 'node:test'
import assert from 'node:assert/strict'
import { continueRun, CONTINUATION_MEDIA_TYPE } from '@foir/sdk/server'
import { runAsyncSlice } from './async.ts'
const payload = {
  executionId: 'fixture-execution',
  callback: {
    endpoint: 'https://api-dev.foir.dev/v1/steps/fixture-execution/reply',
    token: 'fixture-callback-token',
    signingKey: 'fixture-signing-key',
  },
}
test('native async operation awaits both the work and its callback before acknowledgement', async () => {
  const original = globalThis.fetch,
    calls = []
  let release
  const work = new Promise((resolve) => {
    release = resolve
  })
  try {
    globalThis.fetch = async (url, options) => {
      calls.push({ url: String(url), body: JSON.parse(options.body) })
      return Response.json({
        status: 'completed',
        cancelled: false,
        applied: true,
      })
    }
    const result = runAsyncSlice(
      payload,
      'https://api-dev.foir.dev',
      async () => {
        await work
        return { status: 200, body: { ok: true, id: 'saved' } }
      },
    )
    await Promise.resolve()
    assert.equal(calls.length, 0)
    release()
    assert.equal((await result).status, 202)
    assert.deepEqual(calls[0].body, { result: { ok: true, id: 'saved' } })
  } finally {
    globalThis.fetch = original
  }
})
test('continuation returns control to Fóir without a terminal callback or detached work', async () => {
  const original = globalThis.fetch
  try {
    globalThis.fetch = async () =>
      assert.fail('A continuation must not complete its run')
    const result = await runAsyncSlice(
      payload,
      'https://api-dev.foir.dev',
      async () => continueRun({ cursor: 'sub_next' }),
    )
    assert.equal(result.status, 200)
    assert.equal(result.headers.get('Content-Type'), CONTINUATION_MEDIA_TYPE)
    assert.equal((await result.json()).cursor, 'sub_next')
  } finally {
    globalThis.fetch = original
  }
})
test('a transient failure remains a failed dispatch for Fóir retry; missing async authority is refused', async () => {
  await assert.rejects(
    runAsyncSlice(payload, 'https://api-dev.foir.dev', async () => {
      throw new Error('temporary provider outage')
    }),
    /temporary/,
  )
  await assert.rejects(
    runAsyncSlice(
      { executionId: 'fixture' },
      'https://api-dev.foir.dev',
      async () => assert.fail(),
    ),
    /asynchronous/,
  )
})
