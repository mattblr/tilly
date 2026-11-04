import { useAppCopy } from './copy'
import { useNavigate } from '@tanstack/react-router'
import { ProfileForm } from './Account'
import { useAppSession } from './session'
import { useResource } from './use-resource'
import { SignIn } from './SignIn'
import { RoaringCat } from '~/components/RoaringCat'
import { useEffect } from 'react'

/** One shared user profile: existing native profiles need no second setup. */
export function Onboarding() {
  const t = useAppCopy()
  const { client, user, ready } = useAppSession()
  const navigate = useNavigate()
  const profile = useResource(
    async () =>
      user
        ? ((await client.profile.findManyMine({ first: 1 })).edges[0]?.node ??
          null)
        : null,
    [client, user?.id],
  )
  useEffect(() => {
    if (user && profile.data?._ownerId === user.id && profile.data.username)
      void navigate({ to: '/feed', replace: true })
  }, [user?.id, profile.data, navigate])
  if (!ready || profile.busy)
    return <RoaringCat label={t('profile.loadingProfile')} />
  if (!user) return <SignIn />
  return (
    <section className="mx-auto grid w-full max-w-xl gap-5 px-[var(--page-gutter,20px)] py-10 font-sans">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">
          {t('profile.welcome')}
        </h1>
        <p className="mt-3 text-tilly-text-secondary">
          {t('profile.onboardingHint')}
        </p>
      </header>
      {profile.error ? (
        <p role="alert">
          {profile.error}{' '}
          <button type="button" onClick={profile.reload}>
            {t('common.retry')}
          </button>
        </p>
      ) : (
        <ProfileForm
          key={user.id}
          profile={profile.data}
          submitLabel={t('profile.startExploring')}
          onSaved={() => {
            void navigate({ to: '/feed', replace: true })
          }}
        />
      )}
    </section>
  )
}
