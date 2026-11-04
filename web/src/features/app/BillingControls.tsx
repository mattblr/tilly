import { useAppCopy } from '~/features/app/copy'
import { friendlyError } from '~/lib/failures'
import { useRef, useState } from 'react'
import { startWebBilling } from './billing'
import { useAppSession } from './session'
export function BillingControls({ premium }: { premium: boolean }) {
  const t = useAppCopy()
  const { client, user } = useAppSession(),
    pending = useRef(false),
    keys = useRef<Partial<Record<'checkout' | 'portal', string>>>({})
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('')
  async function open(kind: 'checkout' | 'portal') {
    if (!user || pending.current) return
    pending.current = true
    setBusy(true)
    setError('')
    const key = keys.current[kind] ?? crypto.randomUUID()
    keys.current[kind] = key
    try {
      window.location.assign(await startWebBilling(client, kind, user.id, key))
    } catch (failure) {
      setError(
        friendlyError(failure),
      )
    } finally {
      pending.current = false
      setBusy(false)
    }
  }
  return (
    <div
      className={[
        'billing-controls flex flex-col items-start gap-4',
        '[&_>_p]:m-0',
      ].join(' ')}
    >
      {!premium && (
        <button
          className={
            'app-primary min-h-11.5 mt-3 rounded-[6px] [background:var(--color-tilly-accent)] [color:var(--color-tilly-on-signal)] inline-flex place-items-center p-[10px_20px] text-[14px] items-center justify-center gap-2'
          }
          disabled={busy}
          onClick={() => void open('checkout')}
        >
          {t("premium.seeSubscriptionOptions")}</button>
      )}
      <button
        className={[
          'app-secondary min-h-11 p-[10px_18px] rounded-full [background:var(--color-tilly-surface)] inline-flex gap-2 items-center justify-center text-[14px]',
          'max-[700px]:[.profile-biography_>_&]:ml-[auto]',
        ].join(' ')}
        disabled={busy}
        onClick={() => void open('portal')}
      >
        {t("account-deletion.webSubscriptions")}</button>
      <p>
        {t("premium.appleSubscriptionsAreManagedInYourAppleAccountReturning")}</p>
      {error && <p role="alert">{error}</p>}
    </div>
  )
}
