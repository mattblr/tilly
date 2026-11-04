import { friendlyError } from '~/lib/failures'
import { useRef, useState } from 'react'
import { Tags } from 'lucide-react'
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '~/components/ui/sheet'
import { captureCatTags, type CaptureCatTag } from '~/lib/capture-tags'
import { useAppSession } from './session'
import { useResource } from './use-resource'
import { collectConnection } from './paging'
import { CaptureTagEditor } from './CaptureTagEditor'
import { runAppOperation } from './operations'
import type { Encounter } from './data'
import { latestForCats, nearbyCatKeys } from './map-query'
import { useAppCopy } from './copy'

export function EditCaptureTags({ row, onChanged }: { row: Encounter; onChanged?: () => void }) {
  const { client, user, locale, captureChanged } = useAppSession()
  const t = useAppCopy()
  const [open, setOpen] = useState(false)
  const [tags, setTags] = useState<CaptureCatTag[] | null>(null)
  const [busy, setBusy] = useState(false), [error, setError] = useState('')
  const attempt = useRef<{ revision: string; cats: CaptureCatTag[] } | null>(null)
  const pending = useRef(false)
  const loaded = useResource(async () => {
    if (!open || !user || !row.photoKey || !row.captureRevision) return null
    const records = await collectConnection(after => client['capture-cat-tag'].findManyMine({
      first: 100, after, where: { photoKey: { eq: row.photoKey }, revision: { eq: row.captureRevision }, active: { eq: true } },
      orderBy: [{ positionIndex: 'ASC' }],
      pick: ['_id', 'tagKey', 'catKey', 'position', 'bounds', 'vector', 'vectorModel'],
    }))
    const cats = captureCatTags(records.map(tag => ({ key: tag.tagKey, catId: tag.catKey,
      ...(tag.position ? { position: tag.position } : {}), ...(tag.bounds ? { bounds: tag.bounds } : {}),
      ...(tag.vector && tag.vectorModel ? { vector: tag.vector, vectorModel: tag.vectorModel } : {}),
    })))
    const candidates = new Map((row.cats ?? []).map(cat => [cat.catId, { id: cat.catId, name: cat.name }]))
    if (row.area) {
      const settings = await client['app-settings'].findUnique({ naturalKey: 'app', pick: ['_id', 'nearMeMeters'] })
      const nearby = await latestForCats(client, await nearbyCatKeys(client, row.area, settings?.nearMeMeters ?? 5000), locale)
      for (const cat of nearby) if (cat.catId) candidates.set(cat.catId, { id: cat.catId, name: cat.cat })
    }
    return { cats, candidates: [...candidates.values()] }
  }, [client, open, user?.id, row.photoKey, row.captureRevision, row.area?.lat, row.area?.lng, locale])
  if (!user || row.authorId !== user.id || row.reshare || !row.captureRevision || !row.photo) return null
  const save = async () => {
    if (pending.current || !loaded.data) return
    pending.current = true
    setBusy(true)
    setError('')
    try {
      attempt.current ??= { revision: crypto.randomUUID(), cats: captureCatTags(tags ?? loaded.data.cats) }
      await runAppOperation(client, 'execute.tilly.update-capture-tags', { photoKey: row.photoKey, expectedRevision: row.captureRevision, ...attempt.current }, { idempotencyKey: attempt.current.revision })
      setOpen(false)
      captureChanged()
      onChanged?.()
    } catch (failure) { setError(friendlyError(failure, t)) }
    finally { pending.current = false; setBusy(false) }
  }
  return <Sheet open={open} onOpenChange={value => { if (busy) return; setOpen(value); if (value) { setTags(null); setError(''); attempt.current = null } }}>
    <SheetTrigger asChild><button type="button" className="grid size-11 place-items-center rounded-full" aria-label={t('capture-tags.editAction')}><Tags size={20} /></button></SheetTrigger>
    <SheetContent className="max-h-[90dvh] overflow-y-auto">
      <SheetTitle>{t('capture-tags.edit')}</SheetTitle>
      {loaded.busy ? <p role="status" className="py-5">{t('capture-tags.loading')}</p> : loaded.error ? <p role="alert">{loaded.error} <button onClick={loaded.reload}>{t('capture-tags.tryAgain')}</button></p> : loaded.data && <form className="mt-5 grid gap-5" onSubmit={event => { event.preventDefault(); void save() }}>
        <CaptureTagEditor photo={row.photo.url} value={tags ?? loaded.data.cats} onChange={setTags} candidates={loaded.data.candidates} disabled={busy || !!attempt.current} />
        <button disabled={busy} className="min-h-12 w-full rounded-lg bg-[var(--color-tilly-accent)] px-5 text-[var(--color-tilly-on-signal)]">{t(busy ? 'capture-tags.saving' : attempt.current ? 'capture-tags.retry' : 'capture-tags.save')}</button>
      </form>}
      {error && <p role="alert" className="py-4 text-sm">{error}</p>}
    </SheetContent>
  </Sheet>
}
