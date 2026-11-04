/** Coordinates refer to the upright, metadata-stripped image, from its top left. */
export interface PhotoPoint { x: number; y: number }
export interface PhotoBounds extends PhotoPoint { width: number; height: number }
export interface CaptureCatTag {
  /** Stable across a save retry; independent of an operation execution ID. */
  key: string
  catId?: string
  name?: string
  position?: PhotoPoint
  bounds?: PhotoBounds
  vector?: number[]
  vectorModel?: string
}

export const MAX_CAPTURE_CATS = 8
const ID = /^[a-z0-9]{10,40}$/
const TAG_KEY = /^[a-zA-Z0-9-]{1,64}$/
const MODEL = /^[a-zA-Z0-9._-]{1,80}$/
const object = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw Error('A cat tag must be an object.')
  return value as Record<string, unknown>
}
const unit = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1)
    throw Error('Cat positions must be inside the photo.')
  return value
}
const point = (value: unknown): PhotoPoint => {
  const row = object(value)
  return { x: unit(row.x), y: unit(row.y) }
}
const bounds = (value: unknown): PhotoBounds => {
  const row = object(value), origin = point(row)
  const width = unit(row.width), height = unit(row.height)
  if (width === 0 || height === 0 || origin.x + width > 1 + 1e-9 || origin.y + height > 1 + 1e-9)
    throw Error('A cat region must fit inside the photo.')
  return { ...origin, width: Math.min(width, 1 - origin.x), height: Math.min(height, 1 - origin.y) }
}

/** Validate before any upload promotion, record creation or local matching. */
export function captureCatTags(value: unknown): CaptureCatTag[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_CAPTURE_CATS)
    throw Error(`Choose between 1 and ${MAX_CAPTURE_CATS} cats.`)
  const keys = new Set<string>(), cats = new Set<string>()
  return value.map((value): CaptureCatTag => {
    const row = object(value)
    if (typeof row.key !== 'string' || !TAG_KEY.test(row.key) || keys.has(row.key))
      throw Error('Each cat tag needs its own stable key.')
    keys.add(row.key)
    const tag: CaptureCatTag = { key: row.key }
    if (row.catId !== undefined) {
      if (typeof row.catId !== 'string' || !ID.test(row.catId) || cats.has(row.catId))
        throw Error('Choose each known cat only once.')
      if (row.name !== undefined) throw Error('Choose a known cat or name a new cat.')
      tag.catId = row.catId
      cats.add(row.catId)
    } else {
      if (typeof row.name !== 'string' || !row.name.trim() || row.name.trim().length > 60)
        throw Error('Give each new cat a name of up to 60 characters.')
      tag.name = row.name.trim()
    }
    if (row.position !== undefined) tag.position = point(row.position)
    if (row.bounds !== undefined) {
      tag.bounds = bounds(row.bounds)
      tag.position ??= {
        x: tag.bounds.x + tag.bounds.width / 2,
        y: tag.bounds.y + tag.bounds.height / 2,
      }
    }
    if (row.vector !== undefined || row.vectorModel !== undefined) {
      if (!Array.isArray(row.vector) || row.vector.length === 0 || row.vector.length > 2048 ||
          row.vector.some(v => typeof v !== 'number' || !Number.isFinite(v)) ||
          typeof row.vectorModel !== 'string' || !MODEL.test(row.vectorModel))
        throw Error('A local match needs a finite vector and its model.')
      const length = Math.hypot(...row.vector)
      if (!Number.isFinite(length) || length === 0) throw Error('A local match vector cannot be empty.')
      tag.vector = [...row.vector] as number[]
      tag.vectorModel = row.vectorModel
    }
    return tag
  })
}

/** A tag follows the image through contain-fit letterboxing without moving. */
export function photoPointAt(
  point: PhotoPoint,
  container: { width: number; height: number },
  image: { width: number; height: number },
): PhotoPoint | null {
  if (![point.x, point.y, container.width, container.height, image.width, image.height].every(Number.isFinite) ||
      container.width <= 0 || container.height <= 0 || image.width <= 0 || image.height <= 0)
    return null
  const scale = Math.min(container.width / image.width, container.height / image.height)
  const width = image.width * scale, height = image.height * scale
  const x = (point.x - (container.width - width) / 2) / width
  const y = (point.y - (container.height - height) / 2) / height
  return x >= 0 && x <= 1 && y >= 0 && y <= 1 ? { x, y } : null
}
