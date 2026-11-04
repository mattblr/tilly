import { useScrollHeader } from './useScrollHeader'
import { useAppCopy } from '~/features/app/copy'
import { useRouteContext } from '@tanstack/react-router'
import { localizedPath } from '~/lib/locale'
import { TillyLogo } from './TillyLogo'
import { Link } from '@tanstack/react-router'
import type { NavItem } from '~/lib/platform'

function MenuLink({ item }: { item: NavItem }) {
  const { locale, locales } = useRouteContext({ from: '__root__' })
  const href =
    item.url ||
    (item.pageRef?._naturalKey ? `/${item.pageRef._naturalKey}` : '#')
  return (
    <a
      href={localizedPath(href, locale, locales)}
      target={item.openInNewTab ? '_blank' : undefined}
      rel={item.openInNewTab ? 'noopener noreferrer' : undefined}
    >
      {item.label}
    </a>
  )
}

export function HeaderNav({ items }: { items: NavItem[] }) {
  const t = useAppCopy()
  const header = useScrollHeader()
  return (
    <header
      className={[
        "site-header sticky z-40 top-0 left-[auto] [transform:none] flex items-center justify-between gap-7.5 w-full max-w-[var(--page-width,_1200px)] p-[27px_28px] [font:15px_'Work_Sans',_sans-serif] px-[var(--page-gutter,_20px)] mx-[auto] [background:var(--color-tilly-bg)] [transition:transform_220ms_ease]",
        '[&_nav]:flex [&_nav]:items-center [&_nav]:gap-7.5',
        '[&_a]:min-h-10 [&_a]:inline-flex [&_a]:items-center [&_a]:cursor-pointer',
        '[&_summary]:min-h-10 [&_summary]:inline-flex [&_summary]:items-center [&_summary]:cursor-pointer',
        '[&_details]:relative',
        '[&_details_>_div]:absolute [&_details_>_div]:top-[45px] [&_details_>_div]:left-[-18px] [&_details_>_div]:grid [&_details_>_div]:gap-1.5 [&_details_>_div]:min-w-45 [&_details_>_div]:p-[12px_18px] [&_details_>_div]:[background:var(--color-tilly-surface)]',
        '[&_:focus-visible]:[outline:3px_solid_var(--color-tilly-accent)] [&_:focus-visible]:[outline-offset:4px]',
        'max-[600px]:p-[23px_20px] max-[600px]:gap-4.5 max-[600px]:text-[13px]',
        'max-[600px]:[&_nav]:gap-4.5',
        '[&:is(header)]:h-[var(--header-height)] [&:is(header)]:min-h-[var(--header-height)] [&:is(header)]:py-[0]',
        'min-[768px]:px-[var(--page-gutter-md,_28px)]',
        "[&[data-hidden='true']]:[transform:translateY(-100%)]",
        'max-[640px]:py-4.5 max-[640px]:min-h-19 max-[640px]:gap-4 max-[640px]:flex-wrap',
        'max-[640px]:[&_nav]:gap-4',
        'motion-reduce:[transition:none]',
        '[.site-shell_&:is(header)]:h-[auto] [.site-shell_&:is(header)]:min-h-[var(--header-height,_80px)] [.site-shell_&:is(header)]:py-5',
      ].join(' ')}
      {...header}
    >
      <TillyLogo
        className={[
          'site-wordmark',
          '[&_img]:block [&_img]:w-23 [&_img]:h-[auto]',
          'max-[600px]:[&_img]:w-16.5',
        ].join(' ')}
      />
      <nav aria-label={t('website.mainNavigation')}>
        {items.length ? (
          items.map((item) =>
            item.children?.length ? (
              <details key={item.label}>
                <summary>{item.label}</summary>
                <div>
                  {item.children.map((child) =>
                    child ? <MenuLink item={child} key={child.label} /> : null,
                  )}
                </div>
              </details>
            ) : (
              <MenuLink item={item} key={item.label} />
            ),
          )
        ) : (
          <>
            <a href="/#play">{t('website.navApp')}</a>
            <a href="/#friends">{t('website.navFriends')}</a>
            <a href="/#questions">{t('website.navQuestions')}</a>
          </>
        )}
      </nav>
      <Link
        className={['site-source', 'max-[600px]:[.site-header_&]:hidden'].join(
          ' ',
        )}
        to="/feed"
      >
        {t('website.openApp')} <span aria-hidden="true">↗</span>
      </Link>
    </header>
  )
}
