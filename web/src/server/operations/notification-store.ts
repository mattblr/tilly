import { createOwned } from './social'
import type { QueryClient } from './types'
import type { NotificationSettings } from './notification-policy'
import { startOfLocalDay } from '../../lib/streak-calendar'

const fields = '_id _ownerId timeZone reminderHour artReady streakReminders communityUpdates'
export interface Page<T> { edges: { node: T }[]; pageInfo: { hasNextPage: boolean; endCursor: string | null } }
export function nextPage<T>(page: Page<T>, before?: string) {
  if (!page?.edges || !page.pageInfo) throw new Error('Notification paging is unavailable.')
  if (!page.pageInfo.hasNextPage) return undefined
  if (!page.pageInfo.endCursor || page.pageInfo.endCursor === before) throw new Error('Notification list did not advance.')
  return page.pageInfo.endCursor
}
export function notificationStore(foir: QueryClient) {
  return {
    async settingsPage(after?: string) {
      return (await foir.raw<{ notificationSettingsList: Page<NotificationSettings> }>(`query P($after: String) {
        notificationSettingsList: notificationSettingss(first: 1, after: $after) { edges { node { ${fields} } } pageInfo { hasNextPage endCursor } }
      }`, { after })).notificationSettingsList
    },
    async ownSettings(owner: string) {
      const rows = (await foir.raw<{ notificationSettingsList: Page<NotificationSettings> }>(`query P($owner: ID) {
        notificationSettingsList: notificationSettingss(first: 2, where: {ownerId: {eq: $owner}}) { edges { node { ${fields} } } pageInfo { hasNextPage endCursor } }
      }`, { owner })).notificationSettingsList
      if (!rows || rows.edges.length > 1 || rows.pageInfo.hasNextPage) throw new Error('Notification settings must be unique per account.')
      const value = rows.edges[0]?.node
      if (value && value._ownerId !== owner) throw new Error('Notification settings owner did not match.')
      return value ?? null
    },
    async save(owner: string, data: Record<string, unknown>) {
      const existing = await this.ownSettings(owner)
      if (existing) await this.patch(existing._id, owner, data)
      else await createOwned(foir, 'NotificationSettings', data, owner, `notification-settings:${owner}`)
    },
    async patch(id: string, owner: string, values: Record<string, unknown>) {
      const data = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, { set: value }]))
      const result = await foir.raw<{ updateNotificationSettings: { record: { _id: string } | null } }>(`mutation U($id: ID, $owner: ID, $data: NotificationSettingsUpdateInput!) {
        updateNotificationSettings(where: {id: {eq: $id}, ownerId: {eq: $owner}}, data: $data) { record { _id } }
      }`, { id, owner, data })
      if (result.updateNotificationSettings?.record?._id !== id) throw new Error('Notification settings did not save.')
    },
    async history(owner: string, after?: string) {
      return (await foir.raw<{ page: Page<{ _createdAt: string }> }>(`query H($owner: ID, $after: String) {
        page: capturePhotos(first: 100, after: $after, where: {ownerId: {eq: $owner}, state: {eq: "ready"}}) {
          edges { node { _createdAt } } pageInfo { hasNextPage endCursor }
        }
      }`, { owner, after })).page
    },
    async caughtToday(owner: string, now: Date, zone: string) {
      const result = await foir.raw<{ captures: { totalCount: number } }>(`query T($owner: ID, $start: DateTime, $now: DateTime) {
        captures: capturePhotos(first: 1, where: {ownerId: {eq: $owner}, state: {eq: "ready"}, createdAt: {gte: $start, lte: $now}}) { totalCount }
      }`, { owner, start: startOfLocalDay(now, zone), now: now.toISOString() })
      if (typeof result.captures?.totalCount !== 'number') throw new Error('Capture status could not be checked.')
      return result.captures.totalCount > 0
    },
    async send(input: Record<string, unknown>) {
      const result = await foir.raw<{ sendNotification: boolean }>(`mutation N($input: SendNotificationInput!) { sendNotification(input: $input) }`, { input })
      if (result.sendNotification !== true) throw new Error('Notification was not accepted.')
    },
    async words() {
      const result = await foir.raw<{ uiCopy: { entries: { key: string; value: string }[] } | null }>(`query { uiCopy(naturalKey: "notifications") { entries { key value } } }`)
      return Object.fromEntries((result.uiCopy?.entries ?? []).filter(e => e?.key && e.value).map(e => [e.key, e.value]))
    },
  }
}
export type NotificationStore = ReturnType<typeof notificationStore>
