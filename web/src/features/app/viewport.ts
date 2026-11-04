export interface Viewport {
  west: number
  east: number
  south: number
  north: number
}
export interface Cell {
  hash: string
  count: number
  lat: number
  lng: number
  bounds: Viewport
}
const alphabet = '0123456789bcdefghjkmnpqrstuvwxyz'
export const wrapLongitude = (lng: number) =>
  ((((lng + 180) % 360) + 360) % 360) - 180
export function normalizedViewport(box: Viewport): Viewport {
  if (!Object.values(box).every(Number.isFinite) || box.south > box.north)
    throw new Error('Invalid map bounds.')
  let width = box.east - box.west
  if (width < 0) width = ((width % 360) + 360) % 360
  width = Math.min(360, width)
  const west = wrapLongitude(box.west)
  return {
    west,
    east: west + width,
    south: Math.max(-90, box.south),
    north: Math.min(90, box.north),
  }
}
export function cellBounds(hash: string): Viewport {
  let west = -180,
    east = 180,
    south = -90,
    north = 90,
    bit = 0
  for (const character of hash) {
    const value = alphabet.indexOf(character)
    if (value < 0) throw new Error('Invalid area cell.')
    for (let mask = 16; mask; mask >>= 1) {
      if (bit++ % 2 === 0) {
        const mid = (west + east) / 2
        if (value & mask) west = mid
        else east = mid
      } else {
        const mid = (south + north) / 2
        if (value & mask) south = mid
        else north = mid
      }
    }
  }
  return { west, east, south, north }
}
export function intersects(box: Viewport, other: Viewport) {
  const a = normalizedViewport(box),
    b = normalizedViewport(other)
  return (
    a.south <= b.north &&
    a.north >= b.south &&
    [-360, 0, 360].some(
      (offset) => a.west <= b.east + offset && a.east >= b.west + offset,
    )
  )
}
/** Enumerate only intersecting branches. The cap lets very wide, short views coarsen safely. */
export function coveringCells(
  box: Viewport,
  precision: number,
  cap = 200,
): string[] {
  const result: string[] = []
  const visit = (prefix: string) => {
    if (result.length > cap) return
    if (!intersects(box, cellBounds(prefix))) return
    if (prefix.length === precision) {
      result.push(prefix)
      return
    }
    for (const letter of alphabet) visit(prefix + letter)
  }
  visit('')
  return result
}
export function viewportPlan(input: Viewport) {
  const box = normalizedViewport(input)
  const lat = (box.north + box.south) / 2,
    lng = wrapLongitude((box.west + box.east) / 2)
  const halfHeight = ((box.north - box.south) * 111320) / 2
  const halfWidth =
    ((box.east - box.west) * 111320 * Math.cos((lat * Math.PI) / 180)) / 2
  const radius = Math.max(100, Math.hypot(halfHeight, halfWidth))
  let precision =
    [45, 5.625, 1.40625, 0.17578, 0.04394, 0.00549].findIndex(
      (height) => height <= (box.north - box.south) / 3,
    ) + 1
  if (!precision) precision = 6
  while (precision > 1 && coveringCells(box, precision - 1, 100).length > 100)
    precision--
  return {
    box,
    lat,
    lng,
    radius,
    wide: radius > 1500,
    precision,
    prefixes: precision > 1 ? coveringCells(box, precision - 1, 100) : [],
  }
}
