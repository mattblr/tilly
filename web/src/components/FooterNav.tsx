import { LanguageSelector } from './LanguageSelector'
import { Link } from '@tanstack/react-router'
import type { NavItem } from '~/lib/platform'

interface FooterNavProps {
  items: NavItem[]
  /** footer-meta menu: [0] = copyright holder (rendered "© {year} {label}"), rest = credit links. */
  meta?: NavItem[]
}

function FooterLink({ item }: { item: NavItem }) {
  const href =
    (/foir|fóir/i.test(item.label ?? '') ? 'https://foir.io' : item.url) ||
    (item.pageRef?._naturalKey ? `/${item.pageRef._naturalKey}` : '#')
  const target = item.openInNewTab ? '_blank' : undefined
  const rel = item.openInNewTab ? 'noopener noreferrer' : undefined

  if (href.startsWith('/')) {
    return (
      <Link
        to={href}
        className="transition-colors hover:text-tilly-text-secondary"
      >
        {item.label}
      </Link>
    )
  }

  return (
    <a
      href={href}
      target={target}
      rel={rel}
      className="transition-colors hover:text-tilly-text-secondary"
    >
      {item.label}
    </a>
  )
}

export function FooterNav({ items, meta = [] }: FooterNavProps) {
  const year = new Date().getFullYear()
  const [copyright, ...credits] = meta

  return (
    <footer
      className={[
        'site-footer flex flex-wrap justify-between items-end gap-6 max-w-[var(--page-width,_1200px)] w-full m-[48px_auto_0] p-[24px_var(--page-gutter,_20px)] relative z-10 font-sans text-xs text-tilly-text-tertiary',
        'max-[640px]:[&_nav]:gap-8 max-[640px]:[&_nav]:flex-wrap',
        '[.site-shell_>_&]:mt-[auto]',
        '[.encounter-reposter_>_&]:rounded-full',
      ].join(' ')}
    >
      {items.length > 0 && (
        <nav className="flex justify-center gap-16">
          {items.map((group) => (
            <div key={group.label} className="flex flex-col gap-2">
              {group.label && group.children?.length ? (
                <h4 className="text-xs font-semibold uppercase tracking-wider text-tilly-text-secondary">
                  {group.label}
                </h4>
              ) : (
                <FooterLink item={group} />
              )}
              {group.children && group.children.length > 0 && (
                <ul className="flex flex-col gap-1.5">
                  {group.children.map((child) =>
                    child ? (
                      <li key={child.label}>
                        <FooterLink item={child} />
                      </li>
                    ) : null,
                  )}
                </ul>
              )}
            </div>
          ))}
        </nav>
      )}

      <LanguageSelector />
      <div className="flex flex-col gap-2 justify-end">
        {copyright && (
          <p className="flex items-end">
            &copy; {year} {copyright.label}
            <br className="hidden sm:block" />
          </p>
        )}
        {credits
          .filter(
            (c) =>
              !/foir|fóir/i.test(c.label ?? '') ||
              !items.some((item) => /foir|fóir/i.test(item.label ?? '')),
          )
          .filter(
            (c, i, all) =>
              !/foir|fóir/i.test(c.label ?? '') ||
              all.findIndex((item) => /foir|fóir/i.test(item.label ?? '')) ===
                i,
          )
          .map((c) => (
            <p key={c.label} className="flex items-end">
              {c.url ? (
                <FooterLink
                  item={
                    /foir|fóir/i.test(c.label ?? '')
                      ? { ...c, url: 'https://foir.io' }
                      : c
                  }
                />
              ) : (
                c.label
              )}
            </p>
          ))}
      </div>
    </footer>
  )
}
