import defaults from '../../../ios/Tilly/Resources/Copy.json'
/** A three-character geohash is a broad region, never a street or a house. */
const alphabet = '0123456789bcdefghjkmnpqrstuvwxyz'
export type Point = { lat: number; lng: number }
export function worldCellOf(
  area?: { lat: number | null; lng: number | null } | null,
): string | null {
  if (
    !area ||
    typeof area.lat !== 'number' ||
    typeof area.lng !== 'number' ||
    !Number.isFinite(area.lat) ||
    !Number.isFinite(area.lng) ||
    Math.abs(area.lat) > 90 ||
    Math.abs(area.lng) > 180
  )
    return null
  let lat = [-90, 90],
    lng = [-180, 180],
    hash = '',
    value = 0
  for (let bit = 0; bit < 15; bit++) {
    const range = bit % 2 === 0 ? lng : lat
    const coordinate = bit % 2 === 0 ? area.lng : area.lat
    const middle = (range[0] + range[1]) / 2
    const upper = coordinate >= middle
    value = value * 2 + Number(upper)
    range[upper ? 0 : 1] = middle
    if (bit % 5 === 4) {
      hash += alphabet[value]
      value = 0
    }
  }
  return hash
}
export function worldCellCenter(cell: string | null | undefined): Point | null {
  if (
    !cell ||
    cell.length !== 3 ||
    [...cell].some((c) => !alphabet.includes(c))
  )
    return null
  const lat = [-90, 90],
    lng = [-180, 180]
  let bit = 0
  for (const char of cell)
    for (let mask = 16; mask; mask >>= 1) {
      const range = bit++ % 2 === 0 ? lng : lat
      range[alphabet.indexOf(char) & mask ? 0 : 1] = (range[0] + range[1]) / 2
    }
  return { lat: (lat[0] + lat[1]) / 2, lng: (lng[0] + lng[1]) / 2 }
}
export function relativeTime(value: string | null, now = Date.now(), locale?: string, copy: (key: string) => string = key => defaults.website[key.slice(8) as keyof typeof defaults.website]): string {
  const elapsed = (now - Date.parse(value ?? '')) / 1000
  if (!Number.isFinite(elapsed)) return copy('website.timeUnavailable')
  if (elapsed < 60) return copy('website.justNow')
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
  if (elapsed < 3600)
    return formatter.format(-Math.floor(elapsed / 60), 'minute')
  if (elapsed < 86400)
    return formatter.format(-Math.floor(elapsed / 3600), 'hour')
  return formatter.format(-Math.floor(elapsed / 86400), 'day')
}
