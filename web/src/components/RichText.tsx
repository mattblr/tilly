/**
 * Structured renderer for foir prose . Ported from the
 * marketing-site RichTextRenderer, minus its design-token typography
 * (this site styles prose with CSS on the wrapper instead).
 *
 * Each passage carries semantics in separate slots:
 *
 *   - `kind` (paragraph / h1–h6 / quote / code) picks the HTML element.
 *   - `align` maps to text-align on the rendered element.
 *   - `list` + `level` flatten list membership onto the passage;
 *     consecutive list passages regroup into <ul>/<ol> with nesting
 *     rebuilt from `level`.
 *   - Span marks are the eight decorations (bold, italic, underline,
 *     strikethrough, code, subscript, superscript, highlight) or the
 *     `_key` of a markDef on the same passage (links, scheme-checked
 *     through `safeHref`).
 *   - A soft line break is `"\n"` inside a span's text.
 */

import { createElement, type JSX, type ReactNode } from 'react'

export interface ProseSpanLike {
  text?: string | null
  marks?: ReadonlyArray<string | null> | null
}

export interface PassageLike {
  __typename?: string
  _id?: string | null
  _key?: string | null
  kind?: string | null
  align?: string | null
  list?: string | null
  level?: number | null
  language?: string | null
  markDefs?: unknown
  spans?: ReadonlyArray<ProseSpanLike | null> | null
}

export interface ProseValueLike {
  html?: string | null
  entries?: ReadonlyArray<PassageLike | null> | null
}

interface MarkDefLike {
  _key?: string
  type?: string
  href?: string
  target?: string
}

/**
 * safeHref allow-lists link schemes so stored prose can't smuggle a
 * `javascript:` (or `data:`/`vbscript:`) URL that executes on click
 * . Relative URLs, anchors, and the http(s)/mailto/tel schemes
 * pass; anything else collapses to '#'.
 */
export function safeHref(url: string | undefined): string {
  if (!url) return '#'
  const trimmed = url.trim()
  if (
    trimmed.startsWith('/') ||
    trimmed.startsWith('#') ||
    trimmed.startsWith('?') ||
    trimmed.startsWith('./') ||
    trimmed.startsWith('../')
  ) {
    return trimmed
  }
  // Strip control chars/whitespace that obfuscate the scheme (e.g. a
  // tab in "java<TAB>script:") before testing it.
  const normalized = Array.from(trimmed)
    .filter((ch) => ch.charCodeAt(0) > 0x20)
    .join('')
    .toLowerCase()
  const schemeMatch = normalized.match(/^([a-z][a-z0-9+.-]*):/)
  if (!schemeMatch) return trimmed
  const allowed = ['http', 'https', 'mailto', 'tel']
  return allowed.includes(schemeMatch[1]) ? trimmed : '#'
}

const DECORATION_TAGS: Record<string, keyof JSX.IntrinsicElements> = {
  bold: 'strong',
  italic: 'em',
  underline: 'u',
  strikethrough: 's',
  code: 'code',
  subscript: 'sub',
  superscript: 'sup',
  highlight: 'mark',
}

/** The passage entries of a prose value's typed projection. */
export function passagesOf(
  value: ProseValueLike | null | undefined,
): PassageLike[] {
  return (value?.entries ?? []).filter(
    (e): e is PassageLike => !!e && e.__typename === 'Passage',
  )
}

/**
 * Render a prose field value. Uses the typed passages; falls back to the
 * field's `html` projection when the document selected no entries.
 */
export function RichText({
  value,
  className,
}: {
  value: ProseValueLike | null | undefined
  className?: string
}) {
  if (!value) return null
  const passages = passagesOf(value)
  if (passages.length === 0) {
    if (value.html) {
      return (
        <div
          className={className}
          dangerouslySetInnerHTML={{ __html: value.html }}
        />
      )
    }
    return null
  }
  return (
    <div className={className}>
      <PassageList passages={passages} />
    </div>
  )
}

/**
 * Render a run of passages: consecutive list passages regroup into
 * (nested) <ul>/<ol>, everything else renders as its own element.
 * Shared by RichText (prose field values) and BlockDigester (passage
 * entries inside a page's flow).
 */
export function PassageList({
  passages,
}: {
  passages: ReadonlyArray<PassageLike>
}) {
  const out: ReactNode[] = []
  let i = 0
  while (i < passages.length) {
    const passage = passages[i]
    if (passage.list) {
      // Collect the whole consecutive list run, then rebuild nesting
      // from each passage's `level`.
      const run: PassageLike[] = []
      while (i < passages.length && passages[i].list) {
        run.push(passages[i])
        i++
      }
      out.push(
        <ListRun
          key={run[0]._id ?? run[0]._key ?? `list-${out.length}`}
          run={run}
          level={minLevel(run)}
        />,
      )
      continue
    }
    out.push(renderPassage(passage, passage._id ?? passage._key ?? i))
    i++
  }
  return <>{out}</>
}

function minLevel(run: ReadonlyArray<PassageLike>): number {
  let min = Infinity
  for (const p of run) min = Math.min(min, p.level ?? 1)
  return Number.isFinite(min) ? min : 1
}

/**
 * Rebuild nested list structure from flattened `list`+`level` passages.
 * Items at the current level become <li>s; a deeper run nests inside the
 * preceding item's <li>. A change of list type at the same level starts
 * a sibling list.
 */
function ListRun({
  run,
  level,
}: {
  run: ReadonlyArray<PassageLike>
  level: number
}) {
  interface Item {
    key: string
    content: ReactNode | null // null: document starts deeper than `level`
    nested: ReactNode | null
    type: string
  }
  const items: Item[] = []

  let i = 0
  while (i < run.length) {
    const passage = run[i]
    if ((passage.level ?? 1) > level) {
      const deep: PassageLike[] = []
      while (i < run.length && (run[i].level ?? 1) > level) {
        deep.push(run[i])
        i++
      }
      const nested = <ListRun run={deep} level={level + 1} />
      const prev = items[items.length - 1]
      if (prev && !prev.nested) {
        prev.nested = nested
      } else {
        items.push({
          key: deep[0]._id ?? deep[0]._key ?? `d${items.length}`,
          content: null,
          nested,
          type: deep[0].list ?? 'bullet',
        })
      }
      continue
    }
    items.push({
      key: passage._id ?? passage._key ?? `li${items.length}`,
      content: (
        <span className={alignClass(passage.align)}>
          {renderSpans(passage)}
        </span>
      ),
      nested: null,
      type: passage.list ?? 'bullet',
    })
    i++
  }

  // A change of list type at the same level starts a sibling list.
  const lists: ReactNode[] = []
  let group: Item[] = []
  const flush = () => {
    if (group.length === 0) return
    const ListTag = group[0].type === 'number' ? 'ol' : 'ul'
    lists.push(
      <ListTag key={group[0].key}>
        {group.map((item) => (
          <li key={item.key}>
            {item.content}
            {item.nested}
          </li>
        ))}
      </ListTag>,
    )
    group = []
  }
  for (const item of items) {
    if (group.length > 0 && group[0].type !== item.type) flush()
    group.push(item)
  }
  flush()
  return <>{lists}</>
}

function renderPassage(passage: PassageLike, key: string | number): ReactNode {
  const className = alignClass(passage.align)

  if (passage.kind === 'code') {
    return (
      <pre key={key} className={className}>
        <code
          className={
            passage.language ? `language-${passage.language}` : undefined
          }
        >
          {(passage.spans ?? []).map((s) => s?.text ?? '').join('')}
        </code>
      </pre>
    )
  }

  const tag = pickTag(passage)
  return createElement(tag, { key, className }, ...[renderSpans(passage)])
}

function renderSpans(passage: PassageLike): ReactNode[] {
  const markDefs = Array.isArray(passage.markDefs)
    ? (passage.markDefs as MarkDefLike[])
    : []
  return (passage.spans ?? []).flatMap((span, i) => {
    if (!span) return []
    return [renderSpan(span, i, markDefs)]
  })
}

function renderSpan(
  span: ProseSpanLike,
  key: number,
  markDefs: ReadonlyArray<MarkDefLike>,
): ReactNode {
  // Soft line breaks: "\n" inside text, never a separate structure.
  const parts = (span.text ?? '').split('\n')
  let el: ReactNode =
    parts.length === 1
      ? parts[0]
      : parts.flatMap((part, i) =>
          i === 0 ? [part] : [<br key={`br${i}`} />, part],
        )

  let link: MarkDefLike | null = null
  for (const mark of span.marks ?? []) {
    if (!mark) continue
    const decorationTag = DECORATION_TAGS[mark]
    if (decorationTag) {
      el = createElement(decorationTag, null, el)
      continue
    }
    const def = markDefs.find((d) => d._key === mark)
    if (def?.type === 'link' && def.href) link = def
  }

  if (link?.href) {
    const href = safeHref(link.href)
    const target = link.target
    const rel = target && target !== '_self' ? 'noopener noreferrer' : undefined
    el = (
      <a href={href} target={target} rel={rel}>
        {el}
      </a>
    )
  }

  return <span key={key}>{el}</span>
}

function pickTag(passage: PassageLike): keyof JSX.IntrinsicElements {
  const kind = passage.kind
  if (kind && /^h[1-6]$/.test(kind)) return kind as keyof JSX.IntrinsicElements
  if (kind === 'quote') return 'blockquote'
  return 'p'
}

function alignClass(align: string | null | undefined): string | undefined {
  return (
    {
      left: 'text-left',
      right: 'text-right',
      center: 'text-center',
      justify: 'text-justify',
      start: 'text-start',
      end: 'text-end',
    } as Record<string, string>
  )[align ?? '']
}
