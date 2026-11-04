import type { ReactNode } from 'react'
import type { PageBlock, PassageBlock } from '~/lib/platform'
import { PassageList } from './RichText'
import { MediaBlock } from './MediaBlock'
import { ContentBody } from './ContentBlock'

/**
 * Renders a page's prose flow. The homepage is a `content` block (text)
 * followed by an `editorial_media` block (image or video); content pages
 * (terms, privacy) are the flow's own passages. Consecutive passages
 * render as one run so the body keeps its single-column typography.
 */
export function BlockDigester({ blocks }: { blocks: PageBlock[] }) {
  // The first media on the page is the LCP candidate — not necessarily the
  // first block, since a page typically opens with a line of text.
  const firstMediaIndex = blocks.findIndex(
    (b) => b.__typename === 'EditorialMedia',
  )

  const out: ReactNode[] = []
  let run: PassageBlock[] = []
  const flushRun = () => {
    if (run.length === 0) return
    out.push(
      <div
        key={run[0]._id ?? `run-${out.length}`}
        className={[
          'page-content font-serif text-tilly-text',
          '[&_h1]:text-[1.875rem] [&_h1]:font-bold [&_h1]:mt-[2rem] [&_h1]:mb-[1rem]',
          '[&_h2]:text-[1.5rem] [&_h2]:font-bold [&_h2]:mt-[1.75rem] [&_h2]:mb-[0.75rem]',
          '[&_h3]:text-[1.25rem] [&_h3]:font-semibold [&_h3]:mt-[1.5rem] [&_h3]:mb-[0.5rem]',
          '[&_p]:mb-[1rem] [&_p]:leading-[1.75] [&_p]:[color:var(--color-tilly-cream)]',
          '[&_a]:[color:var(--color-tilly-accent-light)] [&_a]:underline [&_a]:[text-underline-offset:2px] [&_a]:[transition:color_0.15s]',
          '[&_a:hover]:[color:var(--color-tilly-text)]',
          '[&_ul]:mb-[1rem] [&_ul]:pl-[1.5rem] [&_ul]:leading-[1.75] [&_ul]:[color:var(--color-tilly-cream)] [&_ul]:[list-style-type:disc]',
          '[&_ol]:mb-[1rem] [&_ol]:pl-[1.5rem] [&_ol]:leading-[1.75] [&_ol]:[color:var(--color-tilly-cream)] [&_ol]:[list-style-type:decimal]',
          '[&_li]:mb-[0.25rem]',
          '[&_blockquote]:[border-left:3px_solid_var(--color-tilly-accent)] [&_blockquote]:pl-[1rem] [&_blockquote]:mb-[1rem] [&_blockquote]:[color:var(--color-tilly-text-secondary)] [&_blockquote]:italic',
          '[&_strong]:font-bold',
          '[&_em]:italic',
          '[&_hr]:[border:none] [&_hr]:[border-top:1px_solid_var(--color-tilly-glass-border)] [&_hr]:m-[2rem_0]',
        ].join(' ')}
      >
        <PassageList passages={run} />
      </div>,
    )
    run = []
  }

  blocks.forEach((block, i) => {
    if (block.__typename === 'Passage') {
      run.push(block)
      return
    }
    flushRun()
    switch (block.__typename) {
      case 'Content':
        out.push(<ContentBody key={`block-${i}`} content={block} />)
        break
      case 'EditorialMedia':
        out.push(
          <MediaBlock
            key={`block-${i}`}
            block={block}
            priority={i === firstMediaIndex}
          />,
        )
        break
      default:
        break
    }
  })
  flushRun()

  return <>{out}</>
}
