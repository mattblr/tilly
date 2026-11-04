/** Fóir forwards a sibling site's returnTo through the primary post-login URL. */
export function loginReturn(request: Request, previewHost: string) {
  const url = new URL(request.url)
  if (request.method !== 'GET' || url.pathname !== '/feed' || !previewHost) return null
  const value = url.searchParams.get('returnTo')
  if (!value) return null
  try {
    const target = new URL(value)
    const allowed = new URL(`https://${previewHost}`)
    if (allowed.hostname !== previewHost || allowed.port || allowed.username || allowed.password ||
        target.origin !== allowed.origin || target.username || target.password) return null
    return new Response(null, { status: 302, headers: {
      Location: target.href, 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer',
    } })
  } catch { return null }
}
