import { Camera, Mailbox, Smile, Sparkles, type LucideIcon } from 'lucide-react'
import type { HighlightIcon, PostHighlight } from '~/lib/post-highlights'

const icons: Record<HighlightIcon, LucideIcon> = { selfie: Smile, camera: Camera, postbox: Mailbox, sparkles: Sparkles }

/** A badge needs its challenge's published title; a bare key is never shown as copy. */
export function PostHighlightBadges({ catalog, selected }: { catalog: readonly PostHighlight[]; selected: readonly string[] }) {
  const entries = catalog.filter(entry => selected.includes(entry.key))
  if (!entries.length) return null
  return <div className="mb-3 flex flex-wrap gap-2">{entries.map(entry => {
    const Icon = icons[entry.icon]
    return <span key={entry.key} className="inline-flex items-center gap-1.5 rounded-full bg-tilly-surface px-3 py-1 text-xs text-tilly-text-secondary">
      <Icon size={14} aria-hidden="true" />{entry.title}
    </span>
  })}</div>
}
