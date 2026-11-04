/** Publication policy is deterministic. Model output never supplies authority. */
export type SafetyVerdict = 'approved' | 'flagged' | 'error' | 'hidden'
export type SafetyTarget = 'CapturePhoto' | 'CapturePost' | 'FieldNote' | 'Profile' | 'CatchArt' | 'input'
export interface CheckedContent { targetType: SafetyTarget; targetId: string; text: string; fileId?: string; image?: Uint8Array; mimeType?: string }
export interface SafetyCase { id: string; digest: string; status: string; targetType: string; targetId: string; fileId?: string | null }
export interface SafetyDecision { approved: boolean; status: SafetyVerdict; digest: string; categories: string[] }
export interface SafetyStore {
  holds(content: CheckedContent): Promise<boolean>
  matching(content: CheckedContent, digest: string): Promise<SafetyCase[]>
  keep(content: CheckedContent, digest: string, verdict: SafetyVerdict, categories: string[]): Promise<void>
}
export const SAFETY_MODEL = 'omni-moderation-latest'
const imageCategories = ['sexual', 'violence', 'violence/graphic', 'self-harm', 'self-harm/intent', 'self-harm/instructions']
const textCategories = [...imageCategories, 'sexual/minors', 'harassment', 'harassment/threatening', 'hate', 'hate/threatening', 'illicit', 'illicit/violent']

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
}
/** A zero for an unsupported image category is not evidence of screening. */
export function moderationResult(value: unknown, hasImage: boolean, hasText = true): { status: 'approved' | 'flagged'; categories: string[] } {
  const response = record(value), rows = response?.results
  if (!Array.isArray(rows) || rows.length !== 1) throw new Error('Moderation did not return one complete result.')
  const row = record(rows[0]), flags = record(row?.categories), scores = record(row?.category_scores), applied = record(row?.category_applied_input_types)
  if (!row || typeof row.flagged !== 'boolean' || !flags || !scores || !Object.keys(flags).length)
    throw new Error('Moderation returned an incomplete verdict.')
  for (const [name, flag] of Object.entries(flags)) {
    const score = scores[name]
    if (typeof flag !== 'boolean' || typeof score !== 'number' || !Number.isFinite(score) || score < 0 || score > 1)
      throw new Error('Moderation returned an invalid category.')
  }
  if (hasImage && imageCategories.some(name => typeof flags[name] !== 'boolean' || !Array.isArray(applied?.[name]) || !applied[name].includes('image')))
    throw new Error('The image did not receive the required safety checks.')
  if (hasText && textCategories.some(name => typeof flags[name] !== 'boolean' || !Array.isArray(applied?.[name]) || !applied[name].includes('text')))
    throw new Error('The text did not receive the required safety checks.')
  const categories = Object.keys(flags).filter(name => flags[name] === true)
  return { status: row.flagged || categories.length ? 'flagged' : 'approved', categories }
}
async function hash(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', Uint8Array.from(bytes))
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
}
export async function safetyDigest(content: CheckedContent) {
  return hash(new TextEncoder().encode(JSON.stringify({ version: 1, model: SAFETY_MODEL,
    image: content.image ? await hash(content.image) : null, text: content.text.normalize('NFC'),
  })))
}
export async function checkContent(
  store: SafetyStore, content: CheckedContent, call: () => Promise<unknown>,
  failed?: (stage: 'request' | 'verdict') => void,
): Promise<SafetyDecision> {
  if (!content.targetId || content.text.length > 4000 || (!content.text.trim() && !content.image))
    throw new Error('Content is missing or too long to check.')
  const digest = await safetyDigest(content)
  if (await store.holds(content)) return { approved: false, status: 'hidden', digest, categories: [] }
  const prior = await store.matching(content, digest)
  if (prior.some(row => row.digest === digest && row.status === 'approved'))
    return { approved: true, status: 'approved', digest, categories: [] }
  // A refused item needs human review; retries must not turn it into a new vote.
  if (prior.some(row => row.digest === digest && row.status === 'flagged'))
    return { approved: false, status: 'flagged', digest, categories: [] }
  let verdict: { status: SafetyVerdict; categories: string[] }
  let received = false
  try { const result = await call(); received = true; verdict = moderationResult(result, !!content.image, !!content.text.trim()) }
  catch { failed?.(received ? 'verdict' : 'request'); verdict = { status: 'error', categories: [] } }
  // Failure to persist the decision also refuses publication.
  await store.keep(content, digest, verdict.status, verdict.categories)
  // An operator hold created during the external request wins over its result.
  if (await store.holds(content)) return { approved: false, status: 'hidden', digest, categories: [] }
  return { ...verdict, digest, approved: verdict.status === 'approved' }
}

export function contentAllowedForUser(blocked: ReadonlySet<string>, author: string | null | undefined, repostedBy?: string | null) {
  return !(author && blocked.has(author)) && !(repostedBy && blocked.has(repostedBy))
}
