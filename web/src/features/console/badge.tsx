import { useId, useRef, useState } from 'react'
import { useAppCopy } from '~/features/app/copy'
import { uploadSlot } from '~/features/app/uploads'
import { consoleEnvironment } from '~/lib/console-environment'
import { Button } from './components/ui/button'
import { Label } from './components/ui/label'
import { ask } from './api'

export type BadgeValue = { fileId: string | null; url: string | null }

/** A square transparent PNG keeps its shape on light and dark screens. */
async function checkBadge(file: File) {
  if (file.type !== 'image/png') throw new Error('Choose a PNG file.')
  if (file.size > 2 * 1024 * 1024) throw new Error('Choose a PNG under 2 MB.')
  const image = await createImageBitmap(file)
  try {
    if (image.width < 256 || image.height < 256) throw new Error('Choose a PNG at least 256 × 256 px; 512 × 512 is best.')
    if (Math.abs(image.width - image.height) > Math.max(image.width, image.height) * 0.05)
      throw new Error('Choose a square PNG.')
  } finally {
    image.close()
  }
}

/** Upload → storage PUT → landing, through the placement session. Badges are
 * public: they show on public profiles and posts. */
async function uploadBadge(file: File) {
  const apiUrl = consoleEnvironment(import.meta.env.VITE_PLATFORM_API_URL).apiOrigin
  const answer = await ask<{ uploadFile: unknown }>(
    'mutation BadgeUpload($filename: String!, $mimeType: String!, $size: Int!) { uploadFile(filename: $filename, mimeType: $mimeType, size: $size, visibility: PUBLIC) { uploadId uploadUrl landed { endpoint token } } }',
    { filename: 'tilly-badge.png', mimeType: 'image/png', size: file.size },
  )
  const slot = uploadSlot(answer.uploadFile, apiUrl)
  const put = await fetch(slot.storage, {
    method: 'PUT', headers: { 'Content-Type': 'image/png' }, body: file, credentials: 'omit', redirect: 'error',
  })
  if (!put.ok) throw new Error('The badge couldn’t upload. Try again.')
  const landed = await fetch(slot.landing, {
    method: 'POST', headers: { 'X-Foir-Token': slot.token }, credentials: 'omit', redirect: 'error',
  })
  if (!landed.ok) throw new Error('The badge upload couldn’t finish. Try again.')
  const result: unknown = await landed.json()
  const id = result && typeof result === 'object' ? (result as { id?: unknown }).id : undefined
  if (typeof id !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(id)) throw new Error('The upload did not return a usable file.')
  return id
}

/** Choose, preview, replace or remove a badge picture. */
export function BadgeField({ value, onChange }: { value: BadgeValue; onChange: (value: BadgeValue) => void }) {
  const t = useAppCopy()
  const id = useId()
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  return (
    <div className="field flex flex-col gap-1.75 min-w-0 [&_label]:text-[12px] [&_label]:font-medium">
      <Label htmlFor={id}>{t('console.badgeImage')}</Label>
      <div className="flex items-center gap-3 flex-wrap">
        <div className="h-14 w-14 rounded-[10px] grid place-items-center [background:var(--muted)] overflow-hidden">
          {value.url
            ? <img src={value.url} alt="" className="h-12 w-12 object-contain" />
            : <span className="text-[11px] [color:var(--muted-foreground)]">{t('console.noBadge')}</span>}
        </div>
        <input id={id} ref={input} type="file" accept="image/png" className="sr-only" disabled={busy}
          onChange={async (event) => {
            const file = event.target.files?.[0]
            event.target.value = ''
            if (!file) return
            setBusy(true)
            setError('')
            try {
              await checkBadge(file)
              const fileId = await uploadBadge(file)
              onChange({ fileId, url: URL.createObjectURL(file) })
            } catch (failure) {
              setError(failure instanceof Error ? failure.message : String(failure))
            } finally {
              setBusy(false)
            }
          }} />
        <Button type="button" variant="outline" disabled={busy} onClick={() => input.current?.click()}>
          {busy ? t('notifications.console.working') : value.fileId ? t('console.replaceBadge') : t('console.uploadBadge')}
        </Button>
        {value.fileId && !busy &&
          <Button type="button" variant="ghost" onClick={() => onChange({ fileId: null, url: null })}>{t('console.removeBadge')}</Button>}
      </div>
      <p className="m-0 text-[12px] [color:var(--muted-foreground)]">{t('console.badgeImageHelp')}</p>
      {error && <p role="alert" className="m-0 text-[12px] [color:var(--destructive)]">{error}</p>}
    </div>
  )
}
