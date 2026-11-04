import { previewEnvironment } from './preview-context'
import { getRequest } from '@tanstack/react-start/server'
import { fetchHostedSession } from '@foir/sdk/auth'
import { previewLoginConfig } from './preview-policy'

/** Imported only inside the server branch of createIsomorphicFn. */
export function serverWebsiteEnvironment() {
  if (import.meta.env.VITE_FOIR_PREVIEW !== 'true') return null
  const env = previewEnvironment()
  if (!env.FOIR_PREVIEW_API_KEY) throw new Error('Configure the server-only preview credential.')
  // The Worker gate already checked editor access. Re-exchange the first-party
  // cookie for these SSR reads; the bearer remains inside this request's closure.
  const request = getRequest()
  let session: ReturnType<typeof fetchHostedSession> | undefined
  const getToken = async () => {
    session ??= fetchHostedSession(request, previewLoginConfig(env))
    const result = await session
    if (result.outcome !== 'active') throw new Error('Preview session is unavailable.')
    return result.session.token
  }
  return {
    environment: {
      FOIR_PREVIEW: 'true',
      PLATFORM_PREVIEW_API_KEY: env.FOIR_PREVIEW_API_KEY,
      PLATFORM_API_KEY: env.FOIR_PREVIEW_API_KEY,
      PLATFORM_API_URL: `${new URL(env.FOIR_API_ORIGIN).origin}/graphql`,
    },
    getToken,
  }
}
