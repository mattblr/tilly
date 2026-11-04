import { createContext, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import { MoreHorizontal } from 'lucide-react'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '~/components/ui/dropdown-menu'
import { Link } from '@tanstack/react-router'
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogTrigger } from '~/components/ui/dialog'
import { useAppSession } from './session'
import { useAppCopy } from './copy'
import { SignInLink } from './SignIn'
import { NotificationInboxStore, notificationPath, notificationImage, notificationSwipe, type InboxItem } from './notification-inbox'

function useInbox() {
  const { inboxClient: client } = useAppSession()
  const store = useMemo(() => new NotificationInboxStore(client), [client])
  const state = useSyncExternalStore(store.subscribe, store.snapshot, store.snapshot)
  useEffect(() => {
    store.start()
    const refresh = () => { if (document.visibilityState === 'visible') void store.load() }
    window.addEventListener('focus', refresh); window.addEventListener('online', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => { store.dispose(); window.removeEventListener('focus', refresh); window.removeEventListener('online', refresh); document.removeEventListener('visibilitychange', refresh) }
  }, [store])
  return { ...state, load: store.load, retry: store.retry, markRead: store.markRead, open: store.open, close: store.close }
}
const Context = createContext<ReturnType<typeof useInbox> | null>(null)
export function NotificationsProvider({ children }: {children: ReactNode}) {
  const { user } = useAppSession()
  return <AccountInbox key={user?.id ?? 'signed-out'}>{children}</AccountInbox>
}
function AccountInbox({ children }: {children: ReactNode}) { const inbox = useInbox(); return <Context.Provider value={inbox}>{children}</Context.Provider> }
export function NotificationsLink() {
  const inbox = useContext(Context), t = useAppCopy()
  return <Link to="/notifications" activeProps={{ 'aria-current': 'page' }}>{t('inbox.title')}{!!inbox?.unread && <span className="ml-1 text-tilly-accent" aria-label={t('inbox.unreadCount', { count: String(inbox.unread) })}>●</span>}</Link>
}
export function Notifications() {
  const { user, ready } = useAppSession(), inbox = useContext(Context)!, t = useAppCopy()
  return <section className="mx-auto w-full max-w-[var(--page-width,_1200px)] px-[var(--page-gutter,_20px)] py-10 md:px-[var(--page-gutter-md,_28px)]" aria-labelledby="inbox-title">
    <h1 id="inbox-title" className="mb-6 text-3xl font-semibold">{t('inbox.title')}</h1>
    {!ready ? <p role="status">{t('inbox.loading')}</p> : !user ? <SignInLink>{t('inbox.signIn')}</SignInLink> : <>
      <button className="mb-4 min-h-11 text-tilly-accent" disabled={inbox.busy} onClick={() => void inbox.load()}>{t('inbox.refresh')}</button>
      {inbox.error && <p role="alert">{t('inbox.failed')} <button className="min-h-11 underline" disabled={inbox.busy} onClick={() => void inbox.retry()}>{t('inbox.retry')}</button></p>}
      {(inbox.busy || (!inbox.loaded && !inbox.error)) && <p role="status">{t('inbox.loading')}</p>}
      {inbox.loaded && !inbox.busy && !inbox.error && !inbox.items.length && <p role="status">{t('inbox.empty')}</p>}
      <ul className="max-w-2xl divide-y divide-tilly-border" aria-busy={inbox.busy}>
        {inbox.items.map(item => <NotificationRow key={item.id} item={item} />)}
      </ul>
      {inbox.after && <button disabled={inbox.busy} className="mt-4 min-h-11 text-tilly-accent" onClick={() => void inbox.load(true)}>{t('inbox.more')}</button>}
    </>}
  </section>
}

function NotificationRow({ item }: {item: InboxItem}) {
  const inbox = useContext(Context)!, t = useAppCopy()
  const [actions, setActions] = useState(false)
  const touch = useRef<{x: number; y: number} | null>(null)
  const suppressClick = useRef(false)
  const path = notificationPath(item.actionUrl, window.location.origin)
  return <li className="py-5" onTouchStart={event => {
    const point = event.touches[0]; touch.current = {x: point.clientX, y: point.clientY}; suppressClick.current = false
  }} onTouchEnd={event => {
    const point = event.changedTouches[0], start = touch.current; touch.current = null
    if (start && notificationSwipe(start, {x: point.clientX, y: point.clientY}, document.documentElement.dir === 'rtl') && !item.isRead) { suppressClick.current = true; setActions(true) }
  }} onClickCapture={event => { if (suppressClick.current && event.currentTarget.contains(event.target as Node)) { suppressClick.current = false; event.preventDefault(); event.stopPropagation() } }}>
    <article className="flex items-start gap-3">
      <Dialog open={inbox.opened?.id === item.id} onOpenChange={open => { if (open) inbox.open(item); else inbox.close() }}>
        <DialogTrigger asChild><button className="flex min-h-11 min-w-0 flex-1 items-start gap-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-tilly-accent">
          <span className={`mt-2 size-2 shrink-0 rounded-full bg-tilly-accent ${item.isRead ? 'invisible' : ''}`} aria-hidden="true" />
          <span className="grid min-w-0 flex-1 gap-2">
            <span className="break-words text-lg font-semibold">{item.title}</span>
            <span className="sr-only">{t(item.isRead ? 'inbox.read' : 'inbox.unread')}</span>
            {item.body && <span className="line-clamp-2 whitespace-pre-wrap break-words">{item.body}</span>}
            <time className="text-sm text-tilly-text-secondary" dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString()}</time>
          </span>
          {notificationImage(item.imageUrl) && <NotificationThumbnail key={item.imageUrl} url={notificationImage(item.imageUrl)!} />}
        </button></DialogTrigger>
        <DialogContent className="max-h-[90dvh] overflow-y-auto border-tilly-border bg-tilly-bg text-tilly-text">
          <DialogTitle className="pr-6 text-2xl font-semibold">{item.title}</DialogTitle>
          <time className="text-sm text-tilly-text-secondary" dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString()}</time>
          <DialogDescription className="whitespace-pre-wrap break-words text-base text-tilly-text">{item.body}</DialogDescription>
          {notificationImage(item.imageUrl) && <NotificationThumbnail key={item.imageUrl} url={notificationImage(item.imageUrl)!} full />}
          {path && <Link className="inline-flex min-h-11 items-center text-tilly-accent" to={path} onClick={() => inbox.close()}>{t('inbox.viewRelated')}</Link>}
        </DialogContent>
      </Dialog>
      {!item.isRead && <DropdownMenu open={actions} onOpenChange={setActions}>
        <DropdownMenuTrigger asChild><button className="grid size-11 shrink-0 place-items-center rounded-full hover:bg-tilly-surface" aria-label={t('inbox.actions', {title: item.title})}><MoreHorizontal size={20} aria-hidden="true" /></button></DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="border-tilly-border bg-tilly-bg text-tilly-text">
          <DropdownMenuItem disabled={!!inbox.reading || inbox.busy} onSelect={() => void inbox.markRead(item)}>{t(inbox.reading === item.id ? 'inbox.saving' : 'inbox.markRead')}</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>}
    </article>
  </li>
}

function NotificationThumbnail({ url, full = false }: {url: string; full?: boolean}) {
  const [failed, setFailed] = useState(false)
  return failed ? null : <img src={url} alt="" loading="lazy" referrerPolicy="no-referrer" className={full ? "max-h-[60dvh] w-full rounded-lg object-contain" : "size-14 shrink-0 rounded-lg object-cover"} onError={() => setFailed(true)} />
}
