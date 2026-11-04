import { friendlyError } from '~/lib/failures'
import { useRouteContext } from '@tanstack/react-router'
import { localizedPath } from '~/lib/locale'
import { SignInLink } from './SignIn'
import { BillingControls } from './BillingControls'
import { NotificationPreferences } from './NotificationPreferences'
import { AppearancePreferences } from './Appearance'
import { DeleteAccount } from './DeleteAccount'
import { BlockedAccounts } from './SafetyMenu'
import { useAppCopy } from './copy'
import { RoaringCat } from '~/components/RoaringCat'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { collectPages } from './feed-sources'
import { ProfilePhoto } from './ProfilePhoto'
import { appImage } from './media'
import { useAppSession } from './session'
import { useResource } from './use-resource'
import { runAppOperation } from './operations'
import type { Profile } from '~/generated/foir.website.generated'
import { useProfileSaved } from './profile-setup'

export function ProfileForm({
  profile,
  onSaved,
  submitLabel,
}: {
  profile: Profile | null
  onSaved: () => void
  submitLabel?: string
}) {
  const t = useAppCopy()
  const profileSaved = useProfileSaved()
  const { client, user } = useAppSession()
  const [name, setName] = useState(profile?.displayName ?? ''),
    [username, setUsername] = useState(profile?.username ?? ''),
    [bio, setBio] = useState(profile?.bio ?? ''),
    [privacy, setPrivacy] = useState<'public' | 'private'>((profile?.privacy ?? 'public') === 'public' ? 'public' : 'private')
  const [photoFileId, setPhotoFileId] = useState<string | null>(null),
    [removePhoto, setRemovePhoto] = useState(false),
    [uploading, setUploading] = useState(false)
  const pending = useRef(false)
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [saved, setSaved] = useState(false)
  const normalized = username.trim().toLowerCase()
  const [checked, setChecked] = useState<{
    value: string
    state: 'checking' | 'available' | 'taken' | 'error'
  } | null>(null)
  const valid = /^[a-z0-9_]{2,30}$/.test(normalized)
  const unchanged = normalized === profile?.username
  useEffect(() => {
    if (!valid || unchanged) {
      setChecked(null)
      return
    }
    let active = true
    setChecked({ value: normalized, state: 'checking' })
    const timer = setTimeout(() => {
      void client.profile
        .findMany({
          first: 2,
          where: { username: { eq: normalized } },
          pick: ['_id', '_ownerId'],
        })
        .then((page) => {
          if (active)
            setChecked({
              value: normalized,
              state: page.edges.some((e) => e.node._ownerId !== user?.id)
                ? 'taken'
                : 'available',
            })
        })
        .catch(() => {
          if (active) setChecked({ value: normalized, state: 'error' })
        })
    }, 350)
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [client, user?.id, normalized, valid, unchanged])
  const usernameReady =
    valid &&
    (unchanged ||
      (checked?.value === normalized && checked.state === 'available'))
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (pending.current || uploading || !usernameReady) return
    pending.current = true
    setBusy(true)
    setError('')
    setSaved(false)
    try {
      await runAppOperation(client, 'execute.tilly.save-profile', {
        displayName: name.trim(),
        username: username.trim().toLowerCase(),
        bio,
        privacy,
        ...(photoFileId ? { photoFileId } : {}),
        removePhoto,
      })
      setSaved(true)
      profileSaved?.()
      onSaved()
    } catch (failure) {
      setError(
        friendlyError(failure, t),
      )
    } finally {
      pending.current = false
      setBusy(false)
    }
  }
  return (
    <form
      className={[
        'app-form max-w-[480px] grid gap-2.5',
        '[&_label]:mt-3.5 [&_label]:text-[14px]',
        '[&_input]:min-h-11.5 [&_input]:p-[10px_12px] [&_input]:[background:var(--color-tilly-surface)] [&_input]:[border:1px_solid_var(--color-tilly-border)] [&_input]:rounded-[8px] [&_input]:[font:16px_var(--font-sans)] [&_input]:[color:inherit]',
        '[&_textarea]:min-h-25 [&_textarea]:p-[10px_12px] [&_textarea]:[background:var(--color-tilly-surface)] [&_textarea]:[border:1px_solid_var(--color-tilly-border)] [&_textarea]:rounded-[8px] [&_textarea]:[font:16px_var(--font-sans)] [&_textarea]:[color:inherit]',
        '[&_select]:min-h-11.5 [&_select]:p-[10px_12px] [&_select]:[background:var(--color-tilly-surface)] [&_select]:[border:1px_solid_var(--color-tilly-border)] [&_select]:rounded-[8px] [&_select]:[font:16px_var(--font-sans)] [&_select]:[color:inherit]',
        '[&_p]:text-[13px] [&_p]:leading-[1.5] [&_p]:[color:var(--color-tilly-text-secondary)]',
        '[.catch-page_&]:mt-6',
        "[&_[role='combobox']]:min-h-11",
      ].join(' ')}
      onSubmit={(event) => {
        void submit(event)
      }}
    >
      <ProfilePhoto
        photo={appImage(profile?.photo)}
        disabled={busy}
        onBusy={setUploading}
        onChange={(id, remove) => {
          setPhotoFileId(id)
          setRemovePhoto(remove)
        }}
      />
      <label htmlFor="profile-name">{t('profile.displayName')}</label>
      <input
        id="profile-name"
        value={name}
        onChange={(event) => setName(event.target.value)}
        required
        maxLength={60}
        autoComplete="nickname"
      />
      <label htmlFor="profile-username">{t('profile.username')}</label>
      <input
        id="profile-username"
        value={username}
        onChange={(event) =>
          setUsername(event.target.value.toLowerCase().replace(/^@/, ''))
        }
        required
        pattern="[a-z0-9_]{2,30}"
        minLength={2}
        maxLength={30}
        autoCapitalize="none"
        aria-describedby="username-help username-status"
        aria-invalid={
          !unchanged &&
          checked?.value === normalized &&
          checked.state === 'taken'
        }
      />
      <p id="username-help">{t('profile.usernameHint')}</p>
      <p id="username-status" role="status" aria-live="polite">
        {!unchanged && valid
          ? checked?.value !== normalized || checked.state === 'checking'
            ? t('profile.usernameChecking')
            : checked.state === 'taken'
              ? t('profile.usernameTaken')
              : checked.state === 'error'
                ? t('profile.usernameFailed')
                : t('profile.usernameAvailable')
          : ''}
      </p>
      <label htmlFor="profile-bio">{t('profile.bio')}</label>
      <textarea
        id="profile-bio"
        value={bio}
        onChange={(event) => setBio(event.target.value)}
        maxLength={160}
      />
      {/* Public, or private: catches only for the followers you accept, and
          following you becomes a request. */}
      <label htmlFor="profile-privacy" className="flex min-h-11 items-center justify-between gap-4">
        <span className="font-medium">{t('profile.privacy.title')}</span>
        <input
          id="profile-privacy"
          type="checkbox"
          role="switch"
          className="size-5 accent-[var(--color-tilly-accent)]"
          checked={privacy === 'private'}
          onChange={(event) => setPrivacy(event.target.checked ? 'private' : 'public')}
        />
      </label>
      <p>{t(privacy === 'private' ? 'profile.privacy.private' : 'profile.privacy.public')} {t('profile.privacy.applies')}</p>
      {error && <p role="alert">{error}</p>}
      {saved && <p role="status">{t('profile.saved')}</p>}
      <button
        className={
          'app-primary min-h-11.5 mt-3 rounded-[6px] [background:var(--color-tilly-accent)] [color:var(--color-tilly-on-signal)] inline-flex place-items-center p-[10px_20px] text-[14px] items-center justify-center gap-2'
        }
        disabled={busy || uploading || !usernameReady}
      >
        {busy ? t('common.saving') : (submitLabel ?? t('profile.save'))}
      </button>
    </form>
  )
}
export function Account() {
  const { locale, locales } = useRouteContext({ from: '__root__' })
  const { client, user, ready, revision, accountDeleted } = useAppSession()
  const t = useAppCopy()
  const [saved, setSaved] = useState(false)
  const premium = useResource(
    async () =>
      user
        ? collectPages(async (after) => {
            const page = await client['premium-grant'].findManyMine({
              first: 100,
              after,
              pick: ['_id', 'until'],
            })
            return {
              rows: page.edges.map((edge) => edge.node),
              next: page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null,
            }
          })
        : [],
    [client, user?.id, revision],
  )
  const activeUntil = premium.data
    ?.map((grant) => grant.until)
    .filter(
      (until): until is string =>
        !!until &&
        Number.isFinite(Date.parse(until)) &&
        Date.parse(until) > Date.now(),
    )
    .sort()
    .at(-1)
  const profile = useResource(
    async () =>
      user
        ? ((
            await client.profile.findMany({
              first: 1,
              where: { ownerId: { eq: user.id } },
            })
          ).edges[0]?.node ?? null)
        : null,
    [client, user?.id, revision],
  )
  if (!ready)
    return (
      <section
        className={[
          'app-page w-full max-w-[var(--page-width,_1200px)] px-[var(--page-gutter,_20px)] mx-[auto] py-[var(--gap-lg,_40px)_80px]',
          'max-[700px]:pt-7',
          'min-[768px]:px-[var(--page-gutter-md,_28px)]',
        ].join(' ')}
      >
        <RoaringCat label={t('profile.loadingAccount')} />
      </section>
    )
  if (!user)
    return (
      <section
        className={[
          'app-page w-full max-w-[var(--page-width,_1200px)] px-[var(--page-gutter,_20px)] mx-[auto] py-[var(--gap-lg,_40px)_80px]',
          'max-[700px]:pt-7',
          'min-[768px]:px-[var(--page-gutter-md,_28px)]',
        ].join(' ')}
      >
        <h1>{t('profile.accountTitle')}</h1>
        {accountDeleted && <p role="status">{t('account-deletion.deleted')}</p>}
        <SignInLink
          className={[
            'app-secondary min-h-11 p-[10px_18px] rounded-full [background:var(--color-tilly-surface)] inline-flex gap-2 items-center justify-center text-[14px]',
            'max-[700px]:[.profile-biography_>_&]:ml-[auto]',
          ].join(' ')}
        >
          {t('common.signIn')}
        </SignInLink>
      </section>
    )
  return (
    <section
      className={[
        'app-page w-full max-w-[var(--page-width,_1200px)] px-[var(--page-gutter,_20px)] mx-[auto] py-[var(--gap-lg,_40px)_80px] account-page',
        'max-[700px]:pt-7',
        'min-[768px]:px-[var(--page-gutter-md,_28px)]',
      ].join(' ')}
    >
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
          <h1>{t('profile.accountTitle')}</h1>
          <p>{user.email}</p>
        </div>
      </div>
      {saved && <p role="status">{t('profile.saved')}</p>}
      {profile.busy ? (
        <RoaringCat label={t('profile.loadingProfile')} />
      ) : profile.error ? (
        <p role="alert">
          {profile.error} <button onClick={profile.reload}>{t('common.retry')}</button>
        </p>
      ) : (
        <ProfileForm
          key={profile.data?._id ?? 'new'}
          profile={profile.data}
          onSaved={() => {
            setSaved(true)
            profile.reload()
          }}
        />
      )}
      <NotificationPreferences key={`notifications:${user.id}`} />
      <AppearancePreferences key={`appearance:${user.id}`} />
      <section
        className={[
          'account-premium max-w-[480px] mt-12',
          '[&_h2]:text-[20px] [&_h2]:mb-3',
          '[&_p]:text-[15px] [&_p]:leading-[1.6] [&_p]:mb-3',
        ].join(' ')}
      >
        <h2>{t("premium.title")}</h2>
        <p>{t("web-app.catchArtInspiredByTheCatsYouMeetAnd")}</p>
        <p>
          {premium.busy
            ? t("web-app.checkingPremium")
            : activeUntil
              ? t("premium.webActiveUntil", {date:new Date(activeUntil).toLocaleDateString()})
              : premium.error
                ? t("web-app.premiumStatusCouldntLoad")
                : t("web-app.noActivePremiumGrant")}
        </p>
        {premium.error && (
          <button
            className={[
              'app-secondary min-h-11 p-[10px_18px] rounded-full [background:var(--color-tilly-surface)] inline-flex gap-2 items-center justify-center text-[14px]',
              'max-[700px]:[.profile-biography_>_&]:ml-[auto]',
            ].join(' ')}
            onClick={premium.reload}
          >
            {t('common.retry')}
          </button>
        )}
        <BillingControls premium={!!activeUntil} />
      </section>
      <BlockedAccounts key={`blocks:${user.id}`} />
      <div className="flex flex-wrap gap-6 my-8 [&_a]:inline-flex [&_a]:items-center [&_a]:min-h-11 [&_a]:underline">
        <a href={localizedPath('/terms', locale, locales)}>{t('premium.terms')}</a>
        <a href={localizedPath('/privacy', locale, locales)}>{t('premium.privacy')}</a>
      </div>
      <SignOut />
      <DeleteAccount key={`deletion:${user.id}`} />
    </section>
  )
}

/** Sign out of this browser; the profile menu now opens the user's page. */
function SignOut() {
  const { logout } = useAppSession(), t = useAppCopy()
  const [failed, setFailed] = useState(false)
  return <div className="mb-6 grid max-w-[480px] gap-2">
    <button type="button" className="app-secondary min-h-11 rounded-full [background:var(--color-tilly-surface)] px-5 py-2 text-[14px]"
      onClick={() => { setFailed(false); void logout().catch(() => setFailed(true)) }}>{t("profile.signOut")}</button>
    {failed && <p role="status" className="text-sm">{t("navigation.signOutCouldntCompletePleaseTryAgain")}</p>}
  </div>
}
