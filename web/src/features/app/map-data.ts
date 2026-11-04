import type { Encounter } from './data'

/** A map pin is a cat's latest readable public sighting, never each historical catch. */
export function latestSightings(rows: readonly Encounter[]) {
  const cats = new Map<string, Encounter>()
  for (const row of rows) {
    if (!row.catId || !row.area || !Number.isFinite(row.area.lat) || !Number.isFinite(row.area.lng)) continue
    const previous = cats.get(row.catId)
    if (!previous || Date.parse(row.postedAt ?? '') > Date.parse(previous.postedAt ?? '')) cats.set(row.catId, row)
  }
  return [...cats.values()].sort((a, b) => Date.parse(b.postedAt ?? '') - Date.parse(a.postedAt ?? ''))
}
