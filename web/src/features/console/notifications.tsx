import { useAppCopy } from '~/features/app/copy'
import { friendlyError } from '~/lib/failures'
import { useEffect, useRef, useState } from 'react'
import defaults from '../../../../ios/Tilly/Resources/Copy.json'
import { ask } from './api'
import { Area, Choice, Confirm, TextField, useLoad, stateLabel } from './shared'
import { Button } from './components/ui/button'

type Execution = { id: string; status: string; error?: string | null; result?: { ok?: boolean; eligible?: number; dryRun?: boolean } }
export function Notifications() {
  const words = useAppCopy()
  const copy = useLoad(async () => (await ask<{ uiCopy: { entries: { key: string; value: string }[] } | null }>(`query { uiCopy(naturalKey: "notifications") { entries { key value } } }`)).uiCopy)
  const t = (key: string, values: Record<string, string> = {}) => (copy.data?.entries.find(e => e?.key === key)?.value || (defaults.notifications as Record<string, string>)[key] || key).replace(/\{([^}]+)\}/g, (all, name: string) => values[name] ?? all)
  const [title, setTitle] = useState(''), [body, setBody] = useState(''), [destination, setDestination] = useState('feed'), [minimum, setMinimum] = useState('0')
  const [key, setKey] = useState(() => crypto.randomUUID()), [busy, setBusy] = useState(false), [failure, setFailure] = useState(''), [preview, setPreview] = useState<number | null>(null)
  const [execution, setExecution] = useState<Execution | null>(null), [sent, setSent] = useState(false)
  const generation = useRef(0)
  const signature = JSON.stringify([title, body, destination, minimum])
  useEffect(() => { generation.current++; setPreview(null); setExecution(null); setSent(false); setBusy(false); setKey(crypto.randomUUID()) }, [signature])
  useEffect(() => {
    if (!execution) return
    if (execution.error || ['FAILED', 'CANCELLED', 'TIMED_OUT'].includes(execution.status.toUpperCase())) { setFailure(friendlyError(execution.error, key => words(key))); setBusy(false) }
    if (execution.status.toUpperCase() === 'COMPLETED') {
      setBusy(false)
      if (execution.result?.ok !== true || typeof execution.result.eligible !== 'number') setFailure(t('failed'))
      else if (execution.result.dryRun) setPreview(execution.result.eligible)
      else { setSent(true); setPreview(null) }
    }
  }, [execution])
  useEffect(() => {
    if (!execution || ['COMPLETED', 'FAILED', 'CANCELLED', 'TIMED_OUT'].includes(execution.status.toUpperCase())) return
    let active = true
    const started = Date.now()
    const timer = setInterval(() => {
      if (Date.now() - started > 300_000) { clearInterval(timer); if (active) { setBusy(false); setFailure(t('console.pending')) }; return }
      void ask<{ operationExecution: Execution | null }>(`query E($id: String!) { operationExecution(id: $id) { id status error result } }`, { id: execution.id })
        .then(({ operationExecution: result }) => {
          if (!active || !result) return
          setExecution(result)
        }).catch(error => { if (active) { setFailure(friendlyError(error, key => words(key))); setBusy(false) } })
    }, 1500)
    return () => { active = false; clearInterval(timer) }
  }, [execution?.id, execution?.status])
  async function start(dryRun: boolean) {
    const current = generation.current
    setBusy(true); setFailure(''); setSent(false)
    try {
      const result = await ask<{ executeNotificationCampaign: { execution: Execution; result: Execution['result'] } }>(`mutation N($input: NotificationCampaignInput!, $key: String) {
        executeNotificationCampaign(input: $input, mode: ASYNC, idempotencyKey: $key) { execution { id status error result } }
      }`, { input: { title, message: body, destination, minimumStreak: Number(minimum), dryRun, campaignKey: key }, key: `${dryRun ? 'preview' : 'send'}:${key}` })
      if (generation.current !== current) return
      if (!result.executeNotificationCampaign?.execution?.id || result.executeNotificationCampaign.execution.error) throw new Error(result.executeNotificationCampaign?.execution?.error || t('failed'))
      setExecution(result.executeNotificationCampaign.execution)
    } catch (error) { if (generation.current === current) { setFailure(friendlyError(error, key => words(key))); setBusy(false) } }
  }
  return <section className="max-w-[640px]">
    <p className="mb-6 text-sm text-muted-foreground">{t('console.hint')}</p>
    <fieldset disabled={busy} className="grid gap-5">
      <TextField label={t('console.subject')} value={title} onChange={setTitle} />
      <Area label={t('console.message')} value={body} onChange={setBody} />
      <div className="grid gap-5 sm:grid-cols-2">
        <Choice label={t('console.destination')} value={destination} onChange={setDestination} options={['feed', 'capture', 'account'].map(value => ({ value, label: t(`console.${value}`) }))} />
        <Choice label={t('console.minimum')} value={minimum} onChange={setMinimum} options={[0, 1, 7, 14].map(value => ({ value: String(value), label: value ? `${value}+` : t('console.all') }))} />
      </div>
      <Button onClick={() => void start(true)} disabled={!title.trim() || !body.trim() || title.length > 100 || body.length > 500}>{t(busy ? 'console.working' : 'console.preview')}</Button>
    </fieldset>
    {preview !== null && <div className="mt-6 flex flex-wrap items-center justify-between gap-4 bg-muted p-5 rounded-lg">
      <p role="status">{t('console.count', { count: String(preview) })}</p>
      {preview > 0 && <Confirm title={t('console.confirm')} description={t('console.confirmBody')} actionLabel={t('console.send')} busyLabel={t('console.working')} work={async () => { await start(false) }}><Button disabled={busy}>{t('console.send')}</Button></Confirm>}
    </div>}
    {execution && <p className="mt-4 break-all text-sm text-muted-foreground">{t('console.history')}: {execution.id} · {stateLabel(execution.status, words)}</p>}
    {failure && <p className="mt-4 text-sm text-destructive" role="alert">{failure}</p>}
    {sent && <p className="mt-4 text-sm" role="status">{t('console.sent')}</p>}
  </section>
}
