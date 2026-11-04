import { Button } from '~/components/ui/button'
import { useRouter, type ErrorComponentProps } from '@tanstack/react-router'
import { useAppCopy } from '~/features/app/copy'
import { friendlyError } from '~/lib/failures'

/** Async actions keep their own inline errors. This handles route/load/render failures. */
export function FailureBoundary({ error, reset }: ErrorComponentProps) {
  const t = useAppCopy(), router = useRouter()
  return (
    <main className="flex min-h-dvh items-center justify-center px-[var(--page-gutter,_20px)] py-6 font-sans">
      <section className="grid w-full max-w-md gap-4" role="alert" aria-labelledby="failure-title">
        <h1 id="failure-title" className="text-xl font-semibold">{t('errors.title')}</h1>
        <p>{friendlyError(error, t)}</p>
        <Button variant="outline" className="min-h-11" onClick={() => { reset(); void router.invalidate() }}>{t('errors.retry')}</Button>
        <p className="text-sm">{t('errors.reloadHint')}</p>
        <Button variant="outline" className="min-h-11" onClick={() => window.location.reload()}>{t('errors.reload')}</Button>
      </section>
    </main>
  )
}
