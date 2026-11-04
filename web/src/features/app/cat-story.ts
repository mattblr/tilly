import type { Image } from '@foir/sdk/data'
import { readTaggedCatPhotos } from './captures'
import { collectPages } from './feed-sources'
import { readFeed, type Encounter, type AppClient } from './data'
import { appImage } from './media'
import { viewerBlocks, safetyEnabled } from './safety-data'
import { readPostHighlights } from './post-highlights'
import { verifiedChallengeKeys } from './challenges'

/** A cat's gallery: the ready captures it's tagged in, newest first. Photo
 * visibility is independent of post and note visibility. Every join is a
 * direct SDK read with this viewer's key/session; absent authors stay absent. */
export async function readCatStory(client: AppClient, cat: string, visible: boolean, locale?: string, after?: string) {
  const page = await readTaggedCatPhotos(client, cat, after)
  return hydrateStory(client, page.rows, page.next, visible, locale)
}
async function hydrateStory(client: AppClient, photos: Array<{ _id: string; _ownerId?: string | null; _createdAt: string; photo: Image | null; challengeHighlights?: unknown }>, next: string | null, visible: boolean, locale?: string) {
  const blocked = await viewerBlocks(client)
  const keys = photos.map(node => node._id)
  if (!keys.length)
    return {
      rows: [],
      next,
    }
  const [posts, notes, highlights, art] = await Promise.all([
    collectPages((cursor) =>
      readFeed(client, {
        visible,
        locale,
        originals: true,
        includeBlocked: true,
        after: cursor,
        where: { photoKey: { in: keys } },
      }),
    ),
    collectPages(async (cursor) => {
      const page = await client['field-note'].findMany({
        first: 100,
        after: cursor,
        where: { photoKey: { in: keys } },
        orderBy: [{ createdAt: 'DESC' }],
        pick: ['_id', '_ownerId', 'photoKey', 'text', 'tags'],
      })
      return {
        rows: page.edges.map((e) => e.node).filter(note => !note._ownerId || !blocked.has(note._ownerId)),
        next: page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null,
      }
    }),
    readPostHighlights(client, locale).catch(() => []),
    collectPages(async (cursor) => {
      const page = await client['catch-art'].findMany({
        first: 100,
        after: cursor,
        where: { photoKey: { in: keys } },
        pick: ['_id', 'photoKey', 'art'],
      })
      return {
        rows: page.edges.map((e) => e.node),
        next: page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null,
      }
    }),
  ])
  const postByPhoto = new Map<string, Encounter>()
  for (const post of posts)
    if (post.photoKey && !postByPhoto.has(post.photoKey))
      postByPhoto.set(post.photoKey, post)
  const artByPhoto = new Map(
    art.map((piece) => [piece.photoKey, appImage(piece.art)]),
  )
  return {
    rows: photos.filter(node => node._ownerId ? !blocked.has(node._ownerId) : !safetyEnabled).map(node => {
      const encounter = postByPhoto.get(node._id)
      // The readable canonical photo supplies the evidence, independently of
      // its post. Published challenges supply labels, never qualification.
      const highlightKeys = verifiedChallengeKeys(node.challengeHighlights)
      const words = notes
        .filter((note) => note.photoKey === node._id)
        .map((note) =>
          [
            ...(Array.isArray(note.tags)
              ? note.tags.filter(
                  (tag): tag is string => typeof tag === 'string',
                )
              : []),
            note.text,
          ]
            .filter(Boolean)
            .join(' · '),
        )
        .filter(Boolean)
      return {
        id: node._id,
        at: node._createdAt,
        postedAt: node._createdAt,
        photo: appImage(node.photo),
        art: artByPhoto.get(node._id) ?? null,
        encounter,
        highlights,
        highlightKeys,
        reportableNotes: notes.filter(note => note.photoKey === node._id).map(note => ({
          id: note._id, ownerId: note._ownerId,
          text: [...(Array.isArray(note.tags) ? note.tags.filter((tag): tag is string => typeof tag === 'string') : []), note.text].filter(Boolean).join(' · '),
        })).filter(note => note.text),
        notes: [
          ...new Set(
            words.length ? words : encounter?.note ? [encounter.note] : [],
          ),
        ],
      }
    }),
    next,
  }
}
