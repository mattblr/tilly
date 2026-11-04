/** Prepared for the configurable appearance operation. No provider is called here.
 * Bind consent/cache identity only after dispatch, canonical ownership, current
 * revision, configured eligibility and quota have been verified by the operation.
 */
export const appearanceConsentVersion = 'cat-appearance-v2'
export const appearancePromptVersion = 'appearance-v2'
export const catAppearanceOutputSchema = {
  type: 'object', additionalProperties: false,
  required: ['status', 'possibilities', 'coatLength', 'pattern'],
  properties: {
    status: { type: 'string', enum: ['possible', 'mixed', 'unknown', 'no_cat'] },
    possibilities: { type: 'array', maxItems: 3, uniqueItems: true, items: { type: 'string', minLength: 1, maxLength: 60 } },
    coatLength: { type: 'string', enum: ['short', 'medium', 'long', 'unknown'] },
    pattern: { type: 'string', enum: ['solid', 'tabby', 'bicolour', 'tricolour', 'tortoiseshell', 'colourpoint', 'mixed', 'unknown'] },
  },
} as const
export interface AppearanceAnswer {
  status: 'possible' | 'mixed' | 'unknown' | 'no_cat'
  possibilities: string[]
  coatLength: 'short' | 'medium' | 'long' | 'unknown'
  pattern: 'solid' | 'tabby' | 'bicolour' | 'tricolour' | 'tortoiseshell' | 'colourpoint' | 'mixed' | 'unknown'
}
export class AppearanceRefusal extends Error {}
const refuse = (): never => { throw new AppearanceRefusal('The appearance suggestion could not be checked.') }
const object = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return refuse()
  return value as Record<string, unknown>
}
const ID = /^[a-z0-9]{10,40}$/, KEY = /^[a-zA-Z0-9-]{1,80}$/
export function appearanceRequest(value: unknown) {
  const row = object(value)
  // Never accept an arbitrary URL, file, owner, model, prompt or consent date.
  if (Object.keys(row).some(key => !['captureId', 'expectedRevision', 'consentVersion'].includes(key)) ||
    typeof row.captureId !== 'string' || !ID.test(row.captureId) ||
    typeof row.expectedRevision !== 'string' || !KEY.test(row.expectedRevision) ||
    row.consentVersion !== appearanceConsentVersion) return refuse()
  return { captureId: row.captureId, expectedRevision: row.expectedRevision, consentVersion: appearanceConsentVersion }
}
export function appearanceAnswer(value: unknown): AppearanceAnswer {
  const row = object(value), schema = catAppearanceOutputSchema.properties
  if (Object.keys(row).some(key => !catAppearanceOutputSchema.required.includes(key as typeof catAppearanceOutputSchema.required[number])) ||
    !schema.status.enum.includes(row.status as AppearanceAnswer['status']) ||
    !schema.coatLength.enum.includes(row.coatLength as AppearanceAnswer['coatLength']) ||
    !schema.pattern.enum.includes(row.pattern as AppearanceAnswer['pattern']) ||
    !Array.isArray(row.possibilities) || row.possibilities.length > 3) return refuse()
  const possibilities = row.possibilities.map(value => {
    if (typeof value !== 'string' || !value.trim() || value.length > 60 || /[\p{Cc}\p{Cf}<>]|https?:|www\./iu.test(value)) return refuse()
    return value.trim()
  })
  if (new Set(possibilities.map(value => value.toLocaleLowerCase('en'))).size !== possibilities.length ||
    ((row.status === 'unknown' || row.status === 'no_cat') && possibilities.length !== 0) ||
    (row.status === 'possible' && possibilities.length === 0) ||
    (row.status === 'no_cat' && (row.coatLength !== 'unknown' || row.pattern !== 'unknown'))) return refuse()
  return { status: row.status as AppearanceAnswer['status'], possibilities,
    coatLength: row.coatLength as AppearanceAnswer['coatLength'], pattern: row.pattern as AppearanceAnswer['pattern'] }
}
/** One upload/analysis request covers every current cat tag, not eight paid
 * calls for an eight-cat photo. Indices are mapped to verified tags server-side.
 */
export const appearanceOutputSchema = {
  type: 'object', additionalProperties: false, required: ['cats'],
  properties: { cats: { type: 'array', minItems: 1, maxItems: 8, items: {
    ...catAppearanceOutputSchema,
    required: ['index', ...catAppearanceOutputSchema.required],
    properties: { index: { type: 'integer', minimum: 0, maximum: 7 }, ...catAppearanceOutputSchema.properties },
  } } },
} as const
export function appearanceAnswers(value: unknown, count: number): Array<AppearanceAnswer & { index: number }> {
  const row = object(value)
  if (!Number.isInteger(count) || count < 1 || count > 8 || Object.keys(row).some(key => key !== 'cats') ||
    !Array.isArray(row.cats) || row.cats.length !== count) return refuse()
  const seen = new Set<number>()
  return row.cats.map(value => {
    const { index, ...answer } = object(value)
    if (typeof index !== 'number' || !Number.isInteger(index) || index < 0 || index >= count || seen.has(index)) return refuse()
    seen.add(index)
    return { index, ...appearanceAnswer(answer) }
  }).sort((a, b) => a.index - b.index)
}
export interface AppearanceTag {
  key: string
  catId: string
  bounds?: { x: number; y: number; width: number; height: number }
}
export interface AppearanceSource {
  ownerId: string
  fileId: string
  tags: readonly AppearanceTag[]
  modelVersion: string
}
/** Owner/canonical source/model/prompt bind the cache. Social actions and text
 * edits cannot cause another provider call; changed cats/crops invalidate it.
 * Pass only server-resolved metadata, never an unverified request's fields.
 */
export async function appearanceCacheKey(source: AppearanceSource): Promise<string> {
  if (![source.ownerId, source.fileId].every(value => ID.test(value)) || !source.modelVersion || source.modelVersion.length > 100 ||
    !Array.isArray(source.tags) || source.tags.length < 1 || source.tags.length > 8) return refuse()
  const keys = new Set<string>()
  const tags = source.tags.map(tag => {
    if (!KEY.test(tag.key) || !ID.test(tag.catId) || keys.has(tag.key)) return refuse()
    keys.add(tag.key)
    const b = tag.bounds
    if (b && (![b.x, b.y, b.width, b.height].every(value => Number.isFinite(value) && value >= 0 && value <= 1) ||
      b.width === 0 || b.height === 0 || b.x + b.width > 1 || b.y + b.height > 1)) return refuse()
    return [tag.key, tag.catId, b ? [b.x, b.y, b.width, b.height] : null] as const
  }).sort((a, b) => a[0].localeCompare(b[0]))
  const normalized = [source.ownerId, source.fileId, tags, source.modelVersion, appearancePromptVersion, appearanceConsentVersion]
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(normalized)))
  return [...new Uint8Array(hash)].map(byte => byte.toString(16).padStart(2, '0')).join('')
}
