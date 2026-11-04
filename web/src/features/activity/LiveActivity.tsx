import { useAppCopy } from '~/features/app/copy'
import { useRouteContext } from '@tanstack/react-router'
import { Link } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { createWebsiteClients } from '~/lib/foir'
import { relativeTime } from '~/lib/location'
import { readWorldActivity, type WorldActivity } from '~/features/app/data'
import { Globe } from './Globe'
import { Photo } from '~/features/app/CatchImage'
import { defaultHomeCopy, type HomeCopy } from '~/lib/home-content'
export function LiveActivity({ copy = defaultHomeCopy }: { copy?: HomeCopy }) {
  const t = useAppCopy()
  const { locale } = useRouteContext({ from: '__root__' })
  const client = useMemo(() => createWebsiteClients().foir, [])
  const [data, setData] = useState<WorldActivity | null>(null)
  const [error, setError] = useState(false)
  const [retry, setRetry] = useState(0)
  const [pulse, setPulse] = useState<string | null>(null)
  const [clock, setClock] = useState(Date.now())
  useEffect(() => {
    let active = true,
      busy = false,
      pending = false,
      initial = true
    let seen = new Set<string>()
    let subscriptions: { unsubscribe(): void }[] = []
    let timer: ReturnType<typeof setTimeout> | undefined
    const refresh = async () => {
      if (!active || document.hidden) return
      if (busy) {
        pending = true
        return
      }
      busy = true
      try {
        const result = await readWorldActivity(client)
        if (!active) return
        const fresh =
          !initial && result.recent.find((capture) => !seen.has(capture.id))
        if (fresh) setPulse(fresh.id)
        seen = new Set(result.recent.map((capture) => capture.id))
        initial = false
        setData(result)
        setError(false)
        setClock(Date.now())
      } catch {
        if (active) setError(true)
      } finally {
        busy = false
        if (pending) {
          pending = false
          void refresh()
        }
      }
    }
    let settle: ReturnType<typeof setTimeout> | undefined
    const changed = () => {
      clearTimeout(timer)
      timer = setTimeout(() => {
        void refresh()
      }, 1000)
      clearTimeout(settle)
      settle = setTimeout(() => {
        void refresh()
      }, 5000)
    }
    const connect = () => {
      subscriptions.forEach((subscription) => subscription.unsubscribe())
      subscriptions = []
      if (document.hidden) return
      void refresh()
      subscriptions = [
        client.cat.onChange({
          onData: changed,
          onReconnect: changed,
          onError: () => {
            if (active) setError(true)
          },
        }),
      ]
      // Anonymous streams of user-owned captures are refused (docs/known-gaps.md),
      // so new catches arrive with the periodic re-read below. Never count events
      // or widen record access.
    }
    connect()
    // Visibility changes/deletes can be silent on a user-owned model. Re-read
    // periodically as well as on reconnect; never derive totals by ++ on events.
    const interval = setInterval(() => {
      setClock(Date.now())
      void refresh()
    }, 30000)
    document.addEventListener('visibilitychange', connect)
    window.addEventListener('focus', changed)
    return () => {
      active = false
      clearTimeout(timer)
      clearTimeout(settle)
      clearInterval(interval)
      subscriptions.forEach((s) => s.unsubscribe())
      document.removeEventListener('visibilitychange', connect)
      window.removeEventListener('focus', changed)
    }
  }, [client, retry])
  useEffect(() => {
    if (!pulse) return
    const timeout = setTimeout(() => setPulse(null), 3500)
    return () => clearTimeout(timeout)
  }, [pulse])
  const latest = data?.recent[0]
  return (
    <section
      className={[
        'tilly-world grid [grid-template-columns:1fr_1fr] items-center gap-[var(--gap-lg,_40px)] p-[var(--section-md,_64px)_0] my-[40px_80px] [background:var(--color-tilly-bg)] [color:var(--color-tilly-text)]',
        'max-[760px]:[grid-template-columns:1fr] max-[760px]:gap-6 max-[760px]:my-[0_40px]',
      ].join(' ')}
      aria-labelledby="world-title"
    >
      <div
        className={[
          'world-copy',
          '[&_h2_span]:block',
          '[&_h2]:[font:400_clamp(40px,_5vw,_76px)/1.04_Georgia,_serif] [&_h2]:tracking-[-0.045em] [&_h2]:m-[0_0_24px]',
          '[&_>_p]:max-w-[36ch] [&_>_p]:text-[17px] [&_>_p]:leading-[1.6] [&_>_p]:[color:var(--color-tilly-text-secondary)]',
        ].join(' ')}
      >
        <h2 id="world-title">
          {copy['world.title'].split('\n').map((line, index) => (
            <span key={index}>{line}</span>
          ))}
        </h2>
        <p>{copy['world.body']}</p>
        <dl
          className={[
            'world-totals flex gap-12 m-[36px_0] font-sans',
            '[&_dt]:text-[13px] [&_dt]:[color:var(--color-tilly-text-secondary)] [&_dt]:mb-2',
            '[&_dd]:text-[36px] [&_dd]:leading-[1] [&_dd]:[font-variant-numeric:tabular-nums] [&_dd]:m-0',
            'max-[760px]:gap-10',
          ].join(' ')}
        >
          <div>
            <dt>{copy['world.cats']}</dt>
            <dd>{data ? data.cats.toLocaleString() : '—'}</dd>
          </div>
          <div>
            <dt>{copy['world.catches']}</dt>
            <dd>{data ? data.catches.toLocaleString() : '—'}</dd>
          </div>
        </dl>
        {!latest && (
          <p
            className={[
              'world-latest min-h-19 mb-7 font-sans',
              '[&_>_span]:text-[13px] [&_>_span]:[color:var(--color-tilly-text-secondary)]',
              '[&_p]:text-[17px] [&_p]:mt-2',
              '[&_p_span]:[color:var(--color-tilly-text-secondary)] [&_p_span]:text-[13px]',
            ].join(' ')}
            aria-live="polite"
          >
            {data
              ? copy['world.empty']
              : error
                ? copy['world.slow']
                : copy['world.loading']}
          </p>
        )}
        {error && (
          <p
            className={[
              'world-status [color:var(--color-tilly-text-secondary)] text-[13px]',
              '[&_button]:underline [&_button]:cursor-pointer [&_button]:min-h-11',
            ].join(' ')}
          >
            {copy['world.error']}{' '}
            <button onClick={() => setRetry((v) => v + 1)}>
              {copy['world.retry']}
            </button>
          </p>
        )}
        <Link
          to="/feed"
          className={[
            'tilly-button inline-flex items-center justify-center gap-5.5 min-h-13 p-[14px_25px] rounded-full [background:var(--color-tilly-accent)] [color:var(--color-tilly-on-signal)] text-[16px] font-medium [transition:transform_0.2s]',
            'hover:[transform:translateY(-3px)]',
            '[&:active]:[transform:scale(0.97)]',
          ].join(' ')}
        >
          {copy['world.action']} <span aria-hidden="true">↗</span>
        </Link>
      </div>
      <div
        className={[
          'world-picture min-w-0',
          'max-[760px]:row-start-1 max-[760px]:max-w-[360px] max-[760px]:justify-self-center max-[760px]:w-full',
        ].join(' ')}
      >
        <div className="relative pb-20">
          <Globe recent={data?.recent ?? []} pulse={pulse} />
          {latest && (
            <figure
              className={`tilly-encounter [padding:12px_12px_18px] [background:#ebece5] [color:#191c17] [&_img]:w-full [&_img]:block [&_img]:object-cover [&_figcaption]:[font-family:Georgia,_serif] [&_figcaption]:[font-size:21px] [&_figcaption]:[line-height:1.2] [&_figcaption]:[padding:18px_2px_0] [&_figcaption]:text-left [@media(max-width:_600px)]:absolute [@media(max-width:_600px)]:[width:35%] [@media(max-width:_600px)]:[padding:6px_6px_10px] [@media(max-width:_600px)]:[&_figcaption]:[font-size:13px] [@media(max-width:_600px)]:[&_figcaption]:[padding-top:10px] [@media(max-width:_600px)]:[&_figcaption]:hidden world-polaroid [.world-picture_&]:absolute [.world-picture_&]:[width:42%] [.world-picture_&]:[right:0] [.world-picture_&]:[bottom:32px] [.world-picture_&]:m-0 [.world-picture_&]:[transform:rotate(7deg)] [.tilly-site_&_figcaption]:grid [.tilly-site_&_figcaption]:[gap:5px] [.tilly-site_&_figcaption]:[padding-top:12px] [&_figcaption_span]:[font:11px/1.3_var(--font-sans)] [&_time]:[font:11px/1.3_var(--font-sans)] [&_strong]:[font:400_21px/1.15_Georgia,_serif] [&_strong]:[overflow-wrap:anywhere] [@media(max-width:_760px)]:[.world-picture_&]:[width:40%] [@media(max-width:_760px)]:[.world-picture_&]:[bottom:40px]${pulse === latest.id ? ' world-new [animation:world-arrival_0.7s_ease-out] [@media(prefers-reduced-motion:_reduce)]:[animation:none]' : ''}`}
            >
              <Photo
                src={data?.latestPhoto ?? null}
                alt={latest.name || t('cat.unnamed')}
                className={[
                  'world-photo',
                  '[.world-polaroid_>_&]:w-full [.world-polaroid_>_&]:aspect-[4/5] [.world-polaroid_>_&]:object-cover [.world-polaroid_>_&]:[background:#deded8] [.world-polaroid_>_&]:h-[auto]',
                ].join(' ')}
              />
              <figcaption aria-live="polite">
                <span>{copy['world.latest']}</span>
                <strong>{latest.name || t('cat.unnamed')}</strong>
                <time dateTime={latest.postedAt ?? undefined}>
                  {relativeTime(latest.postedAt, clock, locale, t)}
                </time>
              </figcaption>
            </figure>
          )}
        </div>
        <p className="m-0 px-3 text-center font-sans text-xs! leading-relaxed text-tilly-text-secondary">
          {copy['world.privacy']}
        </p>
      </div>
    </section>
  )
}
