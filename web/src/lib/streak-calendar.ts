/** Calendar days, rather than elapsed 24-hour periods, survive DST changes. */
export function validTimeZone(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 100) return false
  try { new Intl.DateTimeFormat('en', { timeZone: value }).format(); return true } catch { return false }
}
export function localClock(date: Date, timeZone: string) {
  if (!validTimeZone(timeZone) || !Number.isFinite(date.getTime())) throw new Error('Invalid reminder clock.')
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23',
  }).formatToParts(date).map(p => [p.type, p.value]))
  return { day: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour) }
}
export function previousDay(day: string) {
  return new Date(Date.parse(`${day}T12:00:00Z`) - 86_400_000).toISOString().slice(0, 10)
}
export function streakAt(dates: readonly string[], now: Date, timeZone: string) {
  const today = localClock(now, timeZone).day
  const days = new Set(dates.filter(d => Number.isFinite(Date.parse(d)) && Date.parse(d) <= now.getTime()).map(d => localClock(new Date(d), timeZone).day))
  const caughtToday = days.has(today)
  let current = 0, day = caughtToday ? today : previousDay(today)
  while (days.has(day)) { current++; day = previousDay(day) }
  let best = 0, run = 0, last: string | undefined
  for (const date of [...days].sort()) {
    run = last === previousDay(date) ? run + 1 : 1
    best = Math.max(best, run); last = date
  }
  return { current, best, caughtToday, day: today }
}
/** First instant of tomorrow in this zone, including short and long DST days. */
export function endOfLocalDay(now: Date, timeZone: string) {
  const day = localClock(now, timeZone).day
  let low = now.getTime(), high = low + 27 * 3_600_000
  while (high - low > 1) {
    const middle = Math.floor((low + high) / 2)
    if (localClock(new Date(middle), timeZone).day === day) low = middle
    else high = middle
  }
  return new Date(high).toISOString()
}
export function startOfLocalDay(now: Date, timeZone: string) {
  const day = localClock(now, timeZone).day
  let low = now.getTime() - 27 * 3_600_000, high = now.getTime()
  while (high - low > 1) {
    const middle = Math.floor((low + high) / 2)
    if (localClock(new Date(middle), timeZone).day === day) high = middle
    else low = middle
  }
  return new Date(high).toISOString()
}
