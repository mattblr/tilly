import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  createFoirSessionClient,
  type FoirSessionUser,
} from '@foir/sdk/auth/session'
import { hostedSignInNoticeOf } from '@foir/sdk/auth'
import { useRouteContext } from '@tanstack/react-router'
import { createWebsiteClients } from '~/lib/foir'
import { localizedPath } from '~/lib/locale'
import { inboxSession } from './notification-inbox'
import {endHostedSession} from './session-exit'
import { deleteOwnAccount, deletionSessionForUser } from './delete-account'
import { setOperationIdentity } from './operations'
import { setSafetyViewer, setSafetyIdentity, setViewerBlocks, viewerBlocks } from './safety-data'
import { runAppOperation } from './operations'

/** Fóir owns the first-party HttpOnly cookie. The SDK keeps the short bearer in memory. */
export function hostedLoginConfig() {
  const value = import.meta.env.VITE_FOIR_LOGIN_ORIGIN
  if (!value) return null
  const origin = new URL(value)
  if (origin.protocol !== 'https:' || origin.origin !== value)
    throw new Error('VITE_FOIR_LOGIN_ORIGIN must be an HTTPS origin')
  return {
    loginOrigin: origin.origin,
    clientId: import.meta.env.VITE_FOIR_AUTH_CLIENT_ID || 'tilly-web',
  }
}
type AuthState = {
  user: { id: string; email: string } | null
  ready: boolean
  revision: number
  captureChanged: () => void
  /** A follow request was answered: the profile button's badge is out of date. */
  followsChanged: () => void
  locale?: string
  client: ReturnType<typeof createWebsiteClients>['foir']
  inboxClient: ReturnType<typeof createWebsiteClients>['foir'] | null
  signInUrl: string | null
  notice: ReturnType<typeof hostedSignInNoticeOf>
  logout: () => Promise<void>
  deleteAccount: () => Promise<void>
  reauthenticate: () => Promise<void>
  accountDeleted: boolean
  blockedIds: ReadonlySet<string>
  blockUser: (id: string, blocked: boolean) => Promise<void>
}
const Context = createContext<AuthState | null>(null)
export function AppSession({ children }: { children: ReactNode }) {
  const { locale, locales } = useRouteContext({ from: '__root__' })
  const config = useMemo(hostedLoginConfig, [])
  const [session,setSession] = useState<ReturnType<typeof createFoirSessionClient>|null>(null)
  useEffect(() => {
    const current = config ? createFoirSessionClient(config) : null
    setSession(current)
    return () => current?.destroy()
  }, [config])
  const clients = useMemo(
    () => {
      const result = createWebsiteClients(
        session
          ? {
              getToken: () => session.getToken(),
              refreshToken: () => session.getToken(),
            }
          : undefined,
        locale,
      )
      setSafetyIdentity(result.foir, async () => (await session?.getUser())?.userId ?? null)
      return result
    },
    [session, locale],
  )
  const [inboxEpoch, setInboxEpoch] = useState(0)
  const inboxIdentity = useRef({ userId: null as string | null, generation: 0 })
  const [user, setUser] = useState<AuthState['user']>(null)
  const [ready, setReady] = useState(false)
  const [revision, setRevision] = useState(0)
  const [accountDeleted, setAccountDeleted] = useState(false)
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set())
  useEffect(() => {
    let active = true
    const changed = (identity: FoirSessionUser | null) => {
      if (!active) return
      setOperationIdentity(clients.foir, identity?.userId ?? null)
      setSafetyViewer(clients.foir, identity?.userId ?? null)
      setBlockedIds(new Set())
      if (inboxIdentity.current.userId !== (identity?.userId ?? null)) {
        inboxIdentity.current = { userId: identity?.userId ?? null, generation: inboxIdentity.current.generation + 1 }
        setInboxEpoch(value => value + 1)
      }
      setUser(identity ? { id: identity.userId, email: identity.email } : null)
      if (identity) setAccountDeleted(false)
      setReady(true)
      setRevision((value) => value + 1)
      if (identity) void viewerBlocks(clients.foir).then(blocked => { if (active) setBlockedIds(blocked) }).catch(() => {})
    }
    const unsubscribe = session?.subscribe(changed)
    if (session)
      void session
        .getUser()
        .then(changed)
        .catch(() => {
          if (active) setReady(true)
        })
    else if (!config) setReady(true)
    return () => {
      active = false
      setOperationIdentity(clients.foir, null)
      unsubscribe?.()
    }
  }, [session, clients.foir, config])
  const inboxClient = useMemo(() => {
    if (!session || !user) return null
    const generation = inboxIdentity.current.generation
    return createWebsiteClients(inboxSession(session, user.id, () => inboxIdentity.current.generation === generation && inboxIdentity.current.userId === user.id), locale).foir
  }, [session, user?.id, locale, inboxEpoch])
  const returnTo =
    typeof window === 'undefined'
      ? undefined
      : new URL(localizedPath('/feed', locale, locales), window.location.origin)
          .href
  const signInUrl = session ? session.signInUrl(returnTo) : null
  const notice =
    typeof window === 'undefined'
      ? null
      : hostedSignInNoticeOf(window.location.href, { apple: 'Apple' })
  return (
    <Context.Provider
      value={{
        user,
        inboxClient,
        ready,
        revision,
        captureChanged: () => setRevision(value => value + 1),
        followsChanged: () => setRevision(value => value + 1),
        locale,
        client: clients.foir,
        signInUrl,
        notice,
        accountDeleted,
        blockedIds,
        blockUser: async (id, blocked) => {
          if (!user || (await session?.getUser())?.userId !== user.id) throw new Error('Sign in to change blocked accounts.')
          await runAppOperation(clients.foir, 'execute.set_user_block', { userId: id, blocked })
          if ((await session?.getUser())?.userId !== user.id) throw new Error('The signed-in account changed.')
          const next = new Set(blockedIds)
          if (blocked) next.add(id); else next.delete(id)
          setBlockedIds(next); setViewerBlocks(clients.foir, next); setRevision(value => value + 1)
        },
        reauthenticate: async () => {
          if (!session || !signInUrl) return
          try { await endHostedSession(clients.foir,session) }
          finally { window.location.assign(signInUrl) }
        },
        deleteAccount: async () => {
          if (!user || !session) throw new Error('Sign in again before deleting your account.')
          const bound = deletionSessionForUser(session, user.id)
          await bound.assertCurrent()
          const deletionClient = createWebsiteClients(bound, locale).foir
          await deleteOwnAccount(deletionClient, async () => {
          // Only clear the session after an explicit successful deletion.
          await bound.assertNotReplaced()
          await endHostedSession(deletionClient,session)
          setOperationIdentity(clients.foir, null); setSafetyViewer(clients.foir, null); setBlockedIds(new Set())
          setUser(null); setRevision(value => value + 1); setAccountDeleted(true)
          }, bound.assertNotReplaced)
        },
        logout: async () => {
          try { if (session) await endHostedSession(clients.foir,session) }
          finally {
            setOperationIdentity(clients.foir, null); setSafetyViewer(clients.foir, null); setBlockedIds(new Set())
            inboxIdentity.current = { userId: null, generation: inboxIdentity.current.generation + 1 }
            setUser(null)
            setRevision((value) => value + 1)
          }
        },
      }}
    >
      {children}
    </Context.Provider>
  )
}
export function useAppSession() {
  const context = useContext(Context)
  if (!context) throw new Error('AppSession is required')
  return context
}
