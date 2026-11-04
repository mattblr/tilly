import { Languages } from 'lucide-react'
import { useAppCopy } from '~/features/app/copy'
import { useRouteContext } from '@tanstack/react-router'
import { localizedPath } from '~/lib/locale'
import { Select, SelectTrigger, SelectContent, SelectItem } from './ui/select'
/** Names stay in their own language, matching the mattblr.com footer control. */
export function LanguageSelector() {
  const t = useAppCopy()
  const { locale, locales } = useRouteContext({ from: '__root__' })
  if (locales.length < 2) return null
  const selected =
    locale ?? locales.find((item) => item.isDefault)?.code ?? locales[0].code
  return (
    <Select
      value={selected}
      onValueChange={(value) => {
        const url = new URL(window.location.href)
        url.pathname = localizedPath(url.pathname, value, locales)
        window.location.assign(url.href)
      }}
    >
      <SelectTrigger
        className={[
          'language-selector inline-flex items-center justify-center w-11 h-11 p-2.5 [color:var(--color-tilly-text-secondary)] [border:0] [box-shadow:none] rounded-[var(--radius-photo,_6px)]',
          '[&_>_svg:last-child:not(:first-child)]:hidden',
          'hover:[background:var(--color-tilly-surface)] hover:[color:var(--color-tilly-text)]',
        ].join(' ')}
        aria-label={t('website.language')}
        title={t('website.language')}
      >
        <Languages size={20} aria-hidden="true" />
      </SelectTrigger>
      <SelectContent
        className={[
          'tilly-select-content z-100 [background:var(--color-tilly-bg)] [color:var(--color-tilly-text)] [border:1px_solid_var(--color-tilly-border)] min-w-45 max-w-[calc(100vw_-_32px)] font-sans text-[14px] leading-[1.5]',
          '[&_[data-highlighted]]:[background:var(--color-tilly-surface)] [&_[data-highlighted]]:[color:var(--color-tilly-text)]',
          "[&_[role='option']]:min-h-11",
        ].join(' ')}
        side="top"
        align="end"
      >
        {locales.map((item) => (
          <SelectItem key={item.code} value={item.code} lang={item.code}>
            {item.nativeName || item.displayName}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
