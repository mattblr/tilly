import { fetchHostedSession, hostedSignInUrl } from '@foir/sdk/auth'
import { userAccess, hasScope } from '@foir/sdk/auth'

// The preview reads drafts as the signed-in person, so Fóir decides who sees
// them. The website's one key holds `drafts:read` but gives it to nobody who
// isn't signed in; a person's token adds what their role grants, and the
// `preview-editor` role grants `drafts:read`. Fóir keeps the session; each
// request trades its cookie for a short-lived token. The Worker keeps no
// session and no list of editors.
export type PreviewEnv = Pick<WorkerBindings,
  'FOIR_PREVIEW' | 'TILLY_PREVIEW_HOST' |
  'TILLY_PREVIEW_LOGIN_ORIGIN' | 'TILLY_PREVIEW_AUTH_CLIENT_ID' | 'FOIR_API_ORIGIN'>

/** What the build baked in: whether it is the preview build, and the website key. */
export type PreviewBuild = { preview: boolean; apiKey: string }

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

/** The signed-in person and what Fóir says they may do, asked with their token. */
export async function readPreviewEditor(request: Request, env: PreviewEnv, apiKey: string) {
  const session = await fetchHostedSession(request, previewLoginConfig(env))
  if (session.outcome !== 'active') return { session, access: null }
  const access = await userAccess({
    PLATFORM_API_URL: env.FOIR_API_ORIGIN,
    PLATFORM_API_KEY: apiKey,
  }, { bearerToken: session.session.token })
  return { session, access }
}

export async function previewGate(
  request: Request, env: PreviewEnv, build: PreviewBuild,
  readEditor: typeof readPreviewEditor = readPreviewEditor,
) {
  const enabled = env.FOIR_PREVIEW === 'true'
  const refusal = (message: string, status: number) => previewResponse(new Response(message, { status }))
  if (enabled !== build.preview) return refusal('The preview build and deployment configuration do not match.', 503)
  if (!enabled) return null
  const url = new URL(request.url)
  let login: URL
  try { login = new URL(env.TILLY_PREVIEW_LOGIN_ORIGIN) } catch { return refusal('Preview sign-in is not configured.', 503) }
  if (url.protocol !== 'https:' || url.hostname !== env.TILLY_PREVIEW_HOST ||
      login.protocol !== 'https:' || login.origin !== env.TILLY_PREVIEW_LOGIN_ORIGIN ||
      !build.apiKey || !env.TILLY_PREVIEW_AUTH_CLIENT_ID)
    return refusal('Editor preview is not configured for this address.', 503)
  let path: string
  try { path = decodeURIComponent(url.pathname) } catch { return refusal('Invalid path.', 400) }
  const segments = path.toLowerCase().split('/').filter(Boolean)
  const reserved = new Set(['inbound','operations','_foir','_serverfn','api','feed','map','account','catch','cats','people','sign-in','welcome'])
  if (!['GET','HEAD'].includes(request.method) || reserved.has(segments[0]) ||
      (/^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/i.test(segments[0] ?? '') && reserved.has(segments[1])))
    return refusal('Preview contains website drafts only.', 403)
  try {
    const {session, access} = await readEditor(request, env, build.apiKey)
    if (session.outcome === 'signed-out') {
      return previewResponse(Response.redirect(hostedSignInUrl(previewLoginConfig(env), url.href), 302))
    }
    if (session.outcome !== 'active') return refusal('Sign-in is temporarily unavailable. Please retry.', 503)
    if (access?.userId !== session.session.userId || !hasScope(access, 'drafts:read'))
      return refusal('This account can’t see drafts: it doesn’t have the Preview editor role in Fóir.', 403)
  } catch { return refusal('Editor access could not be verified. Please retry.', 503) }
  // After sign-in Fóir lands on the preview's home page with the page the
  // person asked for as `returnTo`. Go there, on this site only.
  const back = returnTo(url)
  return back ? previewResponse(Response.redirect(back, 302)) : null
}

function returnTo(url: URL) {
  const value = url.pathname === '/' ? url.searchParams.get('returnTo') : null
  if (!value) return null
  try {
    const target = new URL(value)
    if (target.origin !== url.origin) return null
    target.searchParams.delete('returnTo')
    return target.href
  } catch { return null }
}
