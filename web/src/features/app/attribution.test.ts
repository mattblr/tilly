import assert from 'node:assert/strict'
import test from 'node:test'
import { readFeed, encounterCopy, type AppClient } from './data'

const page = (nodes: unknown[]) => ({
  edges: nodes.map((node) => ({ node })),
  totalCount: nodes.length,
  pageInfo: { hasNextPage: false, endCursor: null },
})
function fixture(originalReadable: boolean) {
  const repost = {
    _id: 'repost',
    _ownerId: 'reposter',
    photoKey: 'photo',
    catKey: 'cat',
    reshareOf: 'another-repost',
    audience: 'public',
    postedAt: '2026-10-30',
    comment: 'Hello again',
    note: null,
    area: null,
  }
  const original = {
    ...repost,
    _id: 'original',
    _ownerId: 'catcher',
    reshareOf: null,
  }
  const profileQueries: string[][] = []
  const stub = {
    'capture-post': {
      findMany: async ({ where }: { where: Record<string, unknown> }) => {
        if (where.photoKey) {
          assert.deepEqual(where.reshareOf, { isNull: true })
          return page(originalReadable ? [original] : [])
        }
        return page([repost])
      },
    },
    'capture-photo': { findMany: async () => page([{ _id: 'photo', _ownerId: 'catcher', _createdAt: '2026-10-30', photo: null, state: 'ready', tagRevision: 'r1' }]) },
    'capture-cat-tag': { findMany: async () => page([]) },
    'catch-art': { findMany: async () => page([]) },
    cat: { findMany: async () => page([{ _id: 'cat', name: 'Biscuit' }]) },
    profile: {
      findMany: async ({ where }: { where: { ownerId: { in: string[] } } }) => {
        profileQueries.push(where.ownerId.in)
        return page(
          where.ownerId.in.map((id) => ({
            _id: id,
            _ownerId: id,
            username: id,
            displayName: 'Display ' + id,
            photo: null,
          })),
        )
      },
    },
  } as unknown as AppClient
  return { stub, profileQueries }
}
test('a repost of a repost keeps the original catcher and separate repost attribution', async () => {
  const { stub, profileQueries } = fixture(true)
  const { rows } = await readFeed(stub)
  assert.equal(rows[0].authorId, 'catcher')
  assert.equal(rows[0].author, 'catcher')
  assert.equal(rows[0].originalPostId, 'original')
  assert.equal(rows[0].repostedBy?.id, 'reposter')
  assert.equal(rows[0].repostedBy?.name, 'reposter')
  assert.equal(rows[0].note, 'Hello again')
  assert.deepEqual(profileQueries, [['reposter', 'catcher']])
})
test('an unavailable original never makes the reposter appear to have caught the photo', async () => {
  const { stub, profileQueries } = fixture(false)
  const { rows } = await readFeed(stub)
  assert.equal(rows[0].authorId, null)
  // Unknown original-author data stays empty; the current published copy
  // supplies the display fallback without borrowing the reposter's identity.
  assert.equal(rows[0].author, '')
  const shown=encounterCopy(rows[0],key=>{assert.equal(key,'profile.user');return 'Un utilisateur Tilly'})
  assert.equal(shown.author,'Un utilisateur Tilly')
  assert.equal(shown.authorId,null)
  assert.equal(shown.originalPostId,undefined)
  assert.equal(shown.repostedBy?.name,'reposter')
  assert.notEqual(shown.author,shown.repostedBy?.name)
  assert.equal(rows[0].author,'')
  assert.equal(rows[0].repostedBy?.id, 'reposter')
  assert.deepEqual(profileQueries, [['reposter']])
})

test('feed hydration follows artwork pages beyond the first 100 rows', async () => {
  const { stub } = fixture(true)
  const cursors: Array<string | undefined> = []
  const client = {
    ...stub,
    'catch-art': {
      findMany: async ({ after }: { after?: string }) => {
        cursors.push(after)
        return after
          ? page([
              {
                _id: 'wanted',
                photoKey: 'photo',
                art: { url: 'https://images.example/cat.webp' },
              },
            ])
          : {
              ...page(
                Array.from({ length: 100 }, (_, i) => ({
                  _id: `other${i}`,
                  photoKey: `other${i}`,
                  art: null,
                })),
              ),
              pageInfo: { hasNextPage: true, endCursor: 'next-art' },
            }
      },
    },
  } as unknown as AppClient
  const { rows } = await readFeed(client)
  assert.deepEqual(cursors, [undefined, 'next-art'])
  assert.equal(rows[0].art?.url, 'https://images.example/cat.webp')
})


test('multi-cat media keeps one post and original author through a repost, with every current cat link', async () => {
  const { stub } = fixture(true)
  const first = 'firstcat1234567890', second = 'secondcat1234567890'
  const client = { ...stub,
    'capture-photo': { findMany: async () => page([{ _id: 'photo', _ownerId: 'catcher', tagRevision: 'current', photo: { url: 'https://images.example/photo.jpg' } }]) },
    'capture-cat-tag': { findMany: async () => page([first,second].map((catKey,index) => ({ _id: `tag${index}`, tagKey: `tag-${index}`, catKey, photoKey: 'photo', revision: 'current', _ownerId: 'catcher', positionIndex: index }))) },
    cat: { findMany: async () => page([{ _id: first, name: 'Biscuit' },{ _id: second, name: 'Tilly' }]) },
  } as unknown as AppClient
  const { rows } = await readFeed(client)
  assert.equal(rows.length, 1)
  assert.equal(rows[0].id, 'repost')
  assert.equal(rows[0].originalPostId, 'original')
  assert.equal(rows[0].authorId, 'catcher')
  assert.equal(rows[0].repostedBy?.id, 'reposter')
  assert.deepEqual(rows[0].cats?.map(cat => cat.name), ['Biscuit','Tilly'])
  assert.equal(rows[0].photo?.url, 'https://images.example/photo.jpg')
  assert.equal(rows[0].captureRevision, 'current')
})

test('an interrupted canonical save stays out of activity while its source cursor remains usable', async () => {
  const { stub } = fixture(true)
  const client = { ...stub,
    'capture-photo': { findMany: async () => page([]) },
    'capture-cat-tag': { findMany: async () => { throw Error('Unfinished media must not hydrate tags') } },
    'capture-post': { findMany: async (args: { where: Record<string, unknown> }) => {
      const result = await stub['capture-post'].findMany(args as never)
      return args.where.photoKey ? result : { ...result, pageInfo: { hasNextPage: true, endCursor: 'next-posts' } }
    } },
  } as unknown as AppClient
  const result = await readFeed(client)
  assert.deepEqual(result.rows, [])
  assert.equal(result.next, 'next-posts')
})
