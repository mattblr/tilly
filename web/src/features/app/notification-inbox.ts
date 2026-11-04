import type { AppClient } from './data'

export type InboxItem = { id: string; title: string; body: string | null; actionUrl: string | null; imageUrl?: string | null; isRead: boolean; createdAt: string }
export type InboxPage = { edges: { node: InboxItem }[]; pageInfo: { hasNextPage: boolean; endCursor: string | null } }

/** Notification media stays on the platform CDN, never a third-party tracking host. */
export function notificationImage(value: string | null | undefined): string | null {
  if (!value) return null
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && ['cdn.foir.dev', 'cdn-dev.foir.dev'].includes(url.hostname) && !url.username && !url.password && !url.port ? url.href : null
  } catch { return null }
}

/** Only product destinations are actionable. Notification content never supplies an origin. */
export function notificationPath(value: string | null, origin: string): string | null {
  if (!value || /[\\\s%?#]/.test(value) || /(^|\/)\.\.?(\/|$)/.test(value)) return null
  let path: string
  if (value.startsWith('tilly://')) {
    const match = /^tilly:\/\/(capture|feed|account|cat|person)(\/[^/]+)?$/.exec(value)
    if (!match) return null
    path = `/${({ capture: 'catch', cat: 'cats', person: 'people' } as Record<string, string>)[match[1]] ?? match[1]}${match[2] ?? ''}`
  } else {
    try { const url = new URL(value, origin); if (url.origin !== origin || url.username || url.password) return null; path = url.pathname } catch { return null }
    if (value.startsWith('//')) return null
    if (!value.startsWith('/') && !value.startsWith(`${origin}/`)) return null
  }
  return /^\/(feed|catch|account)$/.test(path) || /^\/(cats|people)\/[a-z0-9]{10,40}$/.test(path) ? path : null
}

export async function inboxPage(client: Pick<AppClient, 'raw'>, after: string | null = null) {
  const result = await client.raw<{ myNotifications: InboxPage; myUnreadCount: number }>(`query Inbox($after: String) {
    myNotifications(first: 20, after: $after) { edges { node { id title body actionUrl imageUrl isRead createdAt } } pageInfo { hasNextPage endCursor } }
    myUnreadCount
  }`, { after })
  const page = result.myNotifications
  if (page.pageInfo.hasNextPage && (!page.pageInfo.endCursor || page.pageInfo.endCursor === after)) throw new Error('Notification pagination did not advance.')
  return { items: page.edges.map(edge => edge.node), after: page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null, unread: result.myUnreadCount }
}
export async function readNotification(client: Pick<AppClient, 'raw'>, id: string) {
  const result = await client.raw<{ markNotificationRead: boolean }>('mutation ReadNotification($id: String!) { markNotificationRead(id: $id) }', { id })
  if (result.markNotificationRead !== true) throw new Error('Notification was not marked read.')
}

/** Check around every token lookup, including SDK retries after account replacement. */
export function inboxSession(session: { getUser: () => Promise<{userId: string} | null>; getToken: () => Promise<string | null> }, expected: string, current: () => boolean) {
  const getToken = async () => {
    if (!current() || (await session.getUser())?.userId !== expected) throw new Error('The signed-in account changed.')
    const token = await session.getToken()
    if (!current() || (await session.getUser())?.userId !== expected || !token) throw new Error('The signed-in account changed.')
    return token
  }
  return { getToken, refreshToken: getToken }
}

export type InboxSnapshot = { items: InboxItem[]; after: string | null; unread: number; loaded: boolean; busy: boolean; error: boolean; reading: string | null; opened: InboxItem | null }
const emptyInbox = (): InboxSnapshot => ({ items: [], after: null, unread: 0, loaded: false, busy: false, error: false, reading: null, opened: null })

/** One store per account-bound SDK client. Disposal clears private data immediately;
 * request generations also refuse late replies after React effect restarts. */
export class NotificationInboxStore {
  private state = emptyInbox()
  private generation = 0
  private active = false
  private retryMore = false
  private listeners = new Set<() => void>()
  constructor(private client: Pick<AppClient, 'raw'> | null) {}
  snapshot = () => this.state
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener) } }
  private update(values: Partial<InboxSnapshot>) { this.state = { ...this.state, ...values }; for (const listener of this.listeners) listener() }
  start = () => { this.generation++; this.active = true; this.update(emptyInbox()); if (this.client) void this.load() }
  dispose = () => { this.active = false; this.generation++; this.update(emptyInbox()) }
  retry = async () => { if (this.state.error) await this.load(this.retryMore) }
  load = async (more = false) => {
    if (!this.active || !this.client || this.state.busy || this.state.reading) return
    const started = this.generation
    this.retryMore = more
    this.update({ busy: true, error: false })
    try {
      const page = await inboxPage(this.client, more ? this.state.after : null)
      if (!this.active || this.generation !== started) return
      const items = more ? [...new Map([...this.state.items, ...page.items].map(item => [item.id, item])).values()] : page.items
      this.update({ items, after: page.after, unread: page.unread, loaded: true })
    } catch { if (this.active && this.generation === started) this.update({ error: true }) }
    finally { if (this.active && this.generation === started) this.update({ busy: false }) }
  }
  /** A detail view uses already-owned data. Network persistence never gates reading. */
  open = (item: InboxItem) => {
    if (!this.active || !this.client) return
    const stored = this.state.items.find(row => row.id === item.id)
    if (!stored) return
    this.update({ opened: stored })
    if (!stored.isRead) void this.markRead(stored)
  }
  close = () => { this.update({ opened: null }) }
  markRead = async (item: InboxItem) => {
    if (!this.active || !this.client || this.state.reading || this.state.busy) return
    const started = this.generation
    this.retryMore = false
    this.update({ reading: item.id, error: false })
    try {
      await readNotification(this.client, item.id)
      if (!this.active || this.generation !== started) return
      const wasUnread = this.state.items.some(row => row.id === item.id && !row.isRead)
      this.update({ items: this.state.items.map(row => row.id === item.id ? { ...row, isRead: true } : row), unread: Math.max(0, this.state.unread - Number(wasUnread)) })
    } catch { if (this.active && this.generation === started) this.update({ error: true }) }
    finally { if (this.active && this.generation === started) this.update({ reading: null }) }
  }
}

/** Match the trailing native swipe while leaving vertical scrolling to the browser. */
export function notificationSwipe(start: {x: number; y: number}, end: {x: number; y: number}, rtl = false) {
  const horizontal = end.x - start.x
  return (rtl ? horizontal > 48 : horizontal < -48) && Math.abs(end.y - start.y) < 40
}
