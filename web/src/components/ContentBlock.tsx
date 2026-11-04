import { ContentAlignEnum, ContentCtaLayoutEnum } from '~/generated/foir.content.generated'
import { type ContentLike, type Cta } from '~/lib/platform'
import { CtaList } from './CtaBlock'
import { RichText, passagesOf } from './RichText'

const ALIGN_CLASS: Record<ContentAlignEnum, string> = {
  [ContentAlignEnum.start]: 'text-left items-start',
  [ContentAlignEnum.center]: 'text-center items-center',
  [ContentAlignEnum.end]: 'text-right items-end',
}

function ctaLayout(content: ContentLike): 'row' | 'column' {
  return content.ctaLayout === ContentCtaLayoutEnum.column ? 'column' : 'row'
}

/**
 * Renders the shared content shape — prose + CTAs. Used as a page-level block
 * and as the content inside a media overlay, so it takes a `defaultAlign` the
 * overlay derives from its anchor position.
 */
export function ContentBody({
  content,
  defaultAlign = ContentAlignEnum.start,
  proseClassName = 'page-content font-serif text-tilly-text',
}: {
  content: ContentLike
  defaultAlign?: ContentAlignEnum
  proseClassName?: string
}) {
  const ctas = (content.ctas ?? []).filter((c): c is Cta => !!c)
  const hasProse =
    passagesOf(content.richtext).length > 0 || !!content.richtext?.html
  if (!hasProse && ctas.length === 0) return null

  const align = content.contentAlign ?? defaultAlign

  return (
    <div className={`flex flex-col gap-6 ${ALIGN_CLASS[align]}`}>
      <RichText value={content.richtext} className={proseClassName} />
      {ctas.length > 0 ? (
        <CtaList ctas={ctas} layout={ctaLayout(content)} />
      ) : null}
    </div>
  )
}
