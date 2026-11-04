import { ChallengeTrophy } from './ChallengeViews'
import { ProfileStats } from './ProfileStats'
import { Lock, Settings } from 'lucide-react'
import { relationTo } from './follows'
import {AppearanceSuggestion} from './Appearance'
import { OwnerStreak } from './OwnerStreak'
import { countTaggedCatPhotos } from './captures'
import { collectPages } from './feed-sources'
import { mergedSource } from './paging'
import { useState } from 'react'
import { RoaringCat } from '~/components/RoaringCat'
import { Link } from '@tanstack/react-router'
import { readFeed } from './data'
import { EncounterGrid } from './Feed'
import { useAppSession } from './session'
import { useResource } from './use-resource'
import { FollowButton } from './Actions'
import { appImage } from './media'
import { useAppCopy } from './copy'
import { usePages } from './use-pages'
import { cursorSource } from './paging'
import { CatStory } from './CatStory'
import { ProfileAvatar } from './ProfileAvatar'
import { SafetyMenu } from './SafetyMenu'
import { viewerBlocks } from './safety-data'
const validId = (id: string) => /^[a-z0-9]{10,40}$/.test(id)

function Story({
  cat,
  owner,
  onChanged,
  lane = 'catches',
}: {
  lane?: 'catches' | 'likes' | 'reposts'
  cat?: string
  owner?: string
  onChanged?: () => void
}) {
  const t = useAppCopy()
  const { client, user, revision, locale } = useAppSession()
  const page = usePages(async () => {
    if (owner && lane === 'likes') {
      const keys = await collectPages(async (after) => {
        const page = await client['capture-like'].findMany({
          first: 100,
          after,
          where: { ownerId: { eq: owner } },
          orderBy: [{ createdAt: 'DESC' }],
          pick: ['_id', 'photoKey'],
        })
        return {
          rows: page.edges.flatMap((e) =>
            e.node.photoKey ? [e.node.photoKey] : [],
          ),
          next: page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null,
        }
      })
      return mergedSource(
        Array.from(
          { length: Math.ceil(keys.length / 100) },
          (_, i) => (after?: string) =>
            readFeed(client, {
              after,
              locale,
              visible: !!user,
              originals: true,
              where: { photoKey: { in: keys.slice(i * 100, (i + 1) * 100) } },
            }),
        ),
      )
    }
    return cursorSource((after) =>
      readFeed(client, {
        cat,
        owner,
        locale,
        after,
        originals: !!cat || lane === 'catches',
        ...(lane === 'reposts'
          ? { where: { reshareOf: { isNull: false } } }
          : {}),
        visible: !!user,
      }),
    )
  }, [client, user?.id, revision, cat, owner, locale, lane])
  return (
    <>
      <EncounterGrid
        layout="profile"
        rows={page.rows}
        busy={page.busy}
        onChanged={() => { page.reload(); onChanged?.() }}
      />
      {!page.busy && !page.error && !page.rows.length && (
        <p>{t("web-app.noReadableCatchesYet")}</p>
      )}
      {page.busy && (
        <RoaringCat label={t("cat.loadingCatches")} compact={!!page.rows.length} />
      )}
      {page.error && (
        <p role="alert">
          {page.error}{' '}
          <button
            onClick={() =>
              page.rows.length ? void page.more() : page.reload()
            }
          >
            {t("common.retry")}</button>
        </p>
      )}
      {page.next && (
        <button
          className={
            'app-more block min-h-11 p-[0_24px] m-[32px_auto_0] [border:1px_solid_var(--color-tilly-border)] rounded-[6px] text-[14px]'
          }
          disabled={page.busy}
          onClick={() => {
            void page.more()
          }}
        >
          {t("web-app.moreCatches")}</button>
      )}
    </>
  )
}
export function CatDetail({ id }: { id: string }) {
  const { client, user, revision, locale } = useAppSession(),
    t = useAppCopy()
  const resource = useResource(async () => {
    if (!validId(id)) return null
    const [cat, count] = await Promise.all([
      client.cat.findUnique({ id, locale }),
      countTaggedCatPhotos(client, id),
    ])
    return cat ? { cat, count } : null
  }, [client, id, user?.id, revision, locale])
  return (
    <section
      className={[
        'app-page w-full max-w-[var(--page-width,_1200px)] px-[var(--page-gutter,_20px)] mx-auto pt-0 pb-20 cat-detail-page',
        'min-[768px]:px-[var(--page-gutter-md,_28px)]',
      ].join(' ')}
    >
      {resource.busy ? (
        <RoaringCat label={t("web-app.loadingCat")} />
      ) : resource.error ? (
        <p role="alert">
          {resource.error} <button onClick={resource.reload}>{t("common.retry")}</button>
        </p>
      ) : !resource.data ? (
        <h1>{t("web-app.catNotFound")}</h1>
      ) : (
        <CatStory key={id} catId={id} name={resource.data.cat.name ?? t('cat.unnamed')}>
          <div
            className={[
              'app-heading flex items-center justify-between gap-6 mb-8',
              '[&_h1]:[font:600_27px/1.2_var(--font-sans)] [&_h1]:tracking-[-0.035em] [&_h1]:m-[0_0_10px]',
              '[&_p]:[color:var(--color-tilly-text-secondary)] [&_p]:text-[14px]',
              '[&_>_a]:text-[14px] [&_>_a]:min-h-11 [&_>_a]:flex [&_>_a]:items-center [&_>_a]:gap-1.5',
              'max-[700px]:items-start max-[700px]:gap-4',
              'max-[700px]:[&_>_a]:max-w-[100px] max-[700px]:[&_>_a]:text-right',
            ].join(' ')}
          >
            <div>
              <h1>{resource.data.cat.name}</h1>
              <p>{resource.data.count} {t("web-app.catchesApproximateSightings")}</p>
            </div>
            <FollowButton catId={id} />
          </div>
          <AppearanceSuggestion catId={id} />
          <h2
            className={
              'app-section-title [font:600_20px/1.2_var(--font-sans)] m-[32px_0_12px]'
            }
          >
            {t('cat.story.title', { name: resource.data.cat.name ?? t('cat.unnamed') })}
          </h2>
          <p
            className={
              'app-section-intro mb-6 text-[15px] [color:var(--color-tilly-text-secondary)]'
            }
          >
            {t('cat.story.subtitle')}
          </p>
        </CatStory>
      )}
    </section>
  )
}
export function ProfileDetail({ id }: { id: string }) {
  const [lane, setLane] = useState<'catches' | 'likes' | 'reposts'>('catches')
  const { client, user, revision, locale, blockedIds, blockUser } = useAppSession()
  const t = useAppCopy()
  const [blockError, setBlockError] = useState(false)
  const resource = useResource(async () => {
    if (!validId(id)) return null
    if ((await viewerBlocks(client)).has(id)) return null
    const [profiles, relation] = await Promise.all([
      client.profile.findMany({
        first: 1,
        where: { ownerId: { eq: id } },
        pick: ['_id', 'displayName', 'username', 'bio', 'photo', 'privacy'],
      }),
      user && user.id !== id ? relationTo(client, user.id, id) : Promise.resolve('following' as const),
    ])
    const profile = profiles.edges[0]?.node
    // A private user's page is who they are and their counts, until the
    // viewer is an accepted follower.
    return profile ? { profile, locked: (profile.privacy ?? 'public') !== 'public' && relation !== 'following' } : null
  }, [client, id, user?.id, revision, locale])
  if (blockedIds.has(id)) return <section className="mx-auto grid w-full max-w-xl gap-5 px-5 py-10">
    <h1>{t('safety.blockedTitle')}</h1><button type="button" onClick={() => { setBlockError(false); void blockUser(id, false).catch(() => setBlockError(true)) }}>{t('safety.unblock')}</button>
    {blockError && <p role="alert">{t('safety.failed')}</p>}
  </section>
  return (
    <section className="app-page mx-auto w-full max-w-5xl px-[var(--page-gutter,20px)] py-8 pb-20 md:px-[var(--page-gutter-md,28px)]">
      {resource.busy ? (
        <RoaringCat label={t("web-app.loadingProfile")} />
      ) : resource.error ? (
        <p role="alert">
          {resource.error} <button onClick={resource.reload}>{t("common.retry")}</button>
        </p>
      ) : !resource.data ? (
        <h1>{t("web-app.profileNotFound")}</h1>
      ) : (
        <>
          <div
            className={[
              'profile-biography mb-8 grid grid-cols-[96px_minmax(0,1fr)] items-start gap-x-5 gap-y-4',
              '[&_h1]:mb-2 [&_h1]:break-words [&_h1]:text-2xl [&_h1]:font-semibold',
              '[&_p]:mt-1 [&_p]:break-words [&_p]:text-sm [&_p]:leading-relaxed [&_p]:text-tilly-text-secondary',
              'md:grid-cols-[96px_minmax(0,1fr)_auto]',
            ].join(' ')}
          >
            <ProfileAvatar
              photo={appImage(resource.data.profile.photo)}
              seed={id}
              size={96}
            />
            <div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <h1>
                  {resource.data.profile.displayName ||
                    resource.data.profile.username}
                </h1>
                {user?.id === id && <><OwnerStreak key={id} ownerId={id} /><ChallengeTrophy key={`challenges:${id}`} /></>}
              </div>
              <p>@{resource.data.profile.username}</p>
              <SafetyMenu targetType="profile" targetId={resource.data.profile._id} ownerId={id} />
              <p>{resource.data.profile.bio}</p>
            </div>
            {user?.id === id ? (
              <Link
                to="/account"
                aria-label={t("profile.settings")}
                title={t("profile.settings")}
                className="col-start-2 grid size-11 place-items-center rounded-full bg-tilly-surface md:col-start-auto"
              >
                <Settings aria-hidden="true" size={20} /></Link>
            ) : (
              <div className="col-start-2 w-fit md:col-start-auto">
                <FollowButton userId={id} onChanged={resource.reload} />
              </div>
            )}
          </div>
          {/* Fóir gap (docs/known-gaps.md): no counts on a private page you don't follow, until an operation can keep counts on both profiles. */}
          {user && !resource.data.locked && <ProfileStats key={`stats:${id}`} ownerId={id} />}
          {resource.data.locked ? (
            <div className="grid max-w-md gap-1 rounded-2xl bg-tilly-surface p-5">
              <h2 className="flex items-center gap-2 font-semibold"><Lock size={16} aria-hidden="true" />{t('profile.private.title')}</h2>
              <p className="text-sm text-tilly-text-secondary">{t('profile.private.body', { name: resource.data.profile.displayName || resource.data.profile.username || '' })}</p>
            </div>
          ) : <>
          <div
            className={[
              'mb-8 grid grid-cols-3 border-b border-[var(--color-tilly-border)] text-sm',
              '[&_button]:min-h-11 [&_button]:border-b-2 [&_button]:border-transparent',
              '[&_button[aria-pressed=true]]:border-tilly-accent [&_button[aria-pressed=true]]:text-tilly-text',
            ].join(' ')}
            role="group"
            aria-label={t("web-app.profileActivity")}
          >
            {(['catches', 'likes', 'reposts'] as const).map((value) => (
              <button
                key={value}
                aria-pressed={lane === value}
                onClick={() => setLane(value)}
              >
                {value[0].toUpperCase() + value.slice(1)}
              </button>
            ))}
          </div>
          <Story key={`${id}:${lane}`} owner={id} lane={lane} />
          </>}
        </>
      )}
    </section>
  )
}
