import assert from 'node:assert/strict'
import test from 'node:test'
import { uploadPhoto, uploadSlot } from './uploads'
import type { AppClient } from './data'
const slot = {
  uploadId: 'examplefile12345',
  uploadUrl: 'https://storage.example/photo',
  landed: { endpoint: '/landing/photo', token: 'scoped-upload-token' },
}
test('upload destinations keep landing tokens on the selected platform', () => {
  assert.equal(
    uploadSlot(slot, 'https://api.example').landing,
    'https://api.example/landing/photo',
  )
  for (const value of [
    { ...slot, uploadUrl: 'http://storage.example/photo' },
    {
      ...slot,
      landed: { ...slot.landed, endpoint: 'https://other.example/landing' },
    },
    { ...slot, landed: { endpoint: '/landing' } },
  ])
    assert.throws(() => uploadSlot(value, 'https://api.example'))
})
test('private uploads put bytes before landing and never attach user or API credentials to storage', async () => {
  const original = globalThis.fetch,
    calls: Array<{ url: string; init: RequestInit | undefined }> = []
  let args: unknown
  const client = {
    ns: {
      files: {
        uploadFile: async (input: unknown) => {
          args = input
          return slot
        },
      },
    },
  } as unknown as AppClient
  try {
    globalThis.fetch = async (url, init) => {
      calls.push({ url: String(url), init })
      return Response.json({ id: 'finishedfile12345' })
    }
    const blob = new Blob(['jpeg'], { type: 'image/jpeg' })
    assert.equal(
      await uploadPhoto(
        client,
        blob,
        'https://api.example',
        new AbortController().signal,
      ),
      'finishedfile12345',
    )
    assert.equal((args as Record<string, unknown>).visibility, 'PRIVATE')
    assert.deepEqual(
      calls.map((call) => call.init?.method),
      ['PUT', 'POST'],
    )
    assert.equal(new Headers(calls[0].init?.headers).get('X-Foir-Token'), null)
    assert.equal(
      new Headers(calls[1].init?.headers).get('X-Foir-Token'),
      'scoped-upload-token',
    )
    assert.ok(
      calls.every(
        (call) =>
          call.init?.redirect === 'error' && call.init.credentials === 'omit',
      ),
    )
  } finally {
    globalThis.fetch = original
  }
})
test('failed storage PUT never lands; an aborted upload never starts', async () => {
  const original = globalThis.fetch
  let starts = 0,
    requests = 0
  const client = {
    ns: {
      files: {
        uploadFile: async () => {
          starts++
          return slot
        },
      },
    },
  } as unknown as AppClient
  try {
    globalThis.fetch = async () => {
      requests++
      return new Response('', { status: 503 })
    }
    await assert.rejects(
      uploadPhoto(
        client,
        new Blob(['jpeg']),
        'https://api.example',
        new AbortController().signal,
      ),
      /couldn’t upload/,
    )
    assert.equal(requests, 1)
    const controller = new AbortController()
    controller.abort()
    await assert.rejects(
      uploadPhoto(
        client,
        new Blob(['jpeg']),
        'https://api.example',
        controller.signal,
      ),
    )
    assert.equal(starts, 1)
  } finally {
    globalThis.fetch = original
  }
})
