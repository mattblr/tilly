import assert from 'node:assert/strict'
import test from 'node:test'
import { uploadOperationImage, readOperationPhoto } from './files.ts'
import { operationApi } from './environment.ts'
const ticket = {
  uploadFile: {
    uploadUrl: 'https://storage.example/object',
    landed: {
      endpoint: '/v1/uploads/example/landed',
      token: 'fixture-upload-token',
    },
  },
}
test('operation uploads start private and return the landed file identity', async () => {
  const original = globalThis.fetch,
    calls = []
  let document
  try {
    globalThis.fetch = async (url, options) => {
      calls.push({ url: String(url), options })
      return calls.length === 1
        ? new Response('')
        : Response.json({ id: 'file_finished123' })
    }
    const id = await uploadOperationImage(
      {
        raw: async (query) => {
          document = query
          return ticket
        },
      },
      new Uint8Array([1, 2, 3]),
      'trial.png',
    )
    assert.equal(id, 'file_finished123')
    assert.match(document, /visibility: PRIVATE/)
    assert.deepEqual(
      calls.map((call) => call.options.method),
      ['PUT', 'POST'],
    )
    assert.equal(
      new Headers(calls[0].options.headers).get('X-Foir-Token'),
      null,
    )
    assert.equal(
      new Headers(calls[1].options.headers).get('X-Foir-Token'),
      'fixture-upload-token',
    )
    assert.equal(
      calls[1].url,
      'https://api.foir.dev/v1/uploads/example/landed',
    )
    assert.ok(calls.every((call) => call.options.redirect === 'manual'))
  } finally {
    globalThis.fetch = original
  }
})
test('operation upload refuses a cross-origin landing before sending bytes or tokens', async () => {
  const original = globalThis.fetch
  try {
    globalThis.fetch = async () => assert.fail('No request should be sent')
    await assert.rejects(
      uploadOperationImage(
        {
          raw: async () => ({
            uploadFile: {
              ...ticket.uploadFile,
              landed: {
                ...ticket.uploadFile.landed,
                endpoint: 'https://attacker.example/landed',
              },
            },
          }),
        },
        new Uint8Array([1]),
        'art.png',
      ),
      /destination/,
    )
  } finally {
    globalThis.fetch = original
  }
})
test('operation API origin defaults to production Fóir and cannot include credentials, a path or HTTP', () => {
  assert.equal(operationApi(), 'https://api.foir.dev')
  assert.equal(operationApi('https://api.example'), 'https://api.example')
  for (const origin of [
    'http://api.example',
    'https://api.example/path',
    'https://user:password@api.example',
  ])
    assert.throws(() => operationApi(origin))
})

test('provider source reads refuse external hosts and redirects and validate supported image bytes', async () => {
  const original = globalThis.fetch
  let called = 0
  try {
    globalThis.fetch = async (_url, options) => {
      called++
      assert.equal(options.redirect, 'manual')
      return new Response(new Uint8Array([1, 2, 3]), {
        headers: { 'Content-Type': 'image/jpeg' },
      })
    }
    await assert.rejects(
      readOperationPhoto('https://other.example/photo'),
      /configured/,
    )
    assert.equal(called, 0)
    assert.equal(
      (await readOperationPhoto('https://cdn.foir.dev/photo')).length,
      3,
    )
    globalThis.fetch = async () =>
      new Response('oops', { headers: { 'Content-Type': 'text/html' } })
    await assert.rejects(
      readOperationPhoto('https://cdn.foir.dev/photo'),
      /supported/,
    )
  } finally {
    globalThis.fetch = original
  }
})
