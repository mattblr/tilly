import { Sparkles } from 'lucide-react'
import type { PostHighlight } from '~/lib/post-highlights'

/** A badge needs its challenge's published title; a bare key is never shown as copy.
 * Its picture is the one uploaded in the console, or a sparkle when it has none. */
export function PostHighlightBadges({ catalog, selected }: { catalog: readonly PostHighlight[]; selected: readonly string[] }) {
  const entries = catalog.filter(entry => selected.includes(entry.key))
  if (!entries.length) return null
  return <div className="mb-3 flex flex-wrap gap-2">{entries.map(entry =>
    <span key={entry.key} className="inline-flex items-center gap-1.5 rounded-full bg-tilly-surface px-3 py-1 text-xs text-tilly-text-secondary">
      {entry.badge
        ? <img src={entry.badge} alt="" width={16} height={16} className="h-4 w-4 object-contain" loading="lazy" decoding="async" />
        : <Sparkles size={14} aria-hidden="true" />}
      {entry.title}
    </span>,
  )}</div>
}
