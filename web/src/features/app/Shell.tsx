import { useAppCopy } from '~/features/app/copy'
import { LanguageSelector } from '~/components/LanguageSelector'
import { TillyLogo } from '~/components/TillyLogo'
import { Link, Outlet, useLocation, useNavigate } from '@tanstack/react-router'
import { useAppSession } from './session'
import { NotificationsProvider, NotificationsLink } from './Notifications'
import { AppCopy } from './copy'
import { useTheme } from '~/components/ThemeProvider'
import { Moon, Sun } from 'lucide-react'
import { ProfileAvatar } from './ProfileAvatar'
import { useScrollHeader } from '~/components/useScrollHeader'
import { SignInLink } from './SignIn'
import { useResource } from './use-resource'
import { appImage } from './media'
import { useEffect, useRef, useState } from 'react'
import { requestCount } from './follows'
import { ProfileSavedContext } from './profile-setup'
export function AppShell() {
  const {client}=useAppSession()
  return <AppCopy client={client}><AppShellContent /></AppCopy>
}
function AppShellContent() {
  const t = useAppCopy()
  const { client, user, ready, revision } = useAppSession()
  const { resolvedTheme, setTheme } = useTheme()
  const header = useScrollHeader()
  const location = useLocation(),
    navigate = useNavigate()
  const [completedFor, setCompletedFor] = useState<string | null>(null)
  const profile = useResource(
    async () =>
      user
        ? {
            userId: user.id,
            profile:
              (await client.profile.findManyMine({ first: 1 })).edges[0]?.node ??
              null,
          }
        : null,
    [client, user?.id],
  )
  useEffect(() => {
    if (
      ready &&
      user &&
      profile.data?.userId === user.id &&
      !profile.busy &&
      !profile.error &&
      !profile.data.profile?.username &&
      completedFor !== user.id &&
      !location.pathname.endsWith('/welcome')
    )
      void navigate({ to: '/welcome', replace: true })
  }, [
    ready,
    user?.id,
    profile.data,
    profile.busy,
    profile.error,
    completedFor,
    location.pathname,
    navigate,
  ])
  // People waiting for an answer: refreshed on navigation, after an answer
  // and when the tab is shown again (requests have no push notification).
  const requests = useResource(
    async () => (user ? requestCount(client, user.id) : 0),
    [client, user?.id, revision, location.pathname],
  )
  const reloadRequests = useRef(requests.reload)
  reloadRequests.current = requests.reload
  useEffect(() => {
    const shown = () => { if (document.visibilityState === 'visible') reloadRequests.current() }
    document.addEventListener('visibilitychange', shown)
    return () => document.removeEventListener('visibilitychange', shown)
  }, [])
  const pending = user && requests.data ? requests.data : 0
  const avatar = appImage(
    profile.data?.userId === user?.id ? profile.data?.profile?.photo : null,
  )
  return (
    <ProfileSavedContext.Provider
      value={() => {
        setCompletedFor(user?.id ?? null)
        profile.reload()
      }}
    >
        <NotificationsProvider>
        <div
          className={[
            'app-app min-h-svh [background:var(--color-tilly-bg)] [color:var(--color-tilly-text)] font-sans flex flex-col',
            '[&_button]:cursor-pointer',
            '[&_button:disabled]:[cursor:wait] [&_button:disabled]:opacity-[0.65]',
            '[&_:focus-visible]:[outline:2px_solid_var(--color-tilly-accent)] [&_:focus-visible]:[outline-offset:5px]',
            '[&_>_main]:flex-1 [&_>_main]:min-w-0',
            "[&:has(.catch-page[data-camera='true'])_>_main]:flex [&:has(.catch-page[data-camera='true'])_>_main]:flex-col [&:has(.catch-page[data-camera='true'])_>_main]:min-h-[0]",
          ].join(' ')}
          data-ui
        >
          <a
            className={[
              'app-skip fixed top-[-100px] left-[20px] z-100 p-3 [background:var(--color-tilly-bg)]',
              '[&:focus]:top-[12px]',
            ].join(' ')}
            href="#app-main"
          >
            {t("navigation.skipToContent")}</a>
          <header
            className={[
              'app-header [border-bottom:1px_solid_var(--color-tilly-border)] sticky top-0 z-40 [background:var(--color-tilly-bg)] [transition:transform_220ms_ease]',
              '[&_nav]:flex [&_nav]:gap-7 [&_nav]:[align-self:stretch] [&_nav]:items-center [&_nav]:min-w-0',
              '[&_nav_a]:flex [&_nav_a]:items-center [&_nav_a]:h-full [&_nav_a]:[color:var(--color-tilly-text-secondary)] [&_nav_a]:[border-bottom:2px_solid_transparent] [&_nav_a]:min-h-11 [&_nav_a]:flex-none [&_nav_a]:whitespace-nowrap',
              "[&_nav_a[aria-current='page']]:[color:var(--color-tilly-text)] [&_nav_a[aria-current='page']]:[border-color:var(--color-tilly-accent)]",
              'max-[700px]:[&_nav]:gap-4.5 max-[700px]:[&_nav]:[order:initial] max-[700px]:[&_nav]:w-[auto] max-[700px]:[&_nav]:justify-center max-[700px]:[&_nav]:min-h-11',
              'max-[380px]:[&_nav]:gap-3 max-[380px]:[&_nav]:overflow-x-auto',
              "[&[data-hidden='true']]:[transform:translateY(-100%)]",
              'max-[640px]:[&_nav]:[order:initial] max-[640px]:[&_nav]:w-[auto] max-[640px]:[&_nav]:gap-4.5 max-[640px]:[&_nav]:[align-self:stretch]',
              'max-[640px]:[&_nav_a]:min-h-11 max-[640px]:[&_nav_a]:py-1',
              'motion-reduce:[transition:none]',
            ].join(' ')}
            {...header}
          >
            <div
              className={[
                'app-header-inner min-h-20 flex items-center gap-[var(--gap-lg,_40px)] w-full max-w-[var(--page-width,_1200px)] px-[var(--page-gutter,_20px)] mx-[auto]',
                '[.app-header_>_&]:h-[var(--header-height)] [.app-header_>_&]:min-h-[var(--header-height)] [.app-header_>_&]:py-[0]',
                'max-[700px]:min-h-18 max-[700px]:gap-4 max-[700px]:flex-wrap max-[700px]:py-4',
                'max-[700px]:[&_nav]:order-3 max-[700px]:[&_nav]:w-full max-[700px]:[&_nav]:overflow-x-auto',
                'min-[768px]:px-[var(--page-gutter-md,_28px)]',
                'max-[380px]:gap-3',
                'max-[640px]:flex-wrap max-[640px]:gap-5 max-[640px]:min-h-19 max-[640px]:py-4',
                '[.app-app_.app-header_>_&]:h-[auto] [.app-app_.app-header_>_&]:min-h-[var(--header-height,_80px)] [.app-app_.app-header_>_&]:py-4',
              ].join(' ')}
            >
              <TillyLogo />
              <nav aria-label={t("navigation.tilly")}>
                <Link to="/feed" activeProps={{ 'aria-current': 'page' }}>
                  {t("navigation.feed")}</Link>
                <Link to="/map" activeProps={{ 'aria-current': 'page' }}>
                  {t("navigation.map")}</Link>
                {user && (
                  <Link to="/catch" activeProps={{ 'aria-current': 'page' }}>
                    {t("catch.sheetTitle")}</Link>
                )}
                {user && <NotificationsLink />}
              </nav>
              <div
                className={[
                  'app-account ml-[auto] flex items-center gap-4.5 text-[14px]',
                  '[&_a]:min-h-11',
                  '[&_button]:min-h-11',
                  'max-[700px]:gap-2',
                  '[&_>_a]:inline-flex [&_>_a]:items-center [&_>_a]:justify-center',
                  '[&_>_button]:inline-flex [&_>_button]:items-center [&_>_button]:justify-center',
                  '[.app-app_&]:gap-2',
                ].join(' ')}
              >
                {ready && user ? (
                  <span className="relative shrink-0">
                    <Link
                      to="/people/$userId"
                      params={{ userId: user.id }}
                      className={[
                        'app-profile-trigger size-11 shrink-0 rounded-full overflow-hidden grid place-items-center [background:var(--color-tilly-surface)]',
                        '[&_img]:w-full [&_img]:h-full [&_img]:object-cover',
                      ].join(' ')}
                      aria-label={t("navigation.yourProfileAndSettings")}
                      aria-describedby={pending ? 'profile-requests' : undefined}
                    >
                      <ProfileAvatar photo={avatar} seed={user.id} size={44} />
                    </Link>
                    {pending > 0 && (
                      <>
                        <span
                          aria-hidden="true"
                          className="pointer-events-none absolute -right-1 -top-1 min-w-5 rounded-full bg-tilly-accent px-1.5 text-center text-[11px] font-semibold leading-5 text-tilly-on-signal"
                        >
                          {pending > 99 ? '99+' : pending}
                        </span>
                        <span id="profile-requests" className="sr-only">
                          {t(`profile.requestCount.${pending === 1 ? 'one' : 'other'}`, { count: String(pending) })}
                        </span>
                      </>
                    )}
                  </span>
                ) : (
                  <SignInLink>{t("common.signIn")}</SignInLink>
                )}
                  <button
                    className={[
                      'app-theme grid place-items-center w-11 h-11 flex-none rounded-full',
                      'hover:[background:var(--color-tilly-surface)]',
                      '[.app-account_&]:grid',
                    ].join(' ')}
                    onClick={() =>
                      setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
                    }
                    aria-label={resolvedTheme === 'dark' ? t("navigation.switchLight") : t("navigation.switchDark")}
                  >
                    {resolvedTheme === 'dark' ? (
                      <Sun size={19} aria-hidden="true" />
                    ) : (
                      <Moon size={19} aria-hidden="true" />
                    )}
                  </button>
              </div>
            </div>
          </header>
          <main id="app-main">
            <Outlet key={user?.id ?? 'anonymous'} />
          </main>
          <footer
            className={[
              'app-footer w-full max-w-[var(--page-width,_1200px)] px-[var(--page-gutter,_20px)] mx-[auto] flex justify-between gap-6 py-6 [color:var(--color-tilly-text-secondary)] text-[12px] mt-[auto] min-h-26',
              '[&_a]:min-h-11 [&_a]:flex [&_a]:items-center',
              '[&_span]:[align-self:center]',
              'max-[700px]:[&_span]:max-w-[24ch] max-[700px]:[&_span]:text-right',
              'min-[768px]:px-[var(--page-gutter-md,_28px)]',
              'max-[640px]:gap-6 max-[640px]:items-center',
              '[.app-app:has(.catch-page)_>_&]:hidden',
            ].join(' ')}
          >
            <Link to="/">{t("navigation.aboutTilly")}</Link>
            <LanguageSelector />
          </footer>
        </div>
      </NotificationsProvider>
    </ProfileSavedContext.Provider>
  )
}
