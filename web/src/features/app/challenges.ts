import type { AppClient } from './data'
import { collectConnection } from './paging'

/** UI reads use only the user's ordinary scoped SDK client. */
export async function readChallenges(client: AppClient) {
  const [catalog, evaluations, awards] = await Promise.all([
    collectConnection(after => client['photo-challenge'].findMany({first: 32, after})),
    collectConnection(after => client['challenge-evaluation'].findManyMine({first: 100, after})),
    collectConnection(after => client['challenge-award'].findManyMine({first: 100, after})),
  ])
  if (catalog.length > 32 || evaluations.length > 2000 || awards.length > 2000)
    throw new Error('Challenge data exceeds its safe limit.')
  return {catalog, evaluations, awards}
}

export function verifiedChallengeKeys(value: unknown): string[] {
  if (value == null) return []
  if (!Array.isArray(value) || value.length > 32) return []
  const keys = value.flatMap(row => row && typeof row === 'object' &&
    typeof row.challengeKey === 'string' && /^[a-z][a-z0-9-]{0,39}$/.test(row.challengeKey) &&
    typeof row.criteriaDigest === 'string' && /^[a-f0-9]{64}$/.test(row.criteriaDigest) &&
    typeof row.highlightKey === 'string' && /^[a-z][a-z0-9-]{0,39}$/.test(row.highlightKey)
    ? [row.highlightKey] : [])
  return [...new Set(keys)]
}

export function challengeIsActive(challenge: {enabled: boolean | null; startsAt: string | null; endsAt: string | null}, now = Date.now()) {
  const start = Date.parse(challenge.startsAt ?? ''), end = Date.parse(challenge.endsAt ?? '')
  return challenge.enabled === true && Number.isFinite(start) && Number.isFinite(end) && start < end && now >= start && now < end
}
export async function readChallengeCatalog(client: AppClient) {
  const rows = await collectConnection(after => client['photo-challenge'].findMany({first: 32, after}))
  if (rows.length > 32) throw new Error('Challenge catalog exceeds its safe limit.')
  return rows
}
