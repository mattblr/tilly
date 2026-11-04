import { useAppCopy } from './copy'
import { useEffect } from 'react'
import { Link } from '@tanstack/react-router'
import { RoaringCat } from '~/components/RoaringCat'
import { useAppSession } from './session'

/** Compatibility route for old bookmarks; navigation links go straight to hosted auth. */
export function SignIn() {
  const t = useAppCopy()
  const { user, ready, signInUrl, notice } = useAppSession()
  useEffect(() => {
    if (ready && !user && signInUrl && !notice)
      window.location.replace(signInUrl)
  }, [ready, user, signInUrl, notice])
  if (notice)
    return (
      <section
        className={[
          'app-page w-full max-w-[var(--page-width,_1200px)] px-[var(--page-gutter,_20px)] mx-[auto] py-[var(--gap-lg,_40px)_80px]',
          'max-[700px]:pt-7',
          'min-[768px]:px-[var(--page-gutter-md,_28px)]',
        ].join(' ')}
      >
        <p role="alert">{notice.kind === 'refused' ? t('errors.signIn') : notice.message}</p>
        {signInUrl && (
          <a
            className={
              'app-primary min-h-11.5 mt-3 rounded-[6px] [background:var(--color-tilly-accent)] [color:var(--color-tilly-on-signal)] inline-flex place-items-center p-[10px_20px] text-[14px] items-center justify-center gap-2'
            }
            href={signInUrl}
          >
            {t("sign-in.trySignInAgain")}</a>
        )}
      </section>
    )
  if (user)
    return (
      <section
        className={[
          'app-page w-full max-w-[var(--page-width,_1200px)] px-[var(--page-gutter,_20px)] mx-[auto] py-[var(--gap-lg,_40px)_80px]',
          'max-[700px]:pt-7',
          'min-[768px]:px-[var(--page-gutter-md,_28px)]',
        ].join(' ')}
      >
        <Link to="/feed">{t("sign-in.openTheFeed")}</Link>
      </section>
    )
  return (
    <section
      className={[
        'app-page w-full max-w-[var(--page-width,_1200px)] px-[var(--page-gutter,_20px)] mx-[auto] py-[var(--gap-lg,_40px)_80px]',
        'max-[700px]:pt-7',
        'min-[768px]:px-[var(--page-gutter-md,_28px)]',
      ].join(' ')}
    >
      {signInUrl || !ready ? (
        <RoaringCat label={t("sign-in.openingSignIn")} />
      ) : (
        <p role="status">{t("sign-in.signInIsUnavailablePleaseTryAgainLater")}</p>
      )}
    </section>
  )
}

export function SignInLink({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  const { signInUrl } = useAppSession()
  return (
    <a href={signInUrl ?? '/sign-in'} className={className}>
      {children}
    </a>
  )
}
