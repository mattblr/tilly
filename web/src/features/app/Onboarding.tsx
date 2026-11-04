import { useAppCopy } from './copy'
import { useNavigate } from '@tanstack/react-router'
import { ProfileForm } from './Account'
import { useAppSession } from './session'
import { useResource } from './use-resource'
import { SignIn } from './SignIn'
import { RoaringCat } from '~/components/RoaringCat'
import { useCallback, useEffect, useState } from 'react'
import { AppearanceChoice } from './Appearance'

/** One shared user profile: existing native profiles need no second setup. */
export function Onboarding() {
  const t = useAppCopy()
  const { client, user, ready } = useAppSession()
  const navigate = useNavigate()
  // Set up a profile first, then answer the breed-suggestion question once.
  const [step, setStep] = useState<'profile' | 'appearance'>('profile')
  const finish = useCallback(() => void navigate({ to: '/feed', replace: true }), [navigate])
  const profile = useResource(
    async () =>
      user
        ? ((await client.profile.findManyMine({ first: 1 })).edges[0]?.node ??
          null)
        : null,
    [client, user?.id],
  )
  useEffect(() => {
    if (step === 'profile' && user && profile.data?._ownerId === user.id && profile.data.username)
      void navigate({ to: '/feed', replace: true })
  }, [step, user?.id, profile.data, navigate])
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
      {step === 'appearance' ? (
        <AppearanceChoice onDone={finish} />
      ) : profile.error ? (
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
          onSaved={() => setStep('appearance')}
        />
      )}
    </section>
  )
}
