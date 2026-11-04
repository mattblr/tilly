import assert from 'node:assert/strict'
import test from 'node:test'
import { removeOwnReposts } from './social.ts'

test('undo repost pages all duplicates and never deletes an original or another owner', async () => {
  const deleted = [],
    pages = []
  const foir = {
    raw: async (query, vars) => {
      if (query.includes('deleteCapturePost')) {
        deleted.push(vars.id)
        return {}
      }
      pages.push(vars)
      assert.match(query, /ownerId: \{ eq: \$me \}/)
      assert.match(query, /reshareOf: \{ isNull: false \}/)
      const rows = vars.after
        ? [
            {
              _id: 'duplicate',
              _ownerId: 'me',
              photoKey: 'photo',
              reshareOf: 'original',
            },
          ]
        : [
            {
              _id: 'mine',
              _ownerId: 'me',
              photoKey: 'photo',
              reshareOf: 'original',
            },
            {
              _id: 'original',
              _ownerId: 'me',
              photoKey: 'photo',
              reshareOf: null,
            },
            {
              _id: 'foreign',
              _ownerId: 'other',
              photoKey: 'photo',
              reshareOf: 'original',
            },
            {
              _id: 'different',
              _ownerId: 'me',
              photoKey: 'elsewhere',
              reshareOf: 'original',
            },
          ]
      return {
        page: {
          edges: rows.map((node) => ({ node })),
          pageInfo: {
            hasNextPage: !vars.after,
            endCursor: vars.after ? null : 'next',
          },
        },
      }
    },
  }
  await removeOwnReposts(foir, 'me', 'photo')
  assert.deepEqual(deleted, ['mine', 'duplicate'])
  assert.equal(pages.length, 2)
  assert.equal(pages[0].me, 'me')
  assert.equal(pages[0].p, 'photo')
})

test('undo repost is safe to retry after its rows have gone', async () => {
  const foir = {
    raw: async (query) => {
      assert.doesNotMatch(query, /mutation/)
      return { page: { edges: [], pageInfo: { hasNextPage: false } } }
    },
  }
  await removeOwnReposts(foir, 'me', 'photo')
})
