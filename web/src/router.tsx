import { FailureBoundary } from './components/FailureBoundary'
import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { createIsomorphicFn } from '@tanstack/react-start'
import { getRequestHeader, getRequestUrl } from '@tanstack/react-start/server'
import { createWebsiteClients } from './lib/foir'
import {
  isSystemPath,
  readLocales,
  pathLocale,
  localeRewrite,
} from './lib/locale'
import { routeTree } from './routeTree.gen'

const getCspNonce = createIsomorphicFn()
  .server(() => getRequestHeader('x-tilly-csp-nonce'))
  .client(
    () =>
      document
        .querySelector('meta[property="csp-nonce"]')
        ?.getAttribute('content') ?? undefined,
  )

const initialUrl = createIsomorphicFn()
  .server(() => getRequestUrl())
  .client(() => new URL(window.location.href))

export async function getRouter() {
  const url = initialUrl(),
    clients = createWebsiteClients()
  const locales = isSystemPath(url.pathname)
    ? []
    : await readLocales(clients.foir).catch(() => [])
  const locale = pathLocale(url.pathname, locales)
  const router = createTanStackRouter({
    routeTree,
    defaultErrorComponent: FailureBoundary,
    ssr: { nonce: getCspNonce() },
    context: { ...clients, locale, locales },
    rewrite: localeRewrite(locales, locale),
    scrollRestoration: true,
    defaultPreload: clients.preview ? false : 'intent',
    defaultPreloadStaleTime: 0,
  })

  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: Awaited<ReturnType<typeof getRouter>>
  }
}
