import { useAppCopy } from '~/features/app/copy'
import { useEffect, useRef, useState } from 'react'
import { ask, page } from './api'
import { Button } from './components/ui/button'
import { Area, Confirm, useLoad } from './shared'
import { Tabs, TabsList, TabsTrigger } from './components/ui/tabs'

type Kind = 'report' | 'check' | 'hold'
type Entry = { _id: string; targetType: string; targetId: string; status: string; reason?: string; details?: string; text?: string; categories?: unknown }
type Preview = { text: string; author: string; photoUrl: string }
type Execution = { id: string; status: string; error: string | null; result: { ok?: boolean; preview?: Preview } | null }
function useWords() {
  const copy=useAppCopy()
  return (key:string)=>copy(`safety.${key}`)
}

/** The placement session supplies every read and execute. This page holds no
 * provider key, operator bearer outside the handshake, or broader data proxy. */
export function Review() {
  const [kind, setKind] = useState<Kind>('report'), t = useWords()
  return <section className="grid gap-5">
    <p className="max-w-2xl text-sm text-muted-foreground">{t('reviewHint')}</p>
    <Tabs value={kind} onValueChange={value => setKind(value as Kind)}><TabsList>
      <TabsTrigger value="report">{t('reports')}</TabsTrigger><TabsTrigger value="check">{t('checks')}</TabsTrigger><TabsTrigger value="hold">{t('holds')}</TabsTrigger>
    </TabsList></Tabs>
    <ReviewQueue key={kind} kind={kind} t={t} />
  </section>
}
function ReviewQueue({ kind, t }: { kind: Kind; t: (key: string) => string }) {
  const [entries, setEntries] = useState<Entry[]>([]), [after, setAfter] = useState<string | null>(null), [selected, setSelected] = useState<Entry | null>(null)
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [preview, setPreview] = useState<Preview | null>(null), [reason, setReason] = useState(''), [notice, setNotice] = useState('')
  const [execution, setExecution] = useState<Execution | null>(null), [action, setAction] = useState('')
  const generation = useRef(0), locked = useRef(false)
  const queue = kind === 'report' ? 'report' : 'check'
  async function load(cursor: string | null = null) {
    if (locked.current) return
    setBusy(true); setError('')
    try {
      const query = kind === 'report' ? '{ status: { eq: "open" } }' : kind === 'hold' ? '{ status: { eq: "hidden" } }' : '{ status: { in: ["flagged", "error"] } }'
      const result = await page<Entry>(kind === 'report' ? 'contentReports' : 'moderationCases',
        `_id targetType targetId status ${kind === 'report' ? 'reason details' : 'text categories'}`, cursor, 20, `where: ${query}, orderBy: [{ createdAt: DESC }], `)
      setEntries(old => cursor ? [...old, ...result.rows.filter(row => !old.some(prior => prior._id === row._id))] : result.rows)
      setAfter(result.after)
    } catch { setError(t('failed')) }
    finally { setBusy(false) }
  }
  useEffect(() => { void load(); return () => { generation.current++ } }, [])
  async function run(entry: Entry, next: string) {
    if (locked.current) return
    locked.current = true; const current = ++generation.current
    setBusy(true); setError(''); setNotice(''); setAction(next)
    if (next === 'preview') { setSelected(entry); setPreview(null); setReason('') }
    try {
      const reply = await ask<{ executeReviewContent: { execution: Execution } }>(`mutation Review($input: ReviewContentInput!, $key: String) {
        executeReviewContent(input: $input, mode: ASYNC, idempotencyKey: $key) { execution { id status error result } }
      }`, { input: { queue, id: entry._id, action: next, reason: next === 'preview' ? '' : reason }, key: `review-${crypto.randomUUID()}` })
      if (current !== generation.current) return
      if (!reply.executeReviewContent?.execution?.id) throw Error('No review execution')
      setExecution(reply.executeReviewContent.execution)
    } catch { if (current === generation.current) { locked.current = false; setBusy(false); setError(t('failed')) } }
  }
  useEffect(() => {
    if (!execution) return
    const state = execution.status.toUpperCase()
    if (!['COMPLETED', 'FAILED', 'CANCELLED', 'TIMED_OUT'].includes(state)) return
    locked.current = false; setBusy(false)
    if (state !== 'COMPLETED' || execution.result?.ok !== true) { setError(t('failed')); return }
    if (action === 'preview') setPreview(execution.result.preview ?? null)
    else { setNotice(t('saved')); setSelected(null); setPreview(null); void load() }
  }, [execution])
  useEffect(() => {
    if (!execution || ['COMPLETED', 'FAILED', 'CANCELLED', 'TIMED_OUT'].includes(execution.status.toUpperCase())) return
    let active = true; const current = generation.current, start = Date.now()
    const timer = setInterval(() => {
      if (Date.now() - start > 300000) { clearInterval(timer); if (active) { setError(t('failed')); setBusy(false); locked.current = false } return }
      void ask<{ operationExecution: Execution | null }>('query ReviewRun($id: String!) { operationExecution(id: $id) { id status error result } }', { id: execution.id })
        .then(reply => { if (active && current === generation.current && reply.operationExecution) setExecution(reply.operationExecution) })
        .catch(() => { if (active) setError(t('failed')) })
    }, 1200)
    return () => { active = false; clearInterval(timer) }
  }, [execution?.id, execution?.status])
  return <>
    {notice && <p role="status">{notice}</p>}{error && <p role="alert">{error} <button type="button" onClick={() => void load()}>{t('retry')}</button></p>}
    {/* Both columns share the shell's gutter; the detail stacks after the queue on phones. */}
    <div className="grid min-w-0 items-start gap-6 lg:grid-cols-[minmax(240px,1fr)_minmax(0,2fr)]">
      <div className="grid gap-1">
        {!entries.length && !busy && !error && <p className="py-8 text-muted-foreground">{t('empty')}</p>}
        {entries.map(entry => <button key={entry._id} type="button" disabled={busy} aria-pressed={selected?._id === entry._id}
          className="min-h-16 rounded-md px-4 py-3 text-left hover:bg-muted aria-pressed:bg-muted disabled:cursor-default focus-visible:outline-2 focus-visible:outline-ring"
          onClick={() => void run(entry, 'preview')}><strong className="block text-sm font-medium">{kind === 'report' ? t(entry.reason ?? 'other') : t(entry.status === 'hidden' ? 'holds' : 'checks')}</strong>
          <span className="mt-1 block line-clamp-2 break-words text-sm text-muted-foreground">{entry.details || entry.text || t('target.'+(['post','note','profile','CapturePost','FieldNote','Profile','CapturePhoto','CatPhoto','input'].includes(entry.targetType)?entry.targetType:'unknown'))}</span></button>)}
        {after && <Button variant="outline" disabled={busy} onClick={() => void load(after)}>{t('loadMore')}</Button>}
      </div>
      <div className="grid min-w-0 gap-4">
        {busy && <p role="status">{t('loading')}</p>}
        {selected && preview && <>
          {preview.author && <h2 className="text-base font-medium">{preview.author}</h2>}
          {preview.photoUrl && <img className="max-h-[440px] w-full rounded-lg bg-muted object-contain" src={preview.photoUrl} alt="" />}
          {preview.text && <p className="whitespace-pre-wrap break-words">{preview.text}</p>}
          {selected.details && <p className="whitespace-pre-wrap break-words text-muted-foreground">{selected.details}</p>}
          <Area label={t('reviewReason')} value={reason} onChange={setReason} />
          <div className="flex flex-wrap gap-3">
            {(kind === 'report' ? ['dismiss', 'hide', ...(['post', 'note'].includes(selected.targetType) ? ['hide_photo'] : [])] : kind === 'hold' ? ['release'] : ['approve', 'hide']).map(next => <Confirm key={next} title={t(next)} description={t('reviewHint')} actionLabel={t(next)} busyLabel={t('loading')} cancelLabel={t('cancel')} work={async () => { await run(selected, next) }}>
              <Button variant={next.startsWith('hide') ? 'destructive' : 'outline'} disabled={busy || !reason.trim()}>{t(next)}</Button>
            </Confirm>)}
          </div>
        </>}
      </div>
    </div>
  </>
}
