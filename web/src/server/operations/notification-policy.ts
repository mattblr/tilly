import { endOfLocalDay, localClock, streakAt, validTimeZone } from '../../lib/streak-calendar'

export const notificationCategories = ['art_ready', 'streak_reminder', 'community_updates'] as const
export type NotificationCategory = typeof notificationCategories[number]
export interface NotificationSettings {
  _id: string; _ownerId: string; timeZone: string; reminderHour: number
  artReady: boolean; streakReminders: boolean; communityUpdates: boolean
}
export function settingsInput(input: Record<string, unknown>) {
  if (!validTimeZone(input.timeZone) || !Number.isInteger(input.reminderHour) || Number(input.reminderHour) < 0 || Number(input.reminderHour) > 23)
    throw new Error('Choose a valid time zone and reminder hour.')
  for (const key of ['artReady', 'streakReminders', 'communityUpdates'])
    if (typeof input[key] !== 'boolean') throw new Error('Choose each notification preference.')
  return { timeZone: input.timeZone, reminderHour: Number(input.reminderHour), artReady: input.artReady as boolean,
    streakReminders: input.streakReminders as boolean, communityUpdates: input.communityUpdates as boolean }
}
export function reminderFor(settings: NotificationSettings, dates: string[], now: Date) {
  if (!settings.streakReminders || !validTimeZone(settings.timeZone)) return null
  const clock = localClock(now, settings.timeZone)
  if (clock.hour !== settings.reminderHour) return null
  const streak = streakAt(dates, now, settings.timeZone)
  if (!streak.current || streak.caughtToday) return null
  return { ...streak, idempotencyKey: `streak:${settings._ownerId}:${clock.day}`, expiresAt: endOfLocalDay(now, settings.timeZone) }
}
export function campaignInput(input: Record<string, unknown>) {
  const title = String(input.title ?? '').trim(), message = String(input.message ?? '').trim()
  if (!title || title.length > 100 || !message || message.length > 500) throw new Error('Add a title up to 100 characters and a message up to 500.')
  if (!['feed', 'capture', 'account'].includes(String(input.destination))) throw new Error('Choose an app destination.')
  if (!Number.isInteger(input.minimumStreak) || Number(input.minimumStreak) < 0 || Number(input.minimumStreak) > 3650) throw new Error('Choose a minimum streak between 0 and 3650.')
  if (typeof input.dryRun !== 'boolean' || !/^[a-zA-Z0-9-]{8,64}$/.test(String(input.campaignKey))) throw new Error('A stable campaign and preview choice are required.')
  return { title, message, destination: input.destination as string, minimumStreak: Number(input.minimumStreak), dryRun: input.dryRun,
    campaignKey: String(input.campaignKey) }
}
