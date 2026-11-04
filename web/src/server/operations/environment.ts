/** Deployment configuration chooses an API origin; requests cannot override it.
 * Production Fóir is the default; Fóir's dev environment is an explicit opt-in. */
export function operationApi(value?: string) {
  const origin = value || 'https://api.foir.dev'
  const url = new URL(origin)
  if (
    url.protocol !== 'https:' ||
    url.origin !== origin ||
    url.username ||
    url.password
  )
    throw new Error('FOIR_API_ORIGIN must be an HTTPS origin.')
  return url.origin
}
