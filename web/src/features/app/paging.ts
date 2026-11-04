export interface Page<T> {
  rows: T[]
  next: string | null
}
export interface PageSource<T> {
  next: () => Promise<Page<T>>
}

/** Cursor state advances only after a successful read, so failures are retryable. */
export function cursorSource<T>(
  read: (after?: string) => Promise<Page<T>>,
): PageSource<T> {
  let after: string | undefined
  return {
    async next() {
      const page = await read(after)
      if (page.next && page.next === after)
        throw new Error('The list did not advance. Refresh to try again.')
      after = page.next ?? undefined
      return page
    },
  }
}
export function appendUnique<T extends { id: string }>(
  held: T[],
  incoming: T[],
) {
  const ids = new Set(held.map((row) => row.id))
  return [
    ...held,
    ...incoming.filter((row) => !ids.has(row.id) && !!ids.add(row.id)),
  ]
}

/** Merge independently paginated, date-ordered lanes without losing the unshown tail. */
export function mergedSource<T extends { id: string; postedAt: string | null }>(
  reads: Array<(after?: string) => Promise<Page<T>>>,
): PageSource<T> {
  let lanes = reads.map((read) => ({
    read,
    rows: [] as T[],
    after: undefined as string | undefined,
    done: false,
  }))
  let seen = new Set<string>()
  return {
    async next() {
      // Work on a copy. A failed lane must not consume another lane's rows.
      const draft = lanes.map((lane) => ({ ...lane, rows: [...lane.rows] })),
        visited = new Set(seen),
        rows: T[] = []
      let requests = 0
      while (rows.length < 24) {
        for (const lane of draft)
          while (!lane.rows.length && !lane.done) {
            if (++requests > 200)
              throw new Error('Too many pages to merge. Refresh to try again.')
            const page = await lane.read(lane.after)
            if (page.next && page.next === lane.after)
              throw new Error('The list did not advance.')
            lane.rows = page.rows
            lane.after = page.next ?? undefined
            lane.done = !page.next
          }
        const heads = draft.filter((lane) => lane.rows.length)
        if (!heads.length) {
          if (draft.every((lane) => lane.done)) break
          continue
        }
        heads.sort(
          (a, b) =>
            (b.rows[0].postedAt ?? '').localeCompare(
              a.rows[0].postedAt ?? '',
            ) || a.rows[0].id.localeCompare(b.rows[0].id),
        )
        const row = heads[0].rows.shift()!
        if (!visited.has(row.id)) {
          visited.add(row.id)
          rows.push(row)
        }
      }
      lanes = draft
      seen = visited
      return {
        rows,
        next: lanes.some((lane) => !lane.done || lane.rows.length)
          ? 'more'
          : null,
      }
    },
  }
}

/** Fetch bounded pages, refusing repeated cursors rather than silently truncating. */
export async function collectPages<T>(
  read: (after?: string) => Promise<{ rows: T[]; next: string | null }>,
) {
  const rows: T[] = [],
    seen = new Set<string>()
  let after: string | undefined
  for (let i = 0; i < 200; i++) {
    const page = await read(after)
    rows.push(...page.rows)
    if (!page.next) return rows
    if (seen.has(page.next))
      throw new Error('The list did not advance. Refresh to try again.')
    seen.add(page.next)
    after = page.next
  }
  throw new Error('This list is too large to load completely. Try again later.')
}

/** Follow a typed SDK connection, including short or empty intermediate pages. */
export async function collectConnection<T>(
  read: (after?: string) => Promise<{
    edges: Array<{ node: T }>
    pageInfo: { hasNextPage: boolean; endCursor: string | null }
  }>,
) {
  return collectPages(async (after) => {
    const page = await read(after)
    if (page.pageInfo.hasNextPage && !page.pageInfo.endCursor)
      throw new Error('The list has more rows but no continuation cursor.')
    return {
      rows: page.edges.map((edge) => edge.node),
      next: page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null,
    }
  })
}
