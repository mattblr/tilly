import { fetchHostedSession, hostedSignInUrl } from '@foir/sdk/auth'
import { userAccess, hasRole, hasScope } from '@foir/sdk/auth'

export type PreviewEnv = Pick<WorkerBindings,
  'FOIR_PREVIEW' | 'TILLY_PREVIEW_HOST' | 'TILLY_PREVIEW_EDITOR_IDS' | 'FOIR_PREVIEW_API_KEY' |
  'TILLY_PREVIEW_LOGIN_ORIGIN' | 'TILLY_PREVIEW_AUTH_CLIENT_ID' | 'FOIR_API_ORIGIN'>

export function previewResponse(response: Response) {
  const headers = new Headers(response.headers)
  headers.set('Cache-Control', 'private, no-store, max-age=0')
  headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive')
  headers.set('Referrer-Policy', 'no-referrer')
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers })
}

export function previewLoginConfig(env: PreviewEnv) {
  return { loginOrigin: env.TILLY_PREVIEW_LOGIN_ORIGIN, clientId: env.TILLY_PREVIEW_AUTH_CLIENT_ID }
}

/** A server-only drafts credential is never evidence that the visitor is an editor. */
export async function readPreviewEditor(request: Request, env: PreviewEnv) {
  const session = await fetchHostedSession(request, previewLoginConfig(env))
  if (session.outcome !== 'active') return { session, access: null }
  const access = await userAccess({
    PLATFORM_API_URL: env.FOIR_API_ORIGIN,
    PLATFORM_API_KEY: env.FOIR_PREVIEW_API_KEY,
  }, { bearerToken: session.session.token })
  return { session, access }
}

export type PreviewIdentity = Awaited<ReturnType<typeof readPreviewEditor>>
export async function previewGate(
  request: Request, env: PreviewEnv, compiledPreview: boolean,
  readEditor: typeof readPreviewEditor = readPreviewEditor,
) {
  const enabled = env.FOIR_PREVIEW === 'true'
  const refusal = (message: string, status: number) => previewResponse(new Response(message, { status }))
  if (enabled !== compiledPreview) return refusal('The preview build and deployment configuration do not match.', 503)
  if (!enabled) return null
  const url = new URL(request.url)
  let login: URL
  try { login = new URL(env.TILLY_PREVIEW_LOGIN_ORIGIN) } catch { return refusal('Preview sign-in is not configured.', 503) }
  if (url.protocol !== 'https:' || url.hostname !== env.TILLY_PREVIEW_HOST ||
      login.protocol !== 'https:' || login.origin !== env.TILLY_PREVIEW_LOGIN_ORIGIN ||
      !env.FOIR_PREVIEW_API_KEY || !env.TILLY_PREVIEW_AUTH_CLIENT_ID)
    return refusal('Editor preview is not configured for this address.', 503)
  let path: string
  try { path = decodeURIComponent(url.pathname) } catch { return refusal('Invalid path.', 400) }
  const segments = path.toLowerCase().split('/').filter(Boolean)
  const reserved = new Set(['inbound','operations','_foir','_serverfn','api','feed','map','account','catch','cats','people','sign-in','welcome'])
  if (!['GET','HEAD'].includes(request.method) || reserved.has(segments[0]) ||
      (/^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/i.test(segments[0] ?? '') && reserved.has(segments[1])))
    return refusal('Preview contains website drafts only.', 403)
  try {
    const {session, access} = await readEditor(request, env)
    if (session.outcome === 'signed-out') {
      return previewResponse(Response.redirect(hostedSignInUrl(previewLoginConfig(env), `${url.origin}/`), 302))
    }
    if (session.outcome !== 'active') return refusal('Sign-in is temporarily unavailable. Please retry.', 503)
    // An optional explicit editor list is controlled by the project owner.
    // It uses verified immutable subjects, never an email or request header.
    const listed = new Set((env.TILLY_PREVIEW_EDITOR_IDS ?? '').split(',').map(id => id.trim()).filter(Boolean))
    const samePerson = access?.userId === session.session.userId
    const approved = hasRole(access, 'preview-editor') || (access !== null && listed.has(access.userId))
    if (!samePerson || !approved || !hasScope(access, 'drafts:read'))
      return refusal('Your account does not have preview editor access.', 403)
    return null
  } catch { return refusal('Editor access could not be verified. Please retry.', 503) }
}
