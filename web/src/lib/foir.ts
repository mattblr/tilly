import { createIsomorphicFn } from '@tanstack/react-start'
import { serverWebsiteEnvironment } from '~/server/preview-environment'
import { createFoirClientFromEnv } from '@foir/sdk/data'
import { createFoirContentClient } from '@foir/sdk/client'
import * as generated from '~/generated/foir.website.generated'
import type { ProjectLocale } from './locale'

const previewEnvironment = createIsomorphicFn()
  .server(() => serverWebsiteEnvironment())
  .client(() => null)

/** Both SDK clients use the same scoped publishable website credential. Anonymous access is read-only; signed-in actions require the user session. */
export function websiteEnvironment() {
  return {
    FOIR_PREVIEW: 'false',
    PLATFORM_API_URL:
      import.meta.env.VITE_PLATFORM_API_URL || 'https://api.foir.dev',
    PLATFORM_API_KEY: import.meta.env.VITE_PLATFORM_API_KEY || '',
  }
}
export function createWebsiteClients(
  session?: {
    getToken: () => Promise<string | null>
    refreshToken: () => Promise<string | null>
  },
  locale?: string,
) {
  const server = previewEnvironment()
  const env = server?.environment ?? websiteEnvironment()
  const getToken = server?.getToken ?? session?.getToken
  return {
    locale,
    preview: import.meta.env.VITE_FOIR_PREVIEW === 'true',
    locales: [] as ProjectLocale[],
    foir: createFoirClientFromEnv(env, {
      generated,
      bearerToken: getToken,
      refreshBearer: session?.refreshToken,
    }),
    // CMS documents explicitly select inline links and nested menus. The SDK
    // owns transport, auth and retry; no Apollo client or privileged web proxy.
    content: createFoirContentClient({
      env,
      getToken,
    }),
  }
}
export type WebsiteContext = ReturnType<typeof createWebsiteClients>
