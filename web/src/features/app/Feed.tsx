import { PostHighlightBadges } from './PostHighlightBadges'
import { EditCaptureTags } from './EditCaptureTags'
import { useResource } from './use-resource'
import { requestArea } from './location'
import { catchLocation } from './camera'
import { PlacePicker, type Destination } from './PlacePicker'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '~/components/ui/select'
import { SignInLink } from './SignIn'
import { Repeat2 } from 'lucide-react'
import { RoaringCat } from '~/components/RoaringCat'
import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import { usePages } from './use-pages'
import {
  followingSource,
  trendingSource,
  nearbyTrendingSource,
} from './feed-sources'
import { Likes } from './Likes'
import { encounterCopy, type Encounter } from './data'
import { useAppSession } from './session'
import { relativeTime } from '~/lib/location'
import { CatchImage } from './CatchImage'
import { useAppCopy } from './copy'
import { CatchActions } from './Actions'
import { ProfileAvatar } from './ProfileAvatar'
import { allowedEncounter } from './safety-data'
import { SafetyMenu } from './SafetyMenu'
export { Photo } from './CatchImage'
export function EncounterCard({
  row,
  onChanged,
}: {
  row: Encounter
  onChanged?: () => void
}) {
  const t = useAppCopy()
  row = encounterCopy(row, t)
  return (
    <article className="encounter">
      <div
        className={[
          'encounter-author flex gap-2.5 items-center mb-3 text-[14px] min-h-11',
          '[&_>_span:nth-child(2)]:flex-1 [&_>_span:nth-child(2)]:min-w-0',
          '[&_small]:block [&_small]:text-[12px] [&_small]:[color:var(--color-tilly-text-secondary)] [&_small]:mt-0.75',
        ].join(' ')}
      >
        <ProfileAvatar
          photo={row.avatar}
          seed={row.authorId ?? 'unknown'}
          className="encounter-avatar"
        />
        <span>
          {row.authorId ? (
            <Link to="/people/$userId" params={{ userId: row.authorId }}>
              {row.author}
            </Link>
          ) : (
            row.author
          )}
          <small>{relativeTime(row.postedAt, undefined, undefined, t)}</small>
        </span>
        {row.audience !== 'public' && (
          <span
            className={
              'encounter-audience [color:var(--color-tilly-text-secondary)] text-[12px]'
            }
          >
            {t('audience.private')}
          </span>
        )}
      </div>
      <div className={'encounter-media relative'}>
        <CatchImage photo={row.photo} art={row.art} name={row.cat} />
        {row.repostedBy && (
          <Link
            className={[
              'encounter-reposter absolute right-[14px] bottom-[-16px] w-11.5 h-11.5 [border:3px_solid_var(--color-tilly-bg)] rounded-full [background:var(--color-tilly-surface)] grid place-items-center z-2',
              '[&_img]:w-full [&_img]:h-full [&_img]:rounded-full [&_img]:object-cover',
              '[&_>_svg]:absolute [&_>_svg]:right-[-5px] [&_>_svg]:bottom-[-3px] [&_>_svg]:[background:var(--color-tilly-bg)] [&_>_svg]:rounded-full [&_>_svg]:w-5.5 [&_>_svg]:h-5.5 [&_>_svg]:p-0.75',
            ].join(' ')}
            to="/people/$userId"
            params={{ userId: row.repostedBy.id }}
            aria-label={t('social.repostedBy', {name: row.repostedBy.name})}
            title={t('social.repostedBy', {name: row.repostedBy.name})}
          >
            <ProfileAvatar
              photo={row.repostedBy.avatar}
              seed={row.repostedBy.id}
              size={32}
            />
            <Repeat2 size={14} aria-hidden="true" />
          </Link>
        )}
      </div>
      <div
        className={[
          'encounter-caption pt-5',
          '[&_h2]:[font:600_20px/1.2_var(--font-sans)] [&_h2]:m-[0_0_8px]',
          '[&_p]:text-[14px] [&_p]:leading-[1.55] [&_p]:[color:var(--color-tilly-text-secondary)] [&_p]:[white-space:pre-wrap] [&_p]:[overflow-wrap:anywhere]',
        ].join(' ')}
      >
        <h2>
          {row.cats?.length ? row.cats.map((cat, index) => <span key={cat.key}>{index > 0 && ' · '}<Link to="/cats/$catId" params={{ catId: cat.catId }}>{cat.name}</Link></span>) : row.catId ? (
            <Link to="/cats/$catId" params={{ catId: row.catId }}>
              {row.cat}
            </Link>
          ) : (
            row.cat
          )}
        </h2>
        {row.highlights && <PostHighlightBadges catalog={row.highlights} selected={row.highlightKeys ?? []} />}
        {row.note && <p>{row.note}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2"><CatchActions row={row} onChanged={onChanged} /><EditCaptureTags row={row} onChanged={onChanged} /><SafetyMenu targetType="post" targetId={row.id} ownerId={row.repostedBy?.id ?? row.authorId} onChanged={onChanged} /></div>
    </article>
  )
}
export function EncounterGrid({
  rows,
  busy = false,
  onChanged,
  layout = 'feed',
}: {
  rows: Encounter[]
  layout?: 'feed' | 'profile'
  busy?: boolean
  onChanged?: () => void
}) {
  const { blockedIds } = useAppSession()
  rows = rows.filter(row => allowedEncounter(row, blockedIds))
  return (
    <Likes
      photoKeys={rows.flatMap((row) => (row.photoKey ? [row.photoKey] : []))}
    >
      <div
        className={
          layout === 'profile'
            ? 'encounter-grid grid grid-cols-1 items-start gap-x-5 gap-y-9 sm:grid-cols-2 lg:grid-cols-3'
            : 'encounter-grid grid grid-cols-1 gap-10'
        }
        aria-busy={busy}
      >
        {rows.map((row) => (
          <EncounterCard row={row} key={row.id} onChanged={onChanged} />
        ))}
      </div>
    </Likes>
  )
}
export function Feed() {
  const t = useAppCopy(),
    { client, user, ready, revision, locale } = useAppSession()
  const [mode, setMode] = useState<'following' | 'trending'>('trending')
  const [days, setDays] = useState('7')
  const [scope, setScope] = useState<'worldwide' | 'nearby' | 'travelling'>(
    'worldwide',
  )
  const [travelling, setTravelling] = useState(false),
    [destination, setDestination] = useState<Destination | null>(null)
  const location = useResource(async () => {
    if (mode !== 'trending' || scope !== 'nearby') return null
    try {
      return await catchLocation()
    } catch {
      return requestArea()
    }
  }, [mode, scope])
  const settings = useResource(
    () =>
      client['app-settings'].findUnique({
        naturalKey: 'app',
        pick: ['_id', 'nearMeMeters'],
      }),
    [client],
  )
  const selected = mode
  const page = usePages(async () => {
    if (!ready) return { next: async () => ({ rows: [], next: null }) }
    if (selected === 'following' && user)
      return followingSource(client, user.id, locale)
    if (selected === 'trending') {
      const since = new Date()
      since.setHours(0, 0, 0, 0)
      if (days === '7')
        since.setDate(since.getDate() - ((since.getDay() + 6) % 7))
      else if (days === '30') since.setDate(1)
      else if (days === 'all') since.setTime(0)
      if (scope === 'nearby') {
        if (location.busy || settings.busy || !location.data)
          return { next: async () => ({ rows: [], next: null }) }
        return nearbyTrendingSource(
          client,
          location.data,
          settings.data?.nearMeMeters ?? 5000,
          since.toISOString(),
          locale,
        )
      }
      if (scope === 'travelling')
        return destination
          ? nearbyTrendingSource(
              client,
              destination,
              destination.radius,
              since.toISOString(),
              locale,
            )
          : { next: async () => ({ rows: [], next: null }) }
      return trendingSource(client, since.toISOString(), locale)
    }
    return { next: async () => ({ rows: [], next: null }) }
  }, [
    client,
    user?.id,
    ready,
    revision,
    selected,
    days,
    locale,
    scope,
    location.busy,
    location.data,
    settings.busy,
    settings.data,
    destination,
  ])
  return (
    <section className="app-page mx-auto w-full max-w-2xl px-[var(--page-gutter,20px)] py-7 pb-20 md:px-[var(--page-gutter-md,28px)]">
      <h1 className="sr-only">{t('navigation.feed')}</h1>
      <div
        className={[
          'app-filters flex gap-[12px_24px] items-center [border-bottom:1px_solid_var(--color-tilly-border)] mb-8 text-[14px] flex-wrap',
          '[&_button]:min-h-11 [&_button]:[border-bottom:2px_solid_transparent] [&_button]:inline-flex [&_button]:items-center [&_button]:justify-center',
          '[&_a]:min-h-11 [&_a]:[border-bottom:2px_solid_transparent] [&_a]:inline-flex [&_a]:items-center [&_a]:justify-center',
          "[&_button[aria-pressed='true']]:[border-color:var(--color-tilly-accent)]",
          'max-[700px]:gap-4.5',
        ].join(' ')}
        role="group"
        aria-label={t('navigation.feed')}
      >
        <button
          aria-pressed={selected === 'following'}
          onClick={() => setMode('following')}
        >
          {t('feed.mode.following')}
        </button>
        <button
          aria-pressed={selected === 'trending'}
          onClick={() => setMode('trending')}
        >
          {t('feed.mode.trending')}
        </button>
      </div>
      {selected === 'following' && !user && (
        <div
          className={[
            'app-empty p-[64px_0]',
            '[&_h2]:[font:400_28px_Georgia,_serif] [&_h2]:mb-3',
            '[&_p]:text-[14px] [&_p]:leading-[1.6] [&_p]:[color:var(--color-tilly-text-secondary)]',
          ].join(' ')}
        >
          <SignInLink
            className={
              'app-primary min-h-11.5 mt-3 rounded-[6px] [background:var(--color-tilly-accent)] [color:var(--color-tilly-on-signal)] inline-flex place-items-center p-[10px_20px] text-[14px] items-center justify-center gap-2'
            }
          >
            {t('feed.signInFollowing')}
          </SignInLink>
        </div>
      )}
      {selected === 'trending' && (
        <div
          className={[
            'app-period flex items-center gap-4 mb-6 text-[14px] my-5 flex-wrap',
            '[&_select]:min-h-11 [&_select]:p-[8px_12px] [&_select]:[background:var(--color-tilly-surface)] [&_select]:[color:inherit] [&_select]:rounded-[6px]',
            '[&_>_button]:w-[auto] [&_>_button]:min-w-35',
            "[&_[role='combobox']]:min-h-11",
          ].join(' ')}
        >
          <Select
            value={scope}
            onValueChange={(value) => {
              if (value === 'travelling') setTravelling(true)
              else if (value === 'worldwide' || value === 'nearby')
                setScope(value)
            }}
          >
            <SelectTrigger aria-label={t('feed.placeLabel')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent
              className={[
                'tilly-select-content z-100 [background:var(--color-tilly-bg)] [color:var(--color-tilly-text)] [border:1px_solid_var(--color-tilly-border)] min-w-45 max-w-[calc(100vw_-_32px)] font-sans text-[14px] leading-[1.5]',
                '[&_[data-highlighted]]:[background:var(--color-tilly-surface)] [&_[data-highlighted]]:[color:var(--color-tilly-text)]',
                "[&_[role='option']]:min-h-11",
              ].join(' ')}
            >
              <SelectItem value="worldwide">{t('feed.worldwide')}</SelectItem>
              <SelectItem value="nearby">{t('feed.nearMe')}</SelectItem>
              <SelectItem value="travelling">{t('feed.travelling')}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger aria-label={t('feed.timePeriod')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent
              className={[
                'tilly-select-content z-100 [background:var(--color-tilly-bg)] [color:var(--color-tilly-text)] [border:1px_solid_var(--color-tilly-border)] min-w-45 max-w-[calc(100vw_-_32px)] font-sans text-[14px] leading-[1.5]',
                '[&_[data-highlighted]]:[background:var(--color-tilly-surface)] [&_[data-highlighted]]:[color:var(--color-tilly-text)]',
                "[&_[role='option']]:min-h-11",
              ].join(' ')}
            >
              <SelectItem value="1">{t('feed.period.today')}</SelectItem>
              <SelectItem value="7">{t('feed.period.week')}</SelectItem>
              <SelectItem value="30">{t('feed.period.month')}</SelectItem>
              <SelectItem value="all">{t('feed.period.all')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
      <PlacePicker
        open={travelling}
        onOpenChange={setTravelling}
        initial={destination ?? location.data}
        onChoose={(place) => {
          setDestination(place)
          setScope('travelling')
        }}
      />
      {selected === 'trending' && scope === 'travelling' && destination && (
        <button
          className={[
            'app-secondary min-h-11 p-[10px_18px] rounded-full [background:var(--color-tilly-surface)] inline-flex gap-2 items-center justify-center text-[14px]',
            'max-[700px]:[.profile-biography_>_&]:ml-[auto]',
          ].join(' ')}
          onClick={() => setTravelling(true)}
        >
          {t('feed.changePlace', {place: destination.name})}
        </button>
      )}
      {selected === 'trending' &&
        scope === 'nearby' &&
        !location.busy &&
        !location.data && (
          <p role="status">
            {t('feed.locationMissing')}{' '}
            <button onClick={location.reload}>{t('feed.retryLocation')}</button> {' '}{t('feed.chooseWorldwide')}
          </p>
        )}
      {page.error && (
        <p
          className={[
            'app-message text-[14px] leading-[1.6] [color:var(--color-tilly-text-secondary)] p-[24px_0]',
            '[&_button]:underline [&_button]:min-h-11',
          ].join(' ')}
          role="alert"
        >
          {page.error}{' '}
          <button
            onClick={() =>
              page.rows.length ? void page.more() : page.reload()
            }
          >
            {t('common.retry')}
          </button>
        </p>
      )}
      {!page.busy &&
        !(
          selected === 'trending' &&
          scope === 'nearby' &&
          (location.busy || !location.data)
        ) &&
        !page.error &&
        !page.rows.length &&
        (selected !== 'following' || !!user) && (
          <div
            className={[
              'app-empty p-[64px_0]',
              '[&_h2]:[font:400_28px_Georgia,_serif] [&_h2]:mb-3',
              '[&_p]:text-[14px] [&_p]:leading-[1.6] [&_p]:[color:var(--color-tilly-text-secondary)]',
            ].join(' ')}
          >
            <h2>
              {selected === 'following'
                ? t('feed.following.emptyTitle')
                : selected === 'trending'
                  ? t('feed.trending.emptyTitle')
                  : t('explore.none')}
            </h2>
            <p>
              {selected === 'following'
                ? t('feed.following.emptyBody')
                : selected === 'trending'
                  ? t(days === 'all' && scope === 'worldwide' ? 'feed.trending.emptyPublicBody' : 'feed.trending.emptyBody', {
                      period:
                        days === '1'
                          ? t("feed.phrase.today")
                          : days === '7'
                            ? t("feed.phrase.week")
                            : days === '30'
                              ? t("feed.phrase.month")
                              : t("web-app.allTime"),
                      place:
                        scope === 'nearby'
                          ? t("feed.place.nearMe")
                          : scope === 'travelling'
                            ? t("feed.place.travelling", {place:destination?.name ?? t("feed.webDestination")})
                            : t("web-app.worldwide"),
                    })
                  : t("web-app.catchesWillAppearHereAsTheCommunityFindsThem")}
            </p>
          </div>
        )}
      <EncounterGrid
        rows={page.rows}
        busy={page.busy}
        onChanged={page.reload}
      />
      {(page.busy ||
        (selected === 'trending' && scope === 'nearby' && location.busy)) && (
        <RoaringCat
          size={page.rows.length ? 44 : 96}
          compact={!!page.rows.length}
          label={t(
            selected === 'trending'
              ? 'feed.loading.trending'
              : 'feed.loading.following',
          )}
        />
      )}
      {page.next && (
        <button
          className={
            'app-more block min-h-11 p-[0_24px] m-[32px_auto_0] [border:1px_solid_var(--color-tilly-border)] rounded-[6px] text-[14px]'
          }
          onClick={() => {
            void page.more()
          }}
          disabled={page.busy}
        >
          {t("web-app.moreCatches")}</button>
      )}
    </section>
  )
}
