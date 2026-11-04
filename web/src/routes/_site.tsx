import { designTokenStyle } from '~/lib/design-tokens'
import { GetDesignTokensDocument } from '~/generated/foir.content.generated'
/// <reference types="vite/client" />
import { Outlet, createFileRoute } from '@tanstack/react-router'
import appCss from '~/styles/app.css?url'
import { HeaderNav } from '~/components/HeaderNav'
import { FooterNav } from '~/components/FooterNav'
import { PixelCat } from '~/components/PixelCat'
import { ThemeProvider, useTheme } from '~/components/ThemeProvider'
import { CookieConsentBanner } from '~/components/CookieConsent'
import { CopyProvider, readAppCopyRecords, resolveAppCopy, formatAppCopy, useAppCopy } from '~/features/app/copy'
import {
  GetMenuDocument,
  GetCookieConsentDocument,
} from '~/generated/foir.content.generated'
import type { NavItem, CookieConsentData } from '~/lib/platform'

export const Route = createFileRoute('/_site')({
  loader: async ({ context: { content, foir, locale, preview } }) => {
    const [header, footer, footerMeta, cookies, tokens, words] =
      await Promise.allSettled([
        content.request(GetMenuDocument, {
          naturalKey: 'main-nav',
          locale,
          preview,
        }),
        content.request(GetMenuDocument, {
          naturalKey: 'footer',
          locale,
          preview,
        }),
        content.request(GetMenuDocument, {
          naturalKey: 'footer-meta',
          locale,
          preview,
        }),
        content.request(GetCookieConsentDocument, {
          naturalKey: 'default',
          locale,
          preview,
        }),
        content.request(GetDesignTokensDocument),
        readAppCopyRecords(foir, locale, preview),
      ])
    const menuItems = (result: typeof header) =>
      result.status === 'fulfilled'
        ? (result.value.menu?.items ?? []).filter((item) => item !== null)
        : []
    return {
      copyRecords: words.status === 'fulfilled' ? words.value : [],
      tokenStyle: designTokenStyle(
        tokens.status === 'fulfilled' ? tokens.value.designTokens : null,
      ),
      headerItems: menuItems(header),
      footerItems: menuItems(footer),
      footerMetaItems: menuItems(footerMeta),
      cookieConsentData:
        cookies.status === 'fulfilled'
          ? (cookies.value.cookieConsent ?? null)
          : null,
    }
  },
  head: ({loaderData}) => {
    const words = resolveAppCopy(loaderData?.copyRecords ?? [])
    const title = formatAppCopy(words, 'website.metaTitle')
    const description = formatAppCopy(words, 'website.metaDescription')
    return ({
    scripts: [{ children: themeScript }],
    meta: [
      { title },
      {
        name: 'description',
        content: description,
      },
      { name: 'theme-color', content: '#141414' },
      { property: 'og:title', content: title },
      {
        property: 'og:description',
        content: description,
      },
      { property: 'og:type', content: 'website' },
    ],
    links: [
      { rel: 'icon', type: 'image/png', href: '/images/tilly-icon.png' },
      { rel: 'stylesheet', href: appCss },
    ],
  })},
  component: SiteLayout,
})

function SiteLayout() {
  const {
    headerItems,
    footerItems,
    footerMetaItems,
    cookieConsentData,
    tokenStyle,
    copyRecords,
  } = Route.useLoaderData()

  return (
    <CopyProvider records={copyRecords}>
    <ThemeProvider defaultTheme="dark">
      <style>{tokenStyle}</style>
      <ThemeContent
        headerItems={headerItems}
        footerItems={footerItems}
        footerMetaItems={footerMetaItems}
        cookieConsentData={cookieConsentData}
      />
    </ThemeProvider>
    </CopyProvider>
  )
}

function ThemeContent({
  headerItems,
  footerItems,
  footerMetaItems,
  cookieConsentData,
}: {
  headerItems: NavItem[]
  footerItems: NavItem[]
  footerMetaItems: NavItem[]
  cookieConsentData: CookieConsentData | null
}) {
  const { resolvedTheme, setTheme } = useTheme()
  const t = useAppCopy()

  return (
    <div className={'site-shell min-h-svh flex flex-col [&_>_main]:flex-1'}>
      <HeaderNav items={headerItems} />
      <Outlet />
      <FooterNav items={footerItems} meta={footerMetaItems} />
      <CookieConsentBanner data={cookieConsentData} />
      <button
        onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
        className="fixed bottom-12 right-6 z-50 cursor-pointer transition-transform duration-300 hover:scale-110 active:scale-95"
        aria-label={t(resolvedTheme === 'dark' ? 'website.lightMode' : 'website.darkMode')}
      >
        <PixelCat size={44} />
      </button>
    </div>
  )
}

// Resolve the website theme before paint; the console owns its appearance separately.
const themeScript = `(function(){try{var t=localStorage.getItem('tilly-theme')||'dark';if(t==='system'){t=window.matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light'}var e=document.documentElement;e.classList.toggle('light',t==='light');e.classList.toggle('dark',t!=='light');e.style.colorScheme=t==='light'?'light':'dark'}catch{}})()`
