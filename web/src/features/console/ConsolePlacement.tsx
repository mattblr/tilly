import { useAppCopy } from '~/features/app/copy'
import { collectConnection } from '~/features/app/paging'
import { useEffect, useMemo, useState } from 'react'
import {
  connectPlacement,
  type PlacementSession,
} from '@foir/sdk/placement'
import { setSession, clearSession } from './api'
import { CopyProvider } from '~/features/app/copy'
import { consoleEnvironment } from '~/lib/console-environment'
import { Styles } from './styles'
import { Words, Settings, Tags, Premium } from './settings'
import { Notifications } from './notifications'
import { Challenges } from './challenges'
import { Review } from './review'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '~/features/console/components/ui/tabs'

const sections = [
  ['styles', "console.stylesTab"],
  ['words', "console.wordsTab"],
  ['settings', "console.settingsTab"],
  ['tags', "console.tagsTab"],
  ['challenges', "console.challengesTab"],
  ['premium', "console.premiumTab"],
  ['notifications', "inbox.title"],
  ['review', "safety.review"],
] as const

type CopyRecord = { _naturalKey: string; entries: { key: string; value: string }[] }
function ConsoleCopy({ session, children }: { session: PlacementSession; children: React.ReactNode }) {
  const sessionKey = useMemo(() => crypto.randomUUID(), [session])
  const [records, setRecords] = useState<CopyRecord[]>([])
  useEffect(() => {
    let active = true
    // Capture this placement's authority; an old page cannot use a replacement session.
    void collectConnection(async after => {
      const result = await session.request<{ uiCopies: {
        edges: { node: CopyRecord }[]
        pageInfo: { hasNextPage: boolean; endCursor: string | null }
      } }>(`query ErrorCopy($after: String) {
        uiCopies(first: 100, after: $after) {
          pageInfo { hasNextPage endCursor }
          edges { node { _naturalKey entries { key value } } }
        }
      }`, { after })
      return result.uiCopies
    }).then(rows => { if (active) setRecords(rows) }).catch(() => {})
    return () => { active = false }
  }, [session])
  return <CopyProvider key={sessionKey} records={records}>{children}</CopyProvider>
}
function App({ session }: { session: PlacementSession }) {
  const t = useAppCopy()
  const [tab, setTab] = useState('styles')
  const [visited, setVisited] = useState(new Set(['styles']))
  const label = t(sections.find(([key]) => key === tab)![1])
  useEffect(() => { document.title = t('website.consoleTitle') }, [t])
  return (
    <main
      className={[
        "foir-console [--background:#fff] [--foreground:#242521] [--muted:#f5f5f2] [--muted-foreground:#62655e] [--border:#e8e9e4] [--input:#d7d9d1] [--ring:#54765e] [--destructive:#a9312b] [font-family:-apple-system,_BlinkMacSystemFont,_'Segoe_UI',_sans-serif] [color-scheme:light] min-h-dvh m-[0_auto] [background:var(--background)] [color:var(--foreground)] text-[14px] leading-[1.45] [-webkit-font-smoothing:antialiased] max-w-[1320px] p-[24px_28px_64px] [--card:var(--background)] [--card-foreground:var(--foreground)] [--popover:var(--background)] [--popover-foreground:var(--foreground)] [--primary:var(--foreground)] [--primary-foreground:var(--background)] [--secondary:var(--muted)] [--secondary-foreground:var(--foreground)] [--accent:var(--muted)] [--accent-foreground:var(--foreground)] [--radius:8px]",
        '[html.dark_&]:[--background:#181a17] [html.dark_&]:[--foreground:#edeee9] [html.dark_&]:[--muted:#242720] [html.dark_&]:[--muted-foreground:#a7aca0] [html.dark_&]:[--border:#33382e] [html.dark_&]:[--input:#4c5344] [html.dark_&]:[--ring:#a2b8a4] [html.dark_&]:[--destructive:#f5998f] [html.dark_&]:[color-scheme:dark]',
        '[&_*]:box-border',
        '[&_button]:[font:inherit] [&_button]:cursor-pointer',
        '[&_input]:[font:inherit]',
        '[&_textarea]:[font:inherit]',
        '[&_button:disabled]:[cursor:default]',
        '[&_h1]:text-[20px] [&_h1]:font-semibold [&_h1]:tracking-[-0.025em] [&_h1]:m-0',
        '[&_h2]:text-[14px] [&_h2]:font-semibold [&_h2]:m-0',
        '[&_h3]:text-[12px] [&_h3]:font-medium [&_h3]:m-[0_0_6px]',
        '[&_table]:w-full [&_table]:[border-collapse:collapse] [&_table]:text-left [&_table]:text-[13px]',
        '[&_th]:text-[12px] [&_th]:font-medium [&_th]:[color:var(--muted-foreground)] [&_th]:p-[10px_16px_10px_0] [&_th]:[border-bottom:1px_solid_var(--border)] [&_th]:whitespace-nowrap',
        '[&_td]:p-[15px_16px_15px_0] [&_td]:[border-bottom:1px_solid_var(--border)]',
        '[&_td_strong]:font-medium',
        '[&_td_small]:block [&_td_small]:[color:var(--muted-foreground)] [&_td_small]:text-[12px] [&_td_small]:mt-0.75',
        '[&_td:last-child]:text-right [&_td:last-child]:pr-[0]',
        'max-[760px]:p-[20px_20px_48px]',
        'max-[420px]:px-4',
        'motion-reduce:[&_*]:[animation-duration:0.01ms]! motion-reduce:[&_*]:[transition-duration:0.01ms]!',
        'motion-reduce:[&_*::before]:[animation-duration:0.01ms]! motion-reduce:[&_*::before]:[transition-duration:0.01ms]!',
        'motion-reduce:[&_*::after]:[animation-duration:0.01ms]! motion-reduce:[&_*::after]:[transition-duration:0.01ms]!',
      ].join(' ')}
    >
      <header className={'page-title mb-4.5'}>
        <h1>{label}</h1>
      </header>
      {!!session.grant.withheldGrants.length && (
        <p
          className={
            'permission-note text-[12px] mb-4.5 [color:var(--muted-foreground)]'
          }
          role="status"
        >
          {t("console.withheldPermissions", {count:String(session.grant.withheldGrants.length)})}</p>
      )}
      <Tabs
        value={tab}
        onValueChange={(value) => {
          setTab(value)
          setVisited((old) => new Set([...old, value]))
        }}
      >
        <TabsList
          className={[
            'page-tabs [background:transparent] rounded-[0] p-0 gap-5.5 justify-start [border-bottom:1px_solid_var(--border)] w-full h-9 mb-6',
            '[&_>_button]:p-[0_0_12px] [&_>_button]:rounded-[0] [&_>_button]:[background:transparent]! [&_>_button]:[box-shadow:none]! [&_>_button]:[color:var(--muted-foreground)] [&_>_button]:font-normal [&_>_button]:[border-bottom:2px_solid_transparent]',
            "[&_>_button[data-state='active']]:[color:var(--foreground)] [&_>_button[data-state='active']]:[border-bottom-color:var(--foreground)]",
            'max-[760px]:gap-4.5 max-[760px]:overflow-x-auto max-[760px]:justify-start',
            'max-[420px]:gap-3.5',
            'max-[420px]:[&_>_button]:text-[12px]',
          ].join(' ')}
          aria-label={t("console.tillyAdministration")}
        >
          {sections.map(([key, title]) => (
            <TabsTrigger key={key} value={key}>
              {t(title)}
            </TabsTrigger>
          ))}
        </TabsList>
        {sections.map(([key]) => (
          <TabsContent
            key={key}
            value={key}
            forceMount
            className={'page-panel m-0 data-[state=inactive]:hidden'}
          >
            {visited.has(key) &&
              (key === 'styles' ? (
                <Styles active={tab === key} />
              ) : key === 'words' ? (
                <Words />
              ) : key === 'settings' ? (
                <Settings />
              ) : key === 'tags' ? (
                <Tags />
              ) : key === 'challenges' ? (
                <Challenges session={session} />
              ) : key === 'notifications' ? (
                <Notifications />
              ) : key === 'review' ? (
                <Review />
              ) : (
                <Premium />
              ))}
          </TabsContent>
        ))}
      </Tabs>
    </main>
  )
}

type Connection =
  | { status: 'connecting' | 'refused' | 'signed-out' }
  | { status: 'ready'; session: PlacementSession }

/** Fóir owns identity and permissions. The route has no separate sign-in or app key. */
export function ConsolePlacement() {
  const t = useAppCopy()
  const [connection, setConnection] = useState<Connection>({
    status: 'connecting',
  })
  useEffect(() => {
    let mounted = true
    let connected: PlacementSession | undefined
    let unsubscribe: (() => void) | undefined
    const html = document.documentElement
    const oldAppearance = {
      dark: html.classList.contains('dark'),
      light: html.classList.contains('light'),
      scheme: html.style.colorScheme,
    }
    html.classList.remove('light')
    const environment = consoleEnvironment(import.meta.env.VITE_PLATFORM_API_URL)
    void connectPlacement({
      apiUrl: environment.apiOrigin,
      consoleOrigins: environment.consoleOrigins,
      onAppearance: ({ theme }) => {
        if (!mounted) return
        html.classList.toggle('dark', theme === 'dark')
        html.style.colorScheme = theme
      },
    })
      .then((session) => {
        if (!mounted) {
          session.close()
          return
        }
        connected = session
        setSession(session)
        unsubscribe = session.onSignedOut(() => {
          clearSession(session)
          setConnection({ status: 'signed-out' })
        })
        setConnection({ status: 'ready', session })
      })
      .catch(() => {
        if (mounted) setConnection({ status: 'refused' })
      })
    return () => {
      mounted = false
      unsubscribe?.()
      connected?.close()
      clearSession(connected)
      html.classList.toggle('dark', oldAppearance.dark)
      html.classList.toggle('light', oldAppearance.light)
      html.style.colorScheme = oldAppearance.scheme
    }
  }, [])

  if (connection.status === 'ready') return <ConsoleCopy session={connection.session}><App session={connection.session} /></ConsoleCopy>
  if (connection.status === 'signed-out')
    return (
      <main
        className={[
          "foir-console [--background:#fff] [--foreground:#242521] [--muted:#f5f5f2] [--muted-foreground:#62655e] [--border:#e8e9e4] [--input:#d7d9d1] [--ring:#54765e] [--destructive:#a9312b] [font-family:-apple-system,_BlinkMacSystemFont,_'Segoe_UI',_sans-serif] [color-scheme:light] min-h-dvh m-[0_auto] [background:var(--background)] [color:var(--foreground)] text-[14px] leading-[1.45] [-webkit-font-smoothing:antialiased] max-w-[1320px] p-[24px_28px_64px] [--card:var(--background)] [--card-foreground:var(--foreground)] [--popover:var(--background)] [--popover-foreground:var(--foreground)] [--primary:var(--foreground)] [--primary-foreground:var(--background)] [--secondary:var(--muted)] [--secondary-foreground:var(--foreground)] [--accent:var(--muted)] [--accent-foreground:var(--foreground)] [--radius:8px]",
          '[html.dark_&]:[--background:#181a17] [html.dark_&]:[--foreground:#edeee9] [html.dark_&]:[--muted:#242720] [html.dark_&]:[--muted-foreground:#a7aca0] [html.dark_&]:[--border:#33382e] [html.dark_&]:[--input:#4c5344] [html.dark_&]:[--ring:#a2b8a4] [html.dark_&]:[--destructive:#f5998f] [html.dark_&]:[color-scheme:dark]',
          '[&_*]:box-border',
          '[&_button]:[font:inherit] [&_button]:cursor-pointer',
          '[&_input]:[font:inherit]',
          '[&_textarea]:[font:inherit]',
          '[&_button:disabled]:[cursor:default]',
          '[&_h1]:text-[20px] [&_h1]:font-semibold [&_h1]:tracking-[-0.025em] [&_h1]:m-0',
          '[&_h2]:text-[14px] [&_h2]:font-semibold [&_h2]:m-0',
          '[&_h3]:text-[12px] [&_h3]:font-medium [&_h3]:m-[0_0_6px]',
          '[&_table]:w-full [&_table]:[border-collapse:collapse] [&_table]:text-left [&_table]:text-[13px]',
          '[&_th]:text-[12px] [&_th]:font-medium [&_th]:[color:var(--muted-foreground)] [&_th]:p-[10px_16px_10px_0] [&_th]:[border-bottom:1px_solid_var(--border)] [&_th]:whitespace-nowrap',
          '[&_td]:p-[15px_16px_15px_0] [&_td]:[border-bottom:1px_solid_var(--border)]',
          '[&_td_strong]:font-medium',
          '[&_td_small]:block [&_td_small]:[color:var(--muted-foreground)] [&_td_small]:text-[12px] [&_td_small]:mt-0.75',
          '[&_td:last-child]:text-right [&_td:last-child]:pr-[0]',
          'max-[760px]:p-[20px_20px_48px]',
          'max-[420px]:px-4',
          'motion-reduce:[&_*]:[animation-duration:0.01ms]! motion-reduce:[&_*]:[transition-duration:0.01ms]!',
          'motion-reduce:[&_*::before]:[animation-duration:0.01ms]! motion-reduce:[&_*::before]:[transition-duration:0.01ms]!',
          'motion-reduce:[&_*::after]:[animation-duration:0.01ms]! motion-reduce:[&_*::after]:[transition-duration:0.01ms]!',
        ].join(' ')}
      >
        <h1>{t("console.signedOut")}</h1>
        <p>{t("console.youveSignedOutOfTheFIrConsole")}</p>
      </main>
    )
  if (connection.status === 'refused')
    return (
      <main
        className={[
          "foir-console [--background:#fff] [--foreground:#242521] [--muted:#f5f5f2] [--muted-foreground:#62655e] [--border:#e8e9e4] [--input:#d7d9d1] [--ring:#54765e] [--destructive:#a9312b] [font-family:-apple-system,_BlinkMacSystemFont,_'Segoe_UI',_sans-serif] [color-scheme:light] min-h-dvh m-[0_auto] [background:var(--background)] [color:var(--foreground)] text-[14px] leading-[1.45] [-webkit-font-smoothing:antialiased] max-w-[1320px] p-[24px_28px_64px] [--card:var(--background)] [--card-foreground:var(--foreground)] [--popover:var(--background)] [--popover-foreground:var(--foreground)] [--primary:var(--foreground)] [--primary-foreground:var(--background)] [--secondary:var(--muted)] [--secondary-foreground:var(--foreground)] [--accent:var(--muted)] [--accent-foreground:var(--foreground)] [--radius:8px]",
          '[html.dark_&]:[--background:#181a17] [html.dark_&]:[--foreground:#edeee9] [html.dark_&]:[--muted:#242720] [html.dark_&]:[--muted-foreground:#a7aca0] [html.dark_&]:[--border:#33382e] [html.dark_&]:[--input:#4c5344] [html.dark_&]:[--ring:#a2b8a4] [html.dark_&]:[--destructive:#f5998f] [html.dark_&]:[color-scheme:dark]',
          '[&_*]:box-border',
          '[&_button]:[font:inherit] [&_button]:cursor-pointer',
          '[&_input]:[font:inherit]',
          '[&_textarea]:[font:inherit]',
          '[&_button:disabled]:[cursor:default]',
          '[&_h1]:text-[20px] [&_h1]:font-semibold [&_h1]:tracking-[-0.025em] [&_h1]:m-0',
          '[&_h2]:text-[14px] [&_h2]:font-semibold [&_h2]:m-0',
          '[&_h3]:text-[12px] [&_h3]:font-medium [&_h3]:m-[0_0_6px]',
          '[&_table]:w-full [&_table]:[border-collapse:collapse] [&_table]:text-left [&_table]:text-[13px]',
          '[&_th]:text-[12px] [&_th]:font-medium [&_th]:[color:var(--muted-foreground)] [&_th]:p-[10px_16px_10px_0] [&_th]:[border-bottom:1px_solid_var(--border)] [&_th]:whitespace-nowrap',
          '[&_td]:p-[15px_16px_15px_0] [&_td]:[border-bottom:1px_solid_var(--border)]',
          '[&_td_strong]:font-medium',
          '[&_td_small]:block [&_td_small]:[color:var(--muted-foreground)] [&_td_small]:text-[12px] [&_td_small]:mt-0.75',
          '[&_td:last-child]:text-right [&_td:last-child]:pr-[0]',
          'max-[760px]:p-[20px_20px_48px]',
          'max-[420px]:px-4',
          'motion-reduce:[&_*]:[animation-duration:0.01ms]! motion-reduce:[&_*]:[transition-duration:0.01ms]!',
          'motion-reduce:[&_*::before]:[animation-duration:0.01ms]! motion-reduce:[&_*::before]:[transition-duration:0.01ms]!',
          'motion-reduce:[&_*::after]:[animation-duration:0.01ms]! motion-reduce:[&_*::after]:[transition-duration:0.01ms]!',
        ].join(' ')}
      >
        <h1>{t("console.openTillyFromFIr")}</h1>
        <p>
          {t("console.thisPageNeedsTheConsolesConnectionOpenTillyFrom")}</p>
      </main>
    )
  return (
    <main
      className={[
        "foir-console [--background:#fff] [--foreground:#242521] [--muted:#f5f5f2] [--muted-foreground:#62655e] [--border:#e8e9e4] [--input:#d7d9d1] [--ring:#54765e] [--destructive:#a9312b] [font-family:-apple-system,_BlinkMacSystemFont,_'Segoe_UI',_sans-serif] [color-scheme:light] min-h-dvh m-[0_auto] [background:var(--background)] [color:var(--foreground)] text-[14px] leading-[1.45] [-webkit-font-smoothing:antialiased] max-w-[1320px] p-[24px_28px_64px] [--card:var(--background)] [--card-foreground:var(--foreground)] [--popover:var(--background)] [--popover-foreground:var(--foreground)] [--primary:var(--foreground)] [--primary-foreground:var(--background)] [--secondary:var(--muted)] [--secondary-foreground:var(--foreground)] [--accent:var(--muted)] [--accent-foreground:var(--foreground)] [--radius:8px]",
        '[html.dark_&]:[--background:#181a17] [html.dark_&]:[--foreground:#edeee9] [html.dark_&]:[--muted:#242720] [html.dark_&]:[--muted-foreground:#a7aca0] [html.dark_&]:[--border:#33382e] [html.dark_&]:[--input:#4c5344] [html.dark_&]:[--ring:#a2b8a4] [html.dark_&]:[--destructive:#f5998f] [html.dark_&]:[color-scheme:dark]',
        '[&_*]:box-border',
        '[&_button]:[font:inherit] [&_button]:cursor-pointer',
        '[&_input]:[font:inherit]',
        '[&_textarea]:[font:inherit]',
        '[&_button:disabled]:[cursor:default]',
        '[&_h1]:text-[20px] [&_h1]:font-semibold [&_h1]:tracking-[-0.025em] [&_h1]:m-0',
        '[&_h2]:text-[14px] [&_h2]:font-semibold [&_h2]:m-0',
        '[&_h3]:text-[12px] [&_h3]:font-medium [&_h3]:m-[0_0_6px]',
        '[&_table]:w-full [&_table]:[border-collapse:collapse] [&_table]:text-left [&_table]:text-[13px]',
        '[&_th]:text-[12px] [&_th]:font-medium [&_th]:[color:var(--muted-foreground)] [&_th]:p-[10px_16px_10px_0] [&_th]:[border-bottom:1px_solid_var(--border)] [&_th]:whitespace-nowrap',
        '[&_td]:p-[15px_16px_15px_0] [&_td]:[border-bottom:1px_solid_var(--border)]',
        '[&_td_strong]:font-medium',
        '[&_td_small]:block [&_td_small]:[color:var(--muted-foreground)] [&_td_small]:text-[12px] [&_td_small]:mt-0.75',
        '[&_td:last-child]:text-right [&_td:last-child]:pr-[0]',
        'max-[760px]:p-[20px_20px_48px]',
        'max-[420px]:px-4',
        'motion-reduce:[&_*]:[animation-duration:0.01ms]! motion-reduce:[&_*]:[transition-duration:0.01ms]!',
        'motion-reduce:[&_*::before]:[animation-duration:0.01ms]! motion-reduce:[&_*::before]:[transition-duration:0.01ms]!',
        'motion-reduce:[&_*::after]:[animation-duration:0.01ms]! motion-reduce:[&_*::after]:[transition-duration:0.01ms]!',
      ].join(' ')}
    >
      <p role="status">{t("console.connectingToFIr")}</p>
    </main>
  )
}
