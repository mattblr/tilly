import { qualityLabel } from './copy'
import { useAppCopy } from '~/features/app/copy'
import { useEffect, useRef, useState } from 'react'
import { MoreHorizontal, Plus, RefreshCw } from 'lucide-react'
import {
  ask,
  create,
  everyRow,
  page,
  remove,
  sets,
  update,
  type App,
  type Photo,
  type Tier,
  type Trial,
} from './api'
import {
  Action,
  Area,
  Choice,
  Confirm,
  Empty,
  LoadState,
  TextField,
  useMessage,
  useLoad,
} from './shared'
import { Button } from '~/features/console/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '~/features/console/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '~/features/console/components/ui/dropdown-menu'

const MODELS = ['gpt-image-1-mini', 'gpt-image-1']
const qualities = ['low', 'medium', 'high'] as const
const trialFields =
  '_id _createdAt runId photoKey prompt artModel artQuality status seconds error art { webp { medium { url } } }'
type Running = {
  runId: string
  artModel: string
  artQuality: string
  started: number
  lost?: boolean
}

export function Styles({ active }: { active: boolean }) {
  const state = useLoad(async () => {
    const tiers = await everyRow<Tier>(
      'streakTiers',
      '_id days name symbol stylePrompt animated',
    )
    const { appSettings } = await ask<{ appSettings: App }>(
      'query { appSettings(naturalKey: "app") { _id artModel artQuality } }',
    )
    return { tiers: tiers.sort((a, b) => a.days - b.days), app: appSettings }
  })
  return (
    <>
      <LoadState
        loading={!state.data && state.loading}
        error={state.error}
        retry={state.reload}
      />
      {state.data && (
        <ArtWorkspace
          initial={state.data}
          active={active}
          reload={state.reload}
        />
      )}
    </>
  )
}

function ArtWorkspace({
  initial,
  active,
  reload,
}: {
  initial: { tiers: Tier[]; app: App }
  active: boolean
  reload: () => Promise<void>
}) {
  const t = useAppCopy()
  const message = useMessage()
  const [tierId, setTierId] = useState(initial.tiers[0]?._id ?? '')
  const tier = initial.tiers.find((t) => t._id === tierId)
  const [prompt, setPrompt] = useState(tier?.stylePrompt ?? '')
  const [model, setModel] = useState(initial.app?.artModel || MODELS[0])
  const [quality, setQuality] = useState(initial.app?.artQuality || 'low')
  const [app, setApp] = useState(initial.app)
  const [picked, setPicked] = useState<Photo>()
  const [running, setRunning] = useState<Running[]>([])
  const [filter, setFilter] = useState('all')
  const [notice, setNotice] = useState('')
  const [noticeError, setNoticeError] = useState(false)
  const gallery = useLoad(() =>
    page<Trial>(
      'artTrials',
      trialFields,
      null,
      12,
      'orderBy: [{ createdAt: DESC }], ',
    ),
  )
  const [older, setOlder] = useState<Trial[]>([])
  const [after, setAfter] = useState<string | null>(null)
  const galleryRows = [
    ...new Map(
      [...(gallery.data?.rows ?? []), ...older].map((trial) => [
        trial._id,
        trial,
      ]),
    ).values(),
  ]
  const galleryGeneration = useRef(0)
  const currentRuns = useRef(running)
  currentRuns.current = running

  useEffect(() => {
    if (initial.tiers.some((t) => t._id === tierId)) return
    setTierId(initial.tiers[0]?._id ?? '')
    setPrompt(initial.tiers[0]?.stylePrompt ?? '')
  }, [initial.tiers, tierId])

  useEffect(() => {
    if (gallery.data) {
      galleryGeneration.current++
      setAfter(gallery.data.after)
      setOlder([])
    }
  }, [gallery.data])
  useEffect(() => {
    const finished = new Set(gallery.data?.rows.map((t) => t.runId))
    setRunning((rows) => rows.filter((row) => !finished.has(row.runId)))
  }, [gallery.data])
  useEffect(() => {
    if (!active || !running.some((run) => !run.lost)) return
    // Completion creates a trial record once. Poll only those run ids while
    // this tab is visible; don't refetch the entire gallery every few seconds.
    let polling = false
    const timer = window.setInterval(async () => {
      if (polling) return
      polling = true
      const pending = currentRuns.current.filter((run) => !run.lost)
      try {
        const found = await everyRow<{ runId: string }>(
          'artTrials',
          'runId',
          `where: { runId: { in: ${JSON.stringify(pending.map((r) => r.runId))} } }, `,
        )
        if (found.length) {
          const finished = new Set(found.map((run) => run.runId))
          setRunning((rows) => rows.filter((run) => !finished.has(run.runId)))
          await gallery.reload()
        }
      } catch {
        /* A transient failure gets another attempt on the next tick. */
      } finally {
        polling = false
      }
      setRunning((rows) =>
        rows.map((run) =>
          Date.now() - run.started > 300_000 ? { ...run, lost: true } : run,
        ),
      )
    }, 3000)
    return () => window.clearInterval(timer)
  }, [active, running.length, running.some((run) => !run.lost), gallery.reload])

  const act = async (work: () => Promise<unknown>, text: string) => {
    setNotice('')
    setNoticeError(false)
    try {
      await work()
      setNotice(text)
    } catch (error) {
      setNotice(message(error))
      setNoticeError(true)
    }
  }
  const displayed = galleryRows.filter(
    (trial) => filter === 'all' || trial.status === filter,
  )
  const source = picked?.photo?.webp?.thumbnail?.url ?? picked?.photo?.url

  return (
    <div
      className={[
        'art-workspace grid [grid-template-columns:300px_minmax(0,_1fr)] gap-8',
        'max-[760px]:[grid-template-columns:1fr] max-[760px]:gap-7',
      ].join(' ')}
    >
      <section
        className={[
          'recipe flex flex-col gap-4.5 pr-6 [border-right:1px_solid_var(--border)] min-w-0',
          'max-[760px]:pr-[0] max-[760px]:[border-right:0] max-[760px]:pb-6 max-[760px]:[border-bottom:1px_solid_var(--border)]',
        ].join(' ')}
        aria-labelledby="recipe-heading"
      >
        <h2 id="recipe-heading">{t("console.newTrial")}</h2>
        <PhotoPicker picked={picked} onPick={setPicked}>
          <Button
            variant="outline"
            className={[
              'catch-button w-full h-[auto] p-0 [border:0] justify-start text-left gap-3 [background:transparent] [box-shadow:none]',
              'hover:[background:transparent]',
              '[&_small]:block [&_small]:[color:var(--muted-foreground)] [&_small]:mt-1 [&_small]:text-[12px] [&_small]:font-normal',
            ].join(' ')}
          >
            <span
              className={[
                'catch-thumb w-14.5 h-18 grid place-items-center [background:var(--muted)] [border:1px_solid_var(--border)] rounded-[4px] overflow-hidden [flex-shrink:0]',
                '[&_img]:w-full [&_img]:h-full [&_img]:object-cover',
              ].join(' ')}
            >
              {source ? <img src={source} alt="" /> : <Plus size={18} />}
            </span>
            <span>
              {picked?.cat?.name ?? t("console.chooseACatch")}
              <small>
                {picked ? t("console.changePhoto") : t("console.fromYourRecentCatches")}
              </small>
            </span>
          </Button>
        </PhotoPicker>
        <div className="tier-choice">
          <Choice
            label={t("console.streakStyle")}
            value={tierId}
            onChange={(value) => {
              setTierId(value)
              setPrompt(
                initial.tiers.find((t) => t._id === value)?.stylePrompt ?? '',
              )
            }}
            options={initial.tiers.map((style) => ({value:style._id,label:t("console.styleDays", {name:style.name,count:String(style.days),unit:t(style.days===1?'console.day':'console.days')})}))}
          />
          <div
            className={[
              'small-actions flex justify-between mt-1',
              '[&_button]:text-[12px] [&_button]:h-7 [&_button]:p-0 [&_button]:[color:var(--muted-foreground)]',
            ].join(' ')}
          >
            {tier && <TierEditor tier={tier} reload={reload} />}
            <TierEditor
              days={Math.max(0, ...initial.tiers.map((t) => t.days)) + 7}
              reload={reload}
            />
          </div>
        </div>
        <Area label={t("console.prompt")} value={prompt} onChange={setPrompt} />
        <div
          className={
            'model-row grid [grid-template-columns:minmax(0,_1fr)_92px] gap-3'
          }
        >
          <Choice
            label={t("console.model")}
            value={model}
            onChange={setModel}
            options={[...new Set([...MODELS, model])].map((value) => ({
              value,
              label: value,
            }))}
          />
          <Choice
            label={t("console.quality")}
            value={quality}
            onChange={setQuality}
            options={qualities.map(value=>({value,label:qualityLabel(value,t)}))}
          />
        </div>
        <Action
          primary
          disabled={!picked?.photo?.url || !prompt.trim()}
          work={async () => {
            const result = await ask<{
              executeTillyPreviewArt: {
                execution: { id: string; status: string; error?: string }
              }
            }>(
              `mutation R($input: TillyPreviewArtInput, $key: String) { executeTillyPreviewArt(input: $input, mode: ASYNC, idempotencyKey: $key) { execution { id status error } } }`,
              {
                input: {
                  photoKey: picked!._id,
                  photoUrl: picked!.photo!.url,
                  width: picked!.photo!.width,
                  height: picked!.photo!.height,
                  prompt,
                  model,
                  quality,
                },
                key: `trial-${crypto.randomUUID()}`,
              },
            )
            const execution = result.executeTillyPreviewArt?.execution
            if (
              !execution?.id ||
              execution.error ||
              execution.status === 'FAILED'
            )
              throw new Error(execution?.error || t("console.theTrialCouldNotStart"))
            setRunning((rows) => [
              {
                runId: execution.id,
                artModel: model,
                artQuality: quality,
                started: Date.now(),
              },
              ...rows,
            ])
            return t("console.drawingTheResultWillAppearAlongside")
          }}
        >
          {t("console.drawTrial")}</Action>
        <p
          className={[
            'help [color:var(--muted-foreground)] text-[12px] m-0 leading-[1.6]',
            '[.recipe_>_&]:mt-[-8px]',
          ].join(' ')}
        >
          {t("console.eachTrialCostsTheSameAsADrawingTrials")}</p>
        <div
          className={[
            'app-setting pt-4 [border-top:1px_solid_var(--border)] mt-0.5',
            '[&_p]:text-[12px] [&_p]:m-0 [&_p]:[overflow-wrap:anywhere]',
            '[&_span]:[color:var(--muted-foreground)]',
          ].join(' ')}
        >
          <h3>{t("console.usedInTheApp")}</h3>
          <p>
            {app?.artModel ?? '—'} <span> / {app?.artQuality ?? '—'}</span>
          </p>
        </div>
      </section>
      <section className={'gallery min-w-0'} aria-labelledby="gallery-heading">
        <div
          className={[
            'section-toolbar flex items-center justify-between gap-4 min-h-9 mb-4',
            'max-[420px]:[align-items:start]',
          ].join(' ')}
        >
          <h2 id="gallery-heading" tabIndex={-1}>
            {t("console.trials")}</h2>
          <div className={'gallery-tools flex items-center gap-1.5'}>
            <Choice
              label={t("console.showTrials")}
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'all', label: t("console.allTrials") },
                { value: 'ready', label: t("console.finished") },
                { value: 'failed', label: t("console.failed") },
              ]}
            />
            <Button
              variant="ghost"
              size="icon"
              aria-label={t("console.refreshTrials")}
              disabled={gallery.loading}
              onClick={() => void gallery.reload()}
            >
              <RefreshCw size={15} />
            </Button>
          </div>
        </div>
        <p
          className={
            noticeError
              ? 'error [color:var(--destructive)] [font-size:12px] [overflow-wrap:anywhere] gallery-status [&:empty]:hidden [margin-bottom:12px]'
              : 'save-status [font-size:12px] [color:var(--muted-foreground)] gallery-status [&:empty]:hidden [margin-bottom:12px]'
          }
          role="status"
          aria-live="polite"
        >
          {notice}
        </p>
        <LoadState
          loading={!gallery.data && gallery.loading}
          error={gallery.error}
          retry={gallery.reload}
        />
        <div
          className={[
            'contact-sheet grid [grid-template-columns:repeat(3,_minmax(0,_1fr))] gap-[20px_16px]',
            'max-[1100px]:[grid-template-columns:repeat(2,_minmax(0,_1fr))]',
          ].join(' ')}
        >
          {filter === 'all' &&
            running.map((run) => (
              <article className={'trial min-w-0'} key={run.runId}>
                <div
                  className={[
                    'trial-picture w-full h-60 grid place-items-center [background:var(--muted)] [border:0] rounded-[3px] overflow-hidden p-0 text-center waiting [align-content:center] gap-2 [color:var(--muted-foreground)]',
                    '[&_img]:w-full [&_img]:h-full [&_img]:object-contain',
                    'max-[1100px]:h-55',
                    'max-[420px]:h-47.5',
                    '[&_small]:max-w-[170px] [&_small]:text-[12px]',
                  ].join(' ')}
                  role="status"
                >
                  <span>{run.lost ? t("console.noResultYet") : t("console.drawing")}</span>
                  <small>
                    {run.lost
                      ? t("console.checkTheOperationInFIrThenRefresh")
                      : t("console.usuallyTakesLessThanAMinute")}
                  </small>
                </div>
                <div
                  className={[
                    'trial-caption flex justify-between gap-2 items-center pt-2',
                    '[&_strong]:text-[12px] [&_strong]:font-medium [&_strong]:[overflow-wrap:anywhere]',
                    '[&_p]:m-[2px_0_0] [&_p]:text-[12px] [&_p]:[color:var(--muted-foreground)]',
                    '[&_>_span]:m-[2px_0_0] [&_>_span]:text-[12px] [&_>_span]:[color:var(--muted-foreground)]',
                    '[&_button]:w-7 [&_button]:h-7 [&_button]:[flex-shrink:0]',
                  ].join(' ')}
                >
                  <strong>{run.artModel}</strong>
                  <span>{qualityLabel(run.artQuality,t)}</span>
                </div>
              </article>
            ))}
          {displayed.map((trial) => (
            <TrialView
              key={trial._id}
              trial={trial}
              tier={tier}
              useModel={() =>
                act(async () => {
                  if (!app?._id) throw new Error('App settings are missing.')
                  await update(
                    'AppSettings',
                    app._id,
                    sets({
                      artModel: trial.artModel,
                      artQuality: trial.artQuality,
                    }),
                  )
                  setApp({
                    ...app,
                    artModel: trial.artModel,
                    artQuality: trial.artQuality,
                  })
                }, t("console.modelUpdated"))
              }
              usePrompt={() =>
                act(async () => {
                  if (!tier) throw new Error('Choose a streak style first.')
                  await update(
                    'StreakTier',
                    tier._id,
                    sets({ stylePrompt: trial.prompt }),
                  )
                  tier.stylePrompt = trial.prompt
                  setPrompt(trial.prompt)
                }, t("console.promptAppliedNamed", {name:tier?.name ?? t("console.styleFallback")}))
              }
              removeTrial={async () => {
                await remove('ArtTrial', trial._id)
                setOlder((rows) => rows.filter((t) => t._id !== trial._id))
                await gallery.reload()
              }}
            />
          ))}
        </div>
        {!gallery.loading &&
          !displayed.length &&
          !(filter === 'all' && running.length) && (
            <Empty>
              {filter === 'all'
                ? t("console.noTrialsYetChooseACatchToTryA")
                : t("console.noTrialsMatchThisView")}
            </Empty>
          )}
        {after && (
          <Action
            work={async () => {
              const generation = galleryGeneration.current
              const next = await page<Trial>(
                'artTrials',
                trialFields,
                after,
                12,
                'orderBy: [{ createdAt: DESC }], ',
              )
              if (generation !== galleryGeneration.current) return ''
              setOlder((rows) => [...rows, ...next.rows])
              setAfter(next.after)
              return ''
            }}
          >
            {t("console.moreTrials")}</Action>
        )}
      </section>
    </div>
  )
}

function PhotoPicker({
  picked,
  onPick,
  children,
}: {
  picked?: Photo
  onPick: (photo: Photo) => void
  children: React.ReactNode
}) {
  const t = useAppCopy()
  const message = useMessage()
  const [open, setOpen] = useState(false)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [after, setAfter] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const load = async (cursor: string | null = null) => {
    setBusy(true)
    setError('')
    try {
      // Only catches their creators shared publicly are used for trials.
      const result = await page<Photo>(
        'capturePhotos',
        '_id _createdAt cat { name } photo { url width height webp { thumbnail { url } } }',
        cursor,
        24,
        'where: { audience: { eq: "public" }, state: { eq: "ready" } }, orderBy: [{ createdAt: DESC }], ',
      )
      setPhotos((rows) => (cursor ? [...rows, ...result.rows] : result.rows))
      setAfter(result.after)
      setLoaded(true)
    } catch (err) {
      setError(message(err))
    } finally {
      setBusy(false)
    }
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        setOpen(value)
        if (value && !loaded && !busy) void load()
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent
        className={'photo-dialog max-w-[760px] max-h-[85dvh] overflow-y-auto'}
      >
        <DialogHeader>
          <DialogTitle>{t("console.chooseACatch")}</DialogTitle>
          <DialogDescription>
            {t("console.aTrialUsesThisPhotoWithoutChangingTheCatch")}</DialogDescription>
        </DialogHeader>
        <LoadState
          loading={busy && !loaded}
          error={error}
          retry={() => load()}
        />
        <div
          className={[
            'photo-grid grid [grid-template-columns:repeat(5,_minmax(0,_1fr))] gap-3',
            '[&_button]:p-0.75 [&_button]:text-left [&_button]:[border:1px_solid_transparent] [&_button]:rounded-[6px]',
            "[&_button[aria-pressed='true']]:[border-color:var(--ring)]",
            '[&_img]:w-full [&_img]:aspect-[1] [&_img]:object-cover [&_img]:rounded-[4px]',
            '[&_span]:block [&_span]:text-[12px] [&_span]:mt-1',
            'max-[760px]:[grid-template-columns:repeat(3,_minmax(0,_1fr))]',
          ].join(' ')}
        >
          {photos
            .filter((p) => p.photo?.url)
            .map((photo) => (
              <button
                key={photo._id}
                type="button"
                aria-pressed={photo._id === picked?._id}
                onClick={() => {
                  onPick(photo)
                  setOpen(false)
                }}
              >
                <img
                  src={photo.photo?.webp?.thumbnail?.url ?? photo.photo?.url}
                  alt={t("console.catchPhotoAlt", {name:photo.cat?.name ?? t('cat.unnamed'),date:new Date(photo._createdAt).toLocaleDateString()})}
                  loading="lazy"
                />
                <span>{photo.cat?.name ?? t('cat.unnamed')}</span>
              </button>
            ))}
        </div>
        {loaded && !photos.length && <Empty>{t("console.noCatchesToTryYet")}</Empty>}
        {after && (
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => void load(after)}
          >
            {busy ? t("safety.loading") : t("web-app.moreCatches")}
          </Button>
        )}
      </DialogContent>
    </Dialog>
  )
}

function TierEditor({
  tier,
  days = 1,
  reload,
}: {
  tier?: Tier
  days?: number
  reload: () => Promise<void>
}) {
  const t = useAppCopy()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(tier?.name ?? '')
  const [count, setCount] = useState(String(tier?.days ?? days))
  const [symbol, setSymbol] = useState(tier?.symbol ?? 'cat')
  const [prompt, setPrompt] = useState(tier?.stylePrompt ?? '')
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        setOpen(value)
        if (value) {
          setName(tier?.name ?? '')
          setCount(String(tier?.days ?? days))
          setSymbol(tier?.symbol ?? 'cat')
          setPrompt(tier?.stylePrompt ?? '')
        }
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost">
          {tier ? (
            t("console.editStyle")
          ) : (
            <>
              <Plus size={13} /> {t("console.addStyle")}</>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {tier ? t("console.editName", {name:tier.name}) : t("console.addAStreakStyle")}
          </DialogTitle>
          <DialogDescription>
            {t("console.theStyleAppliesFromThisManyConsecutiveCatchDays")}</DialogDescription>
        </DialogHeader>
        <div className={'form-stack flex flex-col gap-4.5'}>
          <TextField label={t("console.name")} value={name} onChange={setName} required />
          <div
            className={'two-fields grid [grid-template-columns:1fr_1fr] gap-4'}
          >
            <TextField
              label={t("console.streakDays")}
              value={count}
              onChange={setCount}
              type="number"
              min={1}
              required
            />
            <TextField label={t("console.symbol")} value={symbol} onChange={setSymbol} />
          </div>
          <Area label={t("console.stylePrompt")} value={prompt} onChange={setPrompt} />
          <Action
            primary
            work={async () => {
              if (
                !name.trim() ||
                !Number.isInteger(Number(count)) ||
                Number(count) < 1
              )
                throw new Error(
                  'Add a name and a positive whole number of days.',
                )
              const values = {
                name: name.trim(),
                days: Number(count),
                symbol,
                stylePrompt: prompt,
              }
              if (tier) await update('StreakTier', tier._id, sets(values))
              else await create('StreakTier', { ...values, animated: false })
              setOpen(false)
              await reload()
              return ''
            }}
          >
            {t("console.saveStyle")}</Action>
          {tier && (
            <Confirm
              title={t("console.removeStyleNamed", {name:tier.name})}
              description={t("console.usersAtThisStreakWillUseTheNextApplicable")}
              work={async () => {
                await remove('StreakTier', tier._id)
                setOpen(false)
                await reload()
              }}
            >
              <Button
                variant="ghost"
                className={
                  'destructive-link [color:var(--destructive)] text-[12px] [overflow-wrap:anywhere]'
                }
              >
                {t("console.removeStyle")}</Button>
            </Confirm>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function TrialView({
  trial,
  tier,
  useModel,
  usePrompt,
  removeTrial,
}: {
  trial: Trial
  tier?: Tier
  useModel: () => Promise<void>
  usePrompt: () => Promise<void>
  removeTrial: () => Promise<void>
}) {
  const t = useAppCopy()
  const message = useMessage()
  const url = trial.art?.webp?.medium?.url
  const [confirm, setConfirm] = useState(false)
  const menuTrigger = useRef<HTMLButtonElement>(null)
  return (
    <article className={'trial min-w-0'}>
      <Dialog>
        <DialogTrigger asChild>
          <button
            className={[
              'trial-picture w-full h-60 grid place-items-center [background:var(--muted)] [border:0] rounded-[3px] overflow-hidden p-0 text-center',
              '[&_img]:w-full [&_img]:h-full [&_img]:object-contain',
              'max-[1100px]:h-55',
              'max-[420px]:h-47.5',
            ].join(' ')}
            type="button"
            aria-label={t("console.viewTrial", {model:trial.artModel,quality:qualityLabel(trial.artQuality,t)})}
          >
            {trial.status === 'ready' && url ? (
              <img
                src={url}
                alt={t("console.trialAlt", {model:trial.artModel,quality:qualityLabel(trial.artQuality,t)})}
                loading="lazy"
              />
            ) : (
              <span
                className={
                  'failed-picture text-[12px] p-5 [color:var(--destructive)] [overflow-wrap:anywhere]'
                }
              >
                {message(trial.error)}
              </span>
            )}
          </button>
        </DialogTrigger>
        <DialogContent
          className={'trial-dialog max-w-[900px] max-h-[90dvh] overflow-y-auto'}
        >
          <DialogHeader>
            <DialogTitle>
              {trial.artModel} · {qualityLabel(trial.artQuality,t)}
            </DialogTitle>
            <DialogDescription>
              {trial.seconds ? t("console.secondsPrefix", {count:String(trial.seconds)}) : ''}
              {new Date(trial._createdAt).toLocaleString()}
            </DialogDescription>
          </DialogHeader>
          <div
            className={[
              'trial-detail grid [grid-template-columns:minmax(0,_1.3fr)_minmax(0,_1fr)] gap-6',
              '[&_img]:w-full [&_img]:max-h-[65dvh] [&_img]:object-contain [&_img]:[background:var(--muted)]',
              '[&_p]:text-[13px] [&_p]:[white-space:pre-wrap] [&_p]:leading-[1.7] [&_p]:[overflow-wrap:anywhere]',
              'max-[420px]:[grid-template-columns:1fr]',
            ].join(' ')}
          >
            {url && <img src={url} alt={t("console.trialDrawing")} />}
            <div>
              <h3>{t("console.prompt")}</h3>
              <p>{trial.prompt || '—'}</p>
              {trial.error && (
                <p
                  className={
                    'error [color:var(--destructive)] text-[12px] [overflow-wrap:anywhere]'
                  }
                >
                  {message(trial.error)}
                </p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <div
        className={[
          'trial-caption flex justify-between gap-2 items-center pt-2',
          '[&_strong]:text-[12px] [&_strong]:font-medium [&_strong]:[overflow-wrap:anywhere]',
          '[&_p]:m-[2px_0_0] [&_p]:text-[12px] [&_p]:[color:var(--muted-foreground)]',
          '[&_>_span]:m-[2px_0_0] [&_>_span]:text-[12px] [&_>_span]:[color:var(--muted-foreground)]',
          '[&_button]:w-7 [&_button]:h-7 [&_button]:[flex-shrink:0]',
        ].join(' ')}
      >
        <div>
          <strong>{trial.artModel}</strong>
          <p>
            {qualityLabel(trial.artQuality,t)}
            {trial.seconds ? t("console.secondsSuffix", {count:String(trial.seconds)}) : ''}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              ref={menuTrigger}
              variant="ghost"
              size="icon"
              aria-label={t("console.trialActions", {model:trial.artModel,quality:qualityLabel(trial.artQuality,t)})}
            >
              <MoreHorizontal size={16} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {trial.status === 'ready' && (
              <>
                <DropdownMenuItem onSelect={() => void useModel()}>
                  {t("console.useModelInApp")}</DropdownMenuItem>
                <DropdownMenuItem
                  disabled={!tier}
                  onSelect={() => void usePrompt()}
                >
                  {t("console.applyPromptNamed", {name:tier?.name ?? t("console.styleFallback")})}
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuItem
              className={
                'destructive-link [color:var(--destructive)] text-[12px] [overflow-wrap:anywhere]'
              }
              onSelect={() => setConfirm(true)}
            >
              {t("console.removeTrial")}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {confirm && (
        <TrialRemoval
          close={() => setConfirm(false)}
          restoreFocus={() => {
            if (menuTrigger.current?.isConnected) menuTrigger.current.focus()
            else document.getElementById('gallery-heading')?.focus()
          }}
          remove={removeTrial}
          name={`${trial.artModel} / ${qualityLabel(trial.artQuality,t)}`}
        />
      )}
    </article>
  )
}

function TrialRemoval({
  close,
  remove,
  name,
  restoreFocus,
}: {
  close: () => void
  remove: () => Promise<void>
  name: string
  restoreFocus: () => void
}) {
  const t = useAppCopy()
  const message = useMessage()
  // Controlled separately from the dropdown so focus moves into the dialog
  // after the menu closes, and returns to the trial's action button.
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  return (
    <Dialog
      open
      onOpenChange={(value) => {
        if (!value && !busy) close()
      }}
    >
      <DialogContent
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          restoreFocus()
        }}
      >
        <DialogHeader>
          <DialogTitle>{t("console.removeThisTrial")}</DialogTitle>
          <DialogDescription>
            {t("console.removeTrialDescription", {name})}</DialogDescription>
        </DialogHeader>
        {error && (
          <p
            role="alert"
            className={
              'error [color:var(--destructive)] text-[12px] [overflow-wrap:anywhere]'
            }
          >
            {error}
          </p>
        )}
        <div className={'dialog-actions flex justify-end gap-2'}>
          <Button variant="outline" disabled={busy} onClick={close}>
            {t("common.cancel")}</Button>
          <Button
            disabled={busy}
            onClick={async () => {
              setBusy(true)
              try {
                await remove()
                close()
              } catch (err) {
                setError(message(err))
                setBusy(false)
              }
            }}
          >
            {busy ? t("console.removing") : t("console.removeTrial")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
