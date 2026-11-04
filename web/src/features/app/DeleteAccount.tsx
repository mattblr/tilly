import { useRef, useState } from 'react'
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogFooter } from '~/components/ui/dialog'
import { Button } from '~/components/ui/button'
import { Checkbox } from '~/components/ui/checkbox'
import { useAppSession } from './session'
import { useAppCopy } from './copy'
import { startWebBilling } from './billing'

export function DeleteAccount() {
  const { user, client, deleteAccount, reauthenticate } = useAppSession()
  const copy = useAppCopy(), t = (key: string) => copy(`account-deletion.${key}`)
  const [open, setOpen] = useState(false), [confirmed, setConfirmed] = useState(false), [busy, setBusy] = useState(false), [failure, setFailure] = useState(false)
  const pending = useRef(false)
  const [slide, setSlide] = useState(0)
  const dragging = useRef(false)
  const accessibleConfirm = useRef<HTMLButtonElement>(null)
  const completeSlide = (keyboard = false) => { if ((dragging.current || keyboard) && slide >= 98 && confirmed && !busy) void remove(); dragging.current = false; setSlide(0) }
  async function remove() {
    if (!confirmed || pending.current) return
    pending.current = true; setBusy(true); setFailure(false)
    try { await deleteAccount() }
    catch { setFailure(true) }
    finally { pending.current = false; setBusy(false) }
  }
  async function portal() {
    if (!user || pending.current) return
    pending.current = true; setBusy(true); setFailure(false)
    try { window.location.assign(await startWebBilling(client, 'portal', user.id, crypto.randomUUID())) }
    catch { setFailure(true) }
    finally { pending.current = false; setBusy(false) }
  }
  return <section className="mt-12 grid max-w-[480px] gap-3 border-t border-[var(--color-tilly-border)] pt-6">
    <Button variant="destructive" className="min-h-11" onClick={() => { setConfirmed(false); setSlide(0); setFailure(false); setOpen(true) }}>{t('title')}</Button>
    <Dialog open={open} onOpenChange={value => { if (!pending.current) setOpen(value) }}>
      <DialogContent className="max-h-[90dvh] w-[calc(100%_-_2rem)] overflow-y-auto font-sans" onEscapeKeyDown={event => { if (busy) event.preventDefault() }} onPointerDownOutside={event => { if (busy) event.preventDefault() }}>
        <DialogTitle>{t('confirmTitle')}</DialogTitle>
        <DialogDescription>{t('body')}</DialogDescription>
        <p className="text-sm">{t('billing')}</p>
        <a className="text-sm underline" href="https://apps.apple.com/account/subscriptions" target="_blank" rel="noreferrer">{t('appleSubscriptions')}</a>
        {import.meta.env.VITE_TILLY_WEB_BILLING === 'true' && <Button variant="outline" disabled={busy} onClick={() => void portal()}>{t('webSubscriptions')}</Button>}
        <p className="text-sm text-[var(--color-tilly-text-secondary)]">{t('recent')} {t('returnHint')}</p>
        <Button variant="outline" disabled={busy} onClick={() => void reauthenticate()}>{t('reauthenticate')}</Button>
        <label className="flex items-start gap-3 text-sm"><Checkbox className="mt-0.5" checked={confirmed} disabled={busy} onCheckedChange={value => { setConfirmed(value === true); setSlide(0) }} />{t('confirmLabel')}</label>
        {failure && <p role="alert" className="text-sm text-destructive">{t('failed')}</p>}
        <DialogFooter className="gap-3">
          <Button variant="outline" disabled={busy} onClick={() => setOpen(false)}>{t('cancel')}</Button>
          <label className="grid flex-1 gap-2 text-red-600">{t(busy ? 'working' : 'slide')}
            <input type="range" dir="ltr" min="0" max="100" step="5" value={slide} disabled={!confirmed || busy} aria-label={t('slide')} aria-description={t('slideHint')}
              className="h-11 w-full accent-red-600" onChange={event => setSlide(Number(event.target.value))}
              onPointerDown={event => {
                const start=event.clientX-event.currentTarget.getBoundingClientRect().left
                dragging.current=event.isPrimary && slide===0 && start>=0 && start<=28
                if(!dragging.current){event.preventDefault();setSlide(0)}
                else event.currentTarget.setPointerCapture(event.pointerId)
              }}
              onPointerUp={() => completeSlide()} onPointerCancel={() => { dragging.current=false;setSlide(0) }}
              onKeyUp={event => { if(event.key==='Enter')completeSlide(true) }} onBlur={event => {
                if(!accessibleConfirm.current||event.relatedTarget!==accessibleConfirm.current){dragging.current=false;setSlide(0)}
              }} />
          </label>
          {slide>=98&&!dragging.current&&<Button ref={accessibleConfirm} variant="destructive" disabled={!confirmed||busy}
            onClick={() => completeSlide(true)} onBlur={() => setSlide(0)}>{t('confirm')}</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </section>
}
