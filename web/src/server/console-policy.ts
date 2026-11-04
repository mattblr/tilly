import { consoleEnvironment } from '../lib/console-environment'

export function isConsoleRequest(request: Request) {
  try {
    const path = decodeURIComponent(new URL(request.url).pathname)
      .replace(/\/+/g, '/')
      .replace(/\/$/, '')
      .toLowerCase()
    return path === '/_foir/apps/tilly/admin'
  } catch {
    return false
  }
}

/** A fresh nonce lets Start hydrate the embedded route without permitting arbitrary inline scripts. */
export function consoleRequest(request: Request) {
  const nonce = crypto.randomUUID()
  const headers = new Headers(request.headers)
  // Overwrite any value from the visitor. Router SSR uses only this generated nonce.
  headers.set('x-tilly-csp-nonce', nonce)
  return { request: new Request(request, { headers }), nonce }
}
export function consoleResponse(response: Response, nonce: string, env?: Pick<WorkerBindings, 'FOIR_API_ORIGIN' | 'FOIR_FILES_ORIGIN'>) {
  const { apiOrigin, filesOrigin, consoleOrigins } = consoleEnvironment(env?.FOIR_API_ORIGIN, env?.FOIR_FILES_ORIGIN)
  const headers = new Headers(response.headers)
  headers.set(
    'content-security-policy',
    `default-src 'self'; script-src 'self' 'nonce-${nonce}'; style-src 'self' 'unsafe-inline'; img-src 'self' ${filesOrigin} data:; connect-src 'self' ${apiOrigin}; frame-ancestors ${consoleOrigins.join(' ')}`,
  )
  headers.set('cache-control', 'no-store')
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}
