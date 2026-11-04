import { Link } from '@tanstack/react-router'
import { CtaVariantEnum } from '~/generated/foir.content.generated'
import { pagePath, type Cta } from '~/lib/platform'

const VARIANT_CLASS: Record<CtaVariantEnum, string> = {
  [CtaVariantEnum.solid]:
    'bg-tilly-accent text-tilly-text hover:bg-tilly-accent-light',
  [CtaVariantEnum.outline]:
    'border border-tilly-text-tertiary text-tilly-text hover:border-tilly-text-secondary',
  [CtaVariantEnum.link]:
    'text-tilly-accent-light underline underline-offset-4 hover:text-tilly-accent px-0 py-0',
}

const BASE_CLASS =
  'inline-block rounded-full px-6 py-2.5 font-sans text-sm font-medium transition-colors'

export function CtaButton({ cta }: { cta: Cta }) {
  // pageRef wins over a hand-authored href, mirroring the media block's
  // linkRef-then-linkUrl dispatch.
  const href = pagePath(cta.pageRef) ?? cta.href ?? null
  if (!href || !cta.label) return null

  const className = `${BASE_CLASS} ${VARIANT_CLASS[cta.variant ?? CtaVariantEnum.solid]}`

  if (cta.openInNewTab || !href.startsWith('/')) {
    return (
      <a
        href={href}
        className={className}
        {...(cta.openInNewTab
          ? { target: '_blank', rel: 'noopener noreferrer' }
          : {})}
      >
        {cta.label}
      </a>
    )
  }

  return (
    <Link to={href} className={className}>
      {cta.label}
    </Link>
  )
}

export function CtaList({
  ctas,
  layout = 'row',
}: {
  ctas: Cta[]
  layout?: 'row' | 'column'
}) {
  if (!ctas.length) return null
  // Mobile always stacks; `layout` only drives the ≥768px direction.
  return (
    <div
      className={`flex flex-col gap-3 ${layout === 'row' ? 'md:flex-row md:items-center' : ''}`}
    >
      {ctas.map((cta, i) => (
        <CtaButton key={i} cta={cta} />
      ))}
    </div>
  )
}
