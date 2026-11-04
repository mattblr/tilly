import assert from 'node:assert/strict'
import test from 'node:test'
import { serveProfilePhoto } from './social.ts'

test('an older private avatar is opened using its file id, without its signed token', async () => {
  const calls = []
  const foir = {
    raw: async (query, variables) => { calls.push({ query, variables }); return { setFileVisibility: variables.visibility } },
  }
  await serveProfilePhoto(foir, {
    url: 'https://cdn-dev.foir.dev/files/abcdefghij123456?at=private-token',
  })
  assert.equal(calls.length, 1)
  assert.match(calls[0].query, /setFileVisibility/)
  assert.deepEqual(calls[0].variables, {
    id: 'abcdefghij123456',
    visibility: 'PUBLIC',
  })
})

test('a new upload is opened directly, before the profile needs a CDN link', async () => {
  const foir = {
    raw: async (_, variables) => {
      assert.deepEqual(variables, {
        id: 'abcdefghij123456',
        visibility: 'PUBLIC',
      }); return { setFileVisibility: variables.visibility }
    },
  }
  await serveProfilePhoto(foir, { fileId: 'abcdefghij123456' })
})

test('a missing avatar needs no file change', async () => {
  const foir = { raw: async () => assert.fail('unexpected file change') }
  await serveProfilePhoto(foir)
  await serveProfilePhoto(foir, { url: null })
})

test('a refused file change fails the repair so the launch flag is not marked done', async () => {
  const error = new Error('file change refused')
  await assert.rejects(
    serveProfilePhoto(
      {
        raw: async () => {
          throw error
        },
      },
      { fileId: 'abcdefghij123456' },
    ),
    error,
  )
})

test('an invalid file id never reaches the mutation', async () => {
  const foir = { raw: async () => assert.fail('unexpected file change') }
  await assert.rejects(
    serveProfilePhoto(foir, {
      url: 'https://cdn-dev.foir.dev/files/?at=private-token',
    }),
    /backing file identity/,
  )
})
