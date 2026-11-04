import { useRef, useState } from 'react'
import { MoreHorizontal } from 'lucide-react'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '~/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '~/components/ui/sheet'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '~/components/ui/select'
import { Button } from '~/components/ui/button'
import { useAppSession } from './session'
import { useAppCopy } from './copy'
import { runAppOperation } from './operations'
import { SignInLink } from './SignIn'
import { useResource } from './use-resource'
import { collectPages } from './paging'

export function SafetyMenu({ targetType, targetId, ownerId, onChanged }: {
  targetType: 'post' | 'note' | 'profile'; targetId: string; ownerId?: string | null; onChanged?: () => void
}) {
  const { client, user, blockUser, blockedIds } = useAppSession(), copy = useAppCopy(), t = (key: string) => copy(`safety.${key}`)
  const [open, setOpen] = useState(false), [reason, setReason] = useState('unsafe'), [details, setDetails] = useState('')
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [sent, setSent] = useState(false)
  const pending = useRef(false)
  const attempt = useRef<string | null>(null)
  if (ownerId === user?.id) return null
  async function block() {
    if (!ownerId || pending.current || !user) return
    pending.current = true; setBusy(true); setMessage('')
    try { await blockUser(ownerId, !blockedIds.has(ownerId)); onChanged?.() }
    catch { setMessage(t('failed')) }
    finally { pending.current = false; setBusy(false) }
  }
  async function send() {
    if (pending.current || !user) return
    pending.current = true; setBusy(true); setMessage('')
    attempt.current ??= crypto.randomUUID()
    try {
      await runAppOperation(client, 'execute.report_content', { targetType, targetId, reason, details }, { idempotencyKey: attempt.current })
      setSent(true); setMessage(t('sent'))
    } catch { setMessage(t('failed')) }
    finally { pending.current = false; setBusy(false) }
  }
  return <>
    <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label={t('menu')} disabled={busy}><MoreHorizontal aria-hidden="true" /></Button></DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="font-sans">
        <DropdownMenuItem onSelect={() => { attempt.current = null; setOpen(true); setSent(false); setMessage('') }}>{t('report')}</DropdownMenuItem>
        {user && ownerId && <DropdownMenuItem onSelect={() => void block()}>{t(blockedIds.has(ownerId) ? 'unblock' : 'block')}</DropdownMenuItem>}
      </DropdownMenuContent>
    </DropdownMenu>
    {!open && message && <p role="alert" className="text-sm">{message}</p>}
    <Sheet open={open} onOpenChange={value => { if (!busy) setOpen(value) }}><SheetContent showClose={false} className="mx-auto max-w-lg">
      <SheetTitle className="text-xl font-semibold">{t('reportTitle')}</SheetTitle>
      <SheetDescription className="sr-only">{t('reason')}</SheetDescription>
      {!user ? <><p>{t('signIn')}</p><SignInLink>{copy('nav.signIn')}</SignInLink></> : !sent && <fieldset disabled={busy} className="grid gap-4">
        <label className="grid gap-2"><span>{t('reason')}</span><Select value={reason} onValueChange={value => { setReason(value); attempt.current = null }}>
          <SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['unsafe', 'harassment', 'spam', 'privacy', 'other'].map(value => <SelectItem key={value} value={value}>{t(value)}</SelectItem>)}</SelectContent>
        </Select></label>
        <label className="grid gap-2"><span>{t('details')}</span><textarea className="min-h-24 rounded-lg border border-tilly-border bg-tilly-surface p-3" maxLength={1000} value={details} onChange={event => { setDetails(event.target.value); attempt.current = null }} /></label>
        <Button disabled={busy} onClick={() => void send()}>{t(busy ? 'sending' : 'send')}</Button>
      </fieldset>}
      {message && <p role="status">{message}</p>}
      <Button variant="outline" disabled={busy} onClick={() => setOpen(false)}>{t(sent ? 'done' : 'cancel')}</Button>
    </SheetContent></Sheet>
  </>
}

export function BlockedAccounts() {
  const { client, user, blockedIds, blockUser } = useAppSession(), copy = useAppCopy()
  const [busy, setBusy] = useState<string | null>(null), [failed, setFailed] = useState(false)
  const ids = Array.from(blockedIds).sort()
  const names = useResource(async () => {
    const result = new Map<string, string>()
    if (!user) return result
    for (let start = 0; start < ids.length; start += 100) {
      const profiles = await collectPages(async after => {
        const page = await client.profile.findMany({ first: 100, after,
          where: { ownerId: { in: ids.slice(start, start + 100) } }, pick: ['_id', '_ownerId', 'displayName', 'username'] })
        return { rows: page.edges.map(edge => edge.node), next: page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null }
      })
      for (const profile of profiles) if (profile._ownerId)
        result.set(profile._ownerId, profile.username ? `@${profile.username}` : profile.displayName ?? copy('safety.blockedTitle'))
    }
    return result
  }, [client, user?.id, ids.join('|')])
  return <section className="mt-12 grid max-w-[480px] gap-3"><h2 className="text-xl font-semibold">{copy('safety.blockedAccounts')}</h2>
    {!blockedIds.size ? <p>{copy('safety.noBlocks')}</p> : Array.from(blockedIds).map(id => <div key={id} className="flex items-center justify-between gap-3">
      <span>{names.data?.get(id) ?? copy('safety.blockedTitle')}</span><Button variant="outline" disabled={!!busy} onClick={() => {
        setBusy(id); setFailed(false); void blockUser(id, false).catch(() => setFailed(true)).finally(() => setBusy(null))
      }}>{copy('safety.unblock')}</Button>
    </div>)}{failed && <p role="alert">{copy('safety.failed')}</p>}
  </section>
}
