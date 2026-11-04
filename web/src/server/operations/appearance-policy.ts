/** Separate native Fóir meter from save_catch. Ten analysis requests per user
 * per rolling 24 hours, matching the upload quota's existing window.
 * Compose through the root configuration after the development scope review.
 */
export const appearanceQuota = {
  rules: [{ points: 10, duration: 86400, scope: 'user' as const, failClosed: true,
    message: 'You’ve used today’s appearance suggestions. Try again tomorrow.' }],
}
export type AppearanceEligibility = 'regular' | 'premium'
export const initialAppearanceEligibility: AppearanceEligibility = 'regular'
export class AppearanceAccessRefusal extends Error {
  readonly code: 'UNAUTHENTICATED' | 'NOT_CONFIGURED' | 'PREMIUM_REQUIRED'
  constructor(code: 'UNAUTHENTICATED' | 'NOT_CONFIGURED' | 'PREMIUM_REQUIRED') {
    super(code === 'UNAUTHENTICATED' ? 'Sign in to use appearance suggestions.' :
      code === 'PREMIUM_REQUIRED' ? 'Appearance suggestions currently require Tilly Premium.' : 'Appearance suggestions are not configured.')
    this.code = code
  }
}
/** Settings come from current Fóir records, not caller input or browser state.
 * Regular includes both free and Premium members; Premium narrows eligibility.
 * A missing/invalid setting fails closed rather than quietly granting access.
 */
export function requireAppearanceAccess(actor: string | null, eligibility: unknown,
  grants: readonly { _ownerId: string | null; until: string | null }[], now: Date) {
  if (!actor) throw new AppearanceAccessRefusal('UNAUTHENTICATED')
  if (!Number.isFinite(now.getTime()) || !['regular', 'premium'].includes(eligibility as string))
    throw new AppearanceAccessRefusal('NOT_CONFIGURED')
  if (eligibility === 'premium' && !grants.some(grant => grant._ownerId === actor &&
    typeof grant.until === 'string' && Date.parse(grant.until) > now.getTime()))
    throw new AppearanceAccessRefusal('PREMIUM_REQUIRED')
}
