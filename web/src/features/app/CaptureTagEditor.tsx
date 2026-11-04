import { useId, useState } from 'react'
import { Plus, X, MapPin } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'
import { MAX_CAPTURE_CATS, type CaptureCatTag } from '~/lib/capture-tags'
import { useAppCopy } from './copy'

/** A complete list editor accompanies the optional image positions, so tagging
 * never requires a precise tap, pointer or ability to see the photograph. */
export function CaptureTagEditor({ photo, value, onChange, candidates, disabled = false }: {
  photo: string
  value: CaptureCatTag[]
  onChange: (tags: CaptureCatTag[]) => void
  candidates: Array<{ id: string; name: string }>
  disabled?: boolean
}) {
  const prefix = useId()
  const t = useAppCopy()
  const [placing, setPlacing] = useState<string | null>(null)
  const change = (key: string, patch: Partial<CaptureCatTag>) =>
    onChange(value.map(tag => tag.key === key ? { ...tag, ...patch } : tag))
  return <div className="grid gap-5">
    <div className="relative mx-auto w-full max-w-lg overflow-hidden rounded-xl bg-black">
      <img src={photo} alt={t('capture-tags.photoAlt')} className="block h-auto w-full" draggable={false}
        onClick={event => {
          if (!placing || disabled) return
          const rect = event.currentTarget.getBoundingClientRect()
          change(placing, { position: { x: (event.clientX - rect.left) / rect.width, y: (event.clientY - rect.top) / rect.height }, bounds: undefined })
          setPlacing(null)
        }} />
      {value.map((tag, index) => tag.position && <span key={tag.key}
        className="pointer-events-none absolute grid size-7 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-[var(--color-tilly-accent)] text-sm font-semibold text-[var(--color-tilly-on-signal)] shadow-md"
        style={{ left: `${tag.position.x * 100}%`, top: `${tag.position.y * 100}%` }}>{index + 1}</span>)}
    </div>
    {placing && <p role="status" className="text-sm">{t('capture-tags.positionHint')}</p>}
    <fieldset disabled={disabled} className="grid min-w-0 gap-4">
      <legend className="mb-3 text-lg font-semibold">{t('capture-tags.group')}</legend>
      {value.map((tag, index) => <div key={tag.key} className="grid min-w-0 gap-3 rounded-xl border border-[var(--color-tilly-border)] p-4">
        <div className="flex items-center justify-between gap-3">
          <label htmlFor={`${prefix}-${tag.key}`} className="text-sm font-medium">{t('capture-tags.row', { number: String(index + 1) })}</label>
          <button type="button" aria-label={t('capture-tags.remove', { number: String(index + 1) })} className="grid size-11 place-items-center rounded-full hover:bg-[var(--color-tilly-surface)]"
            disabled={disabled || value.length === 1} onClick={() => { onChange(value.filter(item => item.key !== tag.key)); if (placing === tag.key) setPlacing(null) }}><X size={18} /></button>
        </div>
        <Select value={tag.catId ?? 'new'} disabled={disabled} onValueChange={id => change(tag.key, id === 'new' ? { catId: undefined, name: '' } : { catId: id, name: undefined })}>
          <SelectTrigger id={`${prefix}-${tag.key}`} className="w-full"><SelectValue placeholder={t('capture-tags.choose', { number: String(index + 1) })} /></SelectTrigger>
          <SelectContent><SelectItem value="new">{t('capture-tags.new')}</SelectItem>{candidates.filter(cat => cat.id === tag.catId || !value.some(other => other.catId === cat.id)).map(cat => <SelectItem key={cat.id} value={cat.id}>{cat.name || t('cat.unnamed')}</SelectItem>)}</SelectContent>
        </Select>
        {!tag.catId && <><label className="sr-only" htmlFor={`${prefix}-${tag.key}-name`}>{t('capture-tags.nameLabel', { number: String(index + 1) })}</label><input id={`${prefix}-${tag.key}-name`} required maxLength={60} value={tag.name ?? ''} placeholder={t('capture-tags.name')}
          className="min-h-11 w-full rounded-lg border border-[var(--color-tilly-border)] bg-[var(--color-tilly-surface)] px-3 text-base" onChange={event => change(tag.key, { name: event.target.value })} /></>}
        <div className="flex flex-wrap gap-3 text-sm">
          <button type="button" aria-pressed={placing === tag.key} className="inline-flex min-h-11 items-center gap-2" onClick={() => setPlacing(placing === tag.key ? null : tag.key)}><MapPin size={16} />{t(tag.position ? 'capture-tags.move' : 'capture-tags.place')}</button>
          {tag.position && <button type="button" className="min-h-11" onClick={() => change(tag.key, { position: undefined, bounds: undefined })}>{t('capture-tags.removeMarker')}</button>}
        </div>
      </div>)}
      <button type="button" disabled={disabled || value.length >= MAX_CAPTURE_CATS} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[var(--color-tilly-border)] px-4" onClick={() => onChange([...value, { key: crypto.randomUUID(), name: '' }])}><Plus size={18} />{t('capture-tags.add')}</button>
    </fieldset>
  </div>
}
