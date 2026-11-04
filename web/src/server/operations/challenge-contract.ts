/** Bounded server contract shared by persistence and provider adapters. */
export const challengeModel = 'gpt-6-luna'
export const challengePromptVersion = 'photo-challenge-v1'
export const challengeGraceMs = 24 * 60 * 60 * 1000
export const maxCaptureChallenges = 4
const KEY = /^[a-z][a-z0-9-]{0,39}$/
export class ChallengeRefusal extends Error {
  constructor(public status: number, message: string) {super(message)}
}
export interface PhotoChallenge {
  _naturalKey: string; title: string; description: string; icon: string; enabled: boolean
  startsAt: string; endsAt: string; criteriaVersion: string; criteria: string
  highlightKey: string; targetCount: number; modelVersion: string
}
export type ChallengeStatus = 'reserved'|'evaluating'|'qualified'|'not-qualified'|'unavailable'|'recovery'|'removed'
export interface ChallengeEvaluation {
  _id:string; _ownerId:string; challengeKey:string; challengeVersion:string; captureId:string; fileId:string
  revision:string; criteriaDigest:string; modelVersion:string; status:ChallengeStatus; outcome?:'qualified'|'not-qualified'|null; attemptCount:number; retryCount:number
  runId:string|null; evaluatedAt:string|null; reasonCode:string|null
}
export function photoChallenge(value: unknown): PhotoChallenge {
  if (!value || typeof value!=='object') throw new ChallengeRefusal(503,'The challenge rules are unavailable.')
  const row=value as PhotoChallenge
  if (!KEY.test(row._naturalKey) || !KEY.test(row.highlightKey) || typeof row.enabled!=='boolean' ||
    !['title','description','icon','criteriaVersion','criteria'].every(key=>typeof row[key as keyof PhotoChallenge]==='string') ||
    row.title.length<1 || row.title.length>120 || row.description.length>500 || row.criteria.length<1 || row.criteria.length>1200 ||
    !/^[a-zA-Z0-9-]{1,80}$/.test(row.criteriaVersion) || !['selfie','camera','postbox','sparkles'].includes(row.icon) ||
    !Number.isInteger(row.targetCount) || row.targetCount<1 || row.targetCount>30 || row.modelVersion!==challengeModel ||
    !Number.isFinite(Date.parse(row.startsAt)) || !Number.isFinite(Date.parse(row.endsAt)) || Date.parse(row.startsAt)>=Date.parse(row.endsAt) || Date.parse(row.endsAt)-Date.parse(row.startsAt)>31*24*60*60*1000)
    throw new ChallengeRefusal(503,'The challenge rules are unavailable.')
  return row
}
export function captureInChallenge(challenge: PhotoChallenge, capturedAt: string, now: Date): boolean {
  const captured=Date.parse(capturedAt), time=now.getTime()
  return challenge.enabled && Number.isFinite(captured) && Number.isFinite(time) && captured>=Date.parse(challenge.startsAt) &&
    captured<Date.parse(challenge.endsAt) && captured<=time && time<Date.parse(challenge.endsAt)+challengeGraceMs
}
export async function challengeDigest(value: unknown) {
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(value))))].map(n=>n.toString(16).padStart(2,'0')).join('')
}
export const challengeCriteriaDigest = (challenge: PhotoChallenge) => challengeDigest([
  challenge._naturalKey,challenge.criteriaVersion,challenge.criteria,challenge.startsAt,challenge.endsAt,
  challenge.highlightKey,challenge.targetCount,challenge.modelVersion,challengePromptVersion,
])
export const challengeEvidenceKey = (owner: string, captureId: string, fileId: string, criteriaDigest: string) =>
  challengeDigest([owner,captureId,fileId,criteriaDigest])
export interface ChallengeAnswer {qualified:boolean;catVisible:boolean;reasonCode:'qualified'|'criteria_missing'|'no_cat'|'unclear'}
export function challengeAnswer(value: unknown): ChallengeAnswer {
  if (!value || typeof value!=='object' || Array.isArray(value)) throw new Error('Invalid challenge answer.')
  const row=value as ChallengeAnswer
  if (Object.keys(row).sort().join(',')!=='catVisible,qualified,reasonCode' || typeof row.qualified!=='boolean' || typeof row.catVisible!=='boolean' ||
    !['qualified','criteria_missing','no_cat','unclear'].includes(row.reasonCode) ||
    (row.qualified && (!row.catVisible || row.reasonCode!=='qualified')) || (!row.qualified && row.reasonCode==='qualified') ||
    (row.reasonCode==='no_cat' && row.catVisible)) throw new Error('Invalid challenge answer.')
  return row
}
/** Progress never adds mutable counters. The same canonical capture counts once;
 * rows from other owners, rules or ambiguous duplicate claims fail closed. */
export function challengeProgress(rows: readonly ChallengeEvaluation[], owner: string, challenge: PhotoChallenge, digest: string) {
  const seen=new Set<string>(), qualified=new Set<string>()
  for (const row of rows) {
    if (row._ownerId!==owner || row.challengeKey!==challenge._naturalKey || row.criteriaDigest!==digest || row.challengeVersion!==challenge.criteriaVersion || seen.has(row.captureId))
      throw new ChallengeRefusal(503,'Challenge progress could not be checked.')
    seen.add(row.captureId)
    if (row.status==='qualified') qualified.add(row.captureId)
  }
  return qualified.size
}
