import { localClock, streakAt, validTimeZone } from '../../lib/streak-calendar'
import { campaignInput, reminderFor } from './notification-policy'
import { nextPage, type NotificationStore } from './notification-store'

interface Cursor {
  after?: string; finished?: boolean; eligible: number
  person?: { owner: string; after?: string; dates: string[]; zone: string; day: string }
}
export function readNotificationCursor(cursor?: string): Cursor {
  if (!cursor) return { eligible: 0 }
  const parsed = JSON.parse(cursor) as Cursor
  if (!Number.isSafeInteger(parsed.eligible) || parsed.eligible < 0 || (parsed.after != null && typeof parsed.after !== 'string') ||
      (parsed.finished != null && typeof parsed.finished !== 'boolean')) throw new Error('Invalid notification continuation.')
  if (parsed.person && (!/^[a-z0-9]{10,40}$/.test(parsed.person.owner) ||
      !Array.isArray(parsed.person.dates) || !parsed.person.dates.every(d => typeof d === 'string' && Number.isFinite(Date.parse(d))) ||
      !validTimeZone(parsed.person.zone) || !/^\d{4}-\d{2}-\d{2}$/.test(parsed.person.day) ||
      (parsed.person.after != null && typeof parsed.person.after !== 'string'))) throw new Error('Invalid notification history continuation.')
  return parsed
}
/** One preference row or one history page per awaited Fóir continuation. */
export async function notificationSlice(store: NotificationStore, kind: 'reminder' | 'campaign', input: Record<string, unknown>, cursor: string | undefined,
  now = new Date()): Promise<{ cursor?: string; result?: { ok: true; eligible: number; dryRun: boolean } }> {
  const state = readNotificationCursor(cursor)
  const campaign = kind === 'campaign' ? campaignInput(input) : null
  const dryRun = campaign?.dryRun ?? (input.dryRun === true)
  const more = () => ({ cursor: JSON.stringify(state) })
  const finish = () => ({ result: { ok: true as const, eligible: state.eligible, dryRun } })
  if (!state.person) {
    if (state.finished) return finish()
    const page = await store.settingsPage(state.after)
    state.after = nextPage(page, state.after); state.finished = !state.after
    const settings = page.edges[0]?.node
    // Refresh segment context even for people who have opted out of reminders.
    // Consent and the local delivery hour are checked separately before sending.
    if (settings && validTimeZone(settings.timeZone) && (!campaign || settings.communityUpdates))
      state.person = { owner: settings._ownerId, dates: [], zone: settings.timeZone, day: localClock(now, settings.timeZone).day }
    return state.person || !state.finished ? more() : finish()
  }
  const person = state.person
  const page = await store.history(person.owner, person.after)
  const days = new Map(person.dates.map(d => [localClock(new Date(d), person.zone).day, d]))
  for (const { node } of page.edges) if (Number.isFinite(Date.parse(node._createdAt)) && Date.parse(node._createdAt) <= now.getTime())
    days.set(localClock(new Date(node._createdAt), person.zone).day, node._createdAt)
  person.dates = [...days.values()]
  person.after = nextPage(page, person.after)
  if (person.after) return more()
  // Re-read intent after paging: an opt-out, clock change or deletion wins.
  const settings = await store.ownSettings(person.owner)
  if (settings && settings.timeZone === person.zone) {
    const streak = streakAt(person.dates, now, settings.timeZone)
    await store.patch(settings._id, person.owner, { currentStreak: streak.current, bestStreak: streak.best, streakDay: streak.day })
    if (campaign) {
      if (settings.communityUpdates && streak.current >= campaign.minimumStreak) {
        state.eligible++
        if (!campaign.dryRun) await store.send({ userId: person.owner, category: 'community_updates', title: campaign.title, message: campaign.message,
          actionUrl: campaign.destination === 'capture' ? '/catch' : `/${campaign.destination}`, channels: { push: { deep_link: `tilly://${campaign.destination}` } },
          idempotencyKey: `community:${campaign.campaignKey}:${person.owner}` })
      }
    } else {
      // A delayed continuation belongs to the day it started, never tomorrow.
      const reminder = localClock(now, person.zone).day === person.day ? reminderFor(settings, person.dates, now) : null
      if (reminder && !await store.caughtToday(person.owner, now, settings.timeZone)) {
        if (!dryRun) {
          const words = await store.words()
          await store.send({ userId: person.owner, category: 'streak_reminder',
            title: words['reminder.title'] || 'Keep your streak going',
            message: words['reminder.body'] || 'Fancy a walk? Meet a cat today to keep your streak going.', actionUrl: '/catch',
            channels: { push: { deep_link: 'tilly://capture' } }, idempotencyKey: reminder.idempotencyKey, expiresAt: reminder.expiresAt })
        }
        state.eligible++
      }
    }
  }
  delete state.person
  return state.finished ? finish() : more()
}
