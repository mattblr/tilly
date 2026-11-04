import defaults from '../../../ios/Tilly/Resources/Copy.json'

export type FailureKind =
  | 'generic' | 'network' | 'signIn' | 'recentAuth' | 'permission'
  | 'invalid' | 'conflict' | 'limited' | 'camera' | 'location' | 'pending'

export class ActionFailure extends Error {
  constructor(readonly kind: FailureKind) {
    super(kind)
    this.name = 'ActionFailure'
  }
}
const codes: Record<string, FailureKind> = {
  UNAUTHENTICATED: 'signIn',
  STEP_UP_REQUIRED: 'recentAuth',
  PERMISSION_DENIED: 'permission',
  INVALID_ARGUMENT: 'invalid',
  ALREADY_EXISTS: 'conflict',
  RATE_LIMITED: 'limited',
  TIMEOUT: 'network',
  UNAVAILABLE: 'network',
}
/** Only codes choose copy. Provider messages, HTML, URLs and record contents never do. */
export function failureKind(error: unknown): FailureKind {
  if (error instanceof ActionFailure && Object.hasOwn(defaults.errors, error.kind))
    return error.kind
  if (!error || typeof error !== 'object') return 'generic'
  const value = error as {
    code?: unknown
    status?: unknown
    name?: unknown
    graphQLErrors?: { extensions?: { code?: unknown } }[]
  }
  const code = (Array.isArray(value.graphQLErrors)
    ? value.graphQLErrors[0]?.extensions?.code
    : undefined) ?? value.code
  if (typeof code === 'string' && Object.hasOwn(codes, code)) return codes[code]
  if (value.status === 401 || value.name === 'FoirSessionExpiredError') return 'signIn'
  if (value.status === 403) return 'permission'
  if (value.status === 429) return 'limited'
  if (typeof value.name === 'string' && ['NotAllowedError', 'NotReadableError', 'NotFoundError'].includes(value.name))
    return 'permission'
  return 'generic'
}
export type ErrorCopy = (key: string) => string
export function friendlyError(
  error: unknown,
  copy: ErrorCopy = key => defaults.errors[key.slice(7) as FailureKind],
  fallback: FailureKind = 'generic',
) {
  const kind = failureKind(error)
  return copy(`errors.${kind === 'generic' ? fallback : kind}`)
}
