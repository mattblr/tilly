import { highlightIcons, type HighlightIcon, type PostHighlight } from '../../lib/post-highlights'
import type { AppClient } from './data'

const KEY = /^[a-z][a-z0-9-]{0,39}$/

/** Badge titles and icons, from published challenges. A photo shows a badge
 * only for a challenge it verifiably met (`challengeHighlights`). */
export async function readPostHighlights(client: AppClient, locale?: string): Promise<PostHighlight[]> {
  const found = new Map<string, PostHighlight>(), visited = new Set<string>()
  let cursor: string | undefined
  do {
    const page = await client['photo-challenge'].findMany({ first: 32, after: cursor, locale,
      pick: ['_naturalKey', 'title', 'icon', 'highlightKey'] })
    for (const { node } of page.edges) {
      if (!node.highlightKey || !KEY.test(node.highlightKey) || !node.title ||
        !highlightIcons.includes(node.icon as HighlightIcon)) continue
      found.set(node.highlightKey, { key: node.highlightKey, title: node.title.slice(0, 60), icon: node.icon as HighlightIcon })
    }
    if (found.size > 32) throw new Error('Too many challenge badges.')
    if (!page.pageInfo.hasNextPage) break
    const next = page.pageInfo.endCursor
    if (!next || visited.has(next) || visited.size >= 32) throw new Error('Challenge badges did not advance.')
    visited.add(next); cursor = next
  } while (cursor)
  return [...found.values()]
}
