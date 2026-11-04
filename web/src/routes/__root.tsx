import { FailureBoundary } from '~/components/FailureBoundary'
import { PreviewNavigation } from '~/components/PreviewNavigation'
import { createElement, type ReactNode } from 'react'
import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
  Scripts,
} from '@tanstack/react-router'
import type { WebsiteContext } from '~/lib/foir'

// Shared HTML only. Website CMS loading and theme live in the pathless _site layout.
export const Route = createRootRouteWithContext<WebsiteContext>()({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
    ],
  }),
  shellComponent: Document,
  errorComponent: FailureBoundary,
  component: Outlet,
})

function Document({ children }: { children: ReactNode }): ReactNode {
  const {locale,locales,preview}=Route.useRouteContext()
  const language=locales.find(item=>item.code===locale) ?? locales.find(item=>item.isDefault)
  return createElement(
    'html',
    { lang: language?.code ?? 'en', dir: language?.isRtl ? 'rtl' : 'ltr', className: 'has-[.foir-console]:bg-[var(--background)] has-[.foir-console]:text-[var(--foreground)] has-[.foir-console]:font-sans' },
    createElement('head', null, createElement(HeadContent)),
    createElement(
      'body',
      null,
      children,
      createElement(PreviewNavigation, { enabled: preview }),
      createElement(Scripts),
    ),
  )
}
