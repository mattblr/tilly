import type { PageBlock } from '~/lib/platform'
import { BlockDigester } from '~/components/BlockDigester'

interface PageContentProps {
  title: string
  blocks: PageBlock[]
  jsonLd?: string | null
}

export function PageContent({ title, blocks, jsonLd }: PageContentProps) {
  return (
    <div
      className={
        'relative [.encounter-reposter_>_&]:rounded-full z-10 min-h-screen px-6 pt-24 pb-12'
      }
    >
      <article
        className={
          'glass-card [background:var(--color-tilly-glass)] [border:1px_solid_var(--color-tilly-glass-border)] [backdrop-filter:blur(24px)] [-webkit-backdrop-filter:blur(24px)] mx-auto max-w-2xl rounded-2xl p-8 sm:p-12'
        }
      >
        <h1 className="font-serif text-3xl font-bold text-tilly-text mb-8">
          {title}
        </h1>

        {blocks.length > 0 && <BlockDigester blocks={blocks} />}
      </article>

      {/* JSON-LD structured data */}
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd.replace(/</g, '\\u003c') }}
        />
      )}
    </div>
  )
}
