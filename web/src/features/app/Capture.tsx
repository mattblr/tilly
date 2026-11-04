import { ActionFailure, friendlyError } from '~/lib/failures'
import { useEffect, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { RoaringCat } from '~/components/RoaringCat'
import { websiteEnvironment } from '~/lib/foir'
import { useAppSession } from './session'
import { followIfFirstCatch } from './follows'
import { SignIn } from './SignIn'
import { cameraJpeg, catchLocation, openCamera, stopCamera } from './camera'
import { uploadPhoto } from './uploads'
import { latestForCats, nearbyCatKeys } from './map-query'
import type { Encounter } from './data'
import { CaptureTagEditor } from './CaptureTagEditor'
import { captureCatTags, type CaptureCatTag } from '~/lib/capture-tags'
import { CompletedOperationFailure, runAppOperation } from './operations'
import { useAppCopy } from './copy'
import {finishSavedCapture,type SavedCaptureCompletion} from './capture-finalize'

export function Capture() {
  const { client, user, ready, locale, captureChanged } = useAppSession(),
    t = useAppCopy()
  const video = useRef<HTMLVideoElement>(null),
    stream = useRef<MediaStream | null>(null),
    generation = useRef(0),
    pending = useRef(false)
  const upload = useRef<AbortController | null>(null),
    attempt = useRef<{ input: string; key: string } | null>(null)
  const [phase, setPhase] = useState<
    'idle' | 'opening' | 'live' | 'review' | 'saving' | 'saved'
  >('idle')
  const [jpeg, setJpeg] = useState<Blob | null>(null),
    [preview, setPreview] = useState<string | null>(null),
    [fileId, setFileId] = useState<string | null>(null)
  const [area, setArea] = useState<{ lat: number; lng: number } | null>(null),
    [candidates, setCandidates] = useState<Encounter[]>([]),
    [loadingCandidates, setLoadingCandidates] = useState(false),
    [candidateError, setCandidateError] = useState('')
  const [tags, setTags] = useState<CaptureCatTag[]>([])
  const captureAttempt = useRef<string | null>(null)
  const completion=useRef<SavedCaptureCompletion|null>(null)
  const [note,setNote]=useState(''),[finishing,setFinishing]=useState(false),[finished,setFinished]=useState(false)
  const [confirmed, setConfirmed] = useState(false),
    [error, setError] = useState(''),
    [savedCat, setSavedCat] = useState('')
  useEffect(
    () => () => {
      generation.current++
      stopCamera(stream.current)
      upload.current?.abort()
    },
    [],
  )
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview)
    },
    [preview],
  )
  const resumeCamera = useRef(true)
  const startCamera = useRef<() => Promise<void>>(async () => {})
  const phaseRef = useRef(phase)
  phaseRef.current = phase
  useEffect(() => {
    const hide = () => {
      if (
        document.hidden &&
        (phaseRef.current === 'live' || phaseRef.current === 'opening')
      ) {
        resumeCamera.current = true
        generation.current++
        stopCamera(stream.current)
        stream.current = null
        pending.current = false
        setPhase((current) =>
          current === 'live' || current === 'opening' ? 'idle' : current,
        )
      } else if (!document.hidden && resumeCamera.current) {
        resumeCamera.current = false
        void startCamera.current()
      }
    }
    document.addEventListener('visibilitychange', hide)
    return () => document.removeEventListener('visibilitychange', hide)
  }, [])
  const reset = () => {
    generation.current++
    stopCamera(stream.current)
    stream.current = null
    upload.current?.abort()
    upload.current = null
    pending.current = false
    attempt.current = null
    captureAttempt.current = null
    completion.current=null;setNote('');setFinishing(false);setFinished(false)
    setTags([])
    setPhase('idle')
    setJpeg(null)
    setPreview(null)
    setFileId(null)
    setArea(null)
    setCandidates([])
    setConfirmed(false)
    setError('')
    setCandidateError('')
  }
  const start = async () => {
    if (!user || !ready || document.hidden || pending.current) return
    resumeCamera.current = false
    pending.current = true
    setError('')
    setPhase('opening')
    const epoch = ++generation.current
    try {
      const camera = await openCamera()
      if (epoch !== generation.current) {
        stopCamera(camera)
        return
      }
      stream.current = camera
      // The video stays mounted, so no stream is lost while React paints the controls.
      if (!video.current) throw new Error('The camera preview could not open.')
      video.current.srcObject = camera
      await video.current.play()
      const here = await catchLocation().catch(() => {
        throw new ActionFailure('location')
      })
      if (epoch !== generation.current) return
      setArea(here)
      setPhase('live')
    } catch (failure) {
      if (epoch === generation.current) {
        stopCamera(stream.current)
        stream.current = null
        setPhase('idle')
        const reason = failure instanceof DOMException && failure.name === 'NotAllowedError'
          ? new ActionFailure('camera') : failure
        setError(friendlyError(reason, t, 'camera'))
      }
    } finally {
      if (epoch === generation.current) pending.current = false
    }
  }
  startCamera.current = start
  useEffect(() => {
    // Camera media and stable upload attempts belong to one signed-in person.
    // Never reuse the previous account's file after an in-place session switch.
    reset()
    if (!ready || !user) return
    // A task is cancelled during Strict Mode's rehearsal before requesting hardware.
    const timer = window.setTimeout(() => {
      void start()
    }, 0)
    return () => {
      window.clearTimeout(timer)
      generation.current++
      pending.current = false
      stopCamera(stream.current)
      stream.current = null
    }
  }, [ready, user?.id])
  const nearby = async (here: { lat: number; lng: number }, epoch: number) => {
    setLoadingCandidates(true)
    setCandidateError('')
    try {
      const settings = await client['app-settings'].findUnique({
        naturalKey: 'app',
        pick: ['_id', 'nearMeMeters'],
      })
      const keys = await nearbyCatKeys(client, here, settings?.nearMeMeters ?? 5000)
      const rows = await latestForCats(client, keys, locale)
      if (epoch === generation.current) setCandidates(rows)
    } catch (failure) {
      if (epoch === generation.current)
        setCandidateError(
          friendlyError(failure, t),
        )
    } finally {
      if (epoch === generation.current) setLoadingCandidates(false)
    }
  }
  const take = async () => {
    if (pending.current || !video.current || !area) return
    pending.current = true
    setError('')
    const epoch = generation.current
    try {
      const photo = await cameraJpeg(video.current)
      stopCamera(stream.current)
      stream.current = null
      if (epoch !== generation.current) return
      captureAttempt.current = crypto.randomUUID()
      setTags([{ key: crypto.randomUUID(), name: '' }])
      setJpeg(photo)
      setPreview(URL.createObjectURL(photo))
      setPhase('review')
      void nearby(area, epoch)
    } catch (failure) {
      if (epoch === generation.current)
        setError(
          friendlyError(failure, t),
        )
    } finally {
      if (epoch === generation.current) pending.current = false
    }
  }
  const save = async () => {
    if (
      pending.current ||
      !jpeg ||
      !area ||
      !confirmed ||
      loadingCandidates ||
      candidateError
    )
      return
    pending.current = true
    setError('')
    setPhase('saving')
    const epoch = generation.current,
      controller = new AbortController()
    upload.current = controller
    try {
      const cats = captureCatTags(tags)
      const photoFileId =
        fileId ??
        (await uploadPhoto(
          client,
          jpeg,
          websiteEnvironment().PLATFORM_API_URL,
          controller.signal,
        ))
      if (epoch !== generation.current) return
      setFileId(photoFileId)
      // Browser photos have no Apple feature print. Omit vector/model rather than
      // writing incompatible values into the native matcher’s vector space.
      const input = {
          photoFileId,
          ...area,
          captureKey: captureAttempt.current,
          cats,
        },
        serialized = JSON.stringify(input)
      if (attempt.current?.input !== serialized)
        attempt.current = { input: serialized, key: crypto.randomUUID() }
      const reply = await runAppOperation(
        client,
        'execute.tilly.save-catch',
        input,
        { idempotencyKey: attempt.current.key },
      )
      if (epoch !== generation.current) return
      setSavedCat(String(reply.result.catId))
      const captureId=typeof reply.result.captureId==='string'?reply.result.captureId:undefined
      const photo=reply.result.photo as {_id?:unknown}|undefined
      const photoKey=captureId??(typeof photo?._id==='string'?photo._id:undefined)
      if(!photoKey)throw new ActionFailure('pending')
      completion.current={photoKey,...(captureId?{captureId}:{}), ...(typeof reply.result.revision === 'string' ? {captureRevision: reply.result.revision} : {})}
      setPhase('saved')
      captureChanged()
      // A first catch of a cat follows it; later catches leave the choice alone.
      const caught = new Set([reply.result.catId, ...(Array.isArray(reply.result.cats) ? reply.result.cats.map(cat => (cat as {catId?: unknown}).catId) : [])]
        .filter((id): id is string => typeof id === 'string'))
      for (const catId of caught) void followIfFirstCatch(client, catId).catch(() => {})
    } catch (failure) {
      if (epoch === generation.current) {
        if (failure instanceof CompletedOperationFailure) attempt.current = null
        setPhase('review')
        setError(
          friendlyError(failure, t),
        )
      }
    } finally {
      if (epoch === generation.current) {
        pending.current = false
        upload.current = null
      }
    }
  }
  const finish=async(saveNote:boolean)=>{
    const attempt=completion.current
    if(!attempt||pending.current)return
    if(!saveNote&&attempt.note?.key&&!attempt.note.saved)return
    pending.current=true;setFinishing(true);setError('')
    const epoch=generation.current
    if(saveNote&&note.trim()&&!attempt.note?.saved)attempt.note={text:note.trim(),...(attempt.note?.text===note.trim()?attempt.note:{})}
    if(!saveNote&&!attempt.note?.saved)delete attempt.note
    try {
      await finishSavedCapture(client,attempt,()=>epoch===generation.current)
      if(epoch===generation.current){setFinished(true);captureChanged()}
    } catch(failure){if(epoch===generation.current)setError(friendlyError(failure,t))}
    finally{if(epoch===generation.current){pending.current=false;setFinishing(false)}}
  }
  if (!ready)
    return (
      <section
        className={[
          'app-page w-full max-w-[var(--page-width,_1200px)] px-[var(--page-gutter,_20px)] mx-[auto] py-[var(--gap-lg,_40px)_80px]',
          'max-[700px]:pt-7',
          'min-[768px]:px-[var(--page-gutter-md,_28px)]',
        ].join(' ')}
      >
        <RoaringCat label={t("catch.loadingCamera")} />
      </section>
    )
  if (!user) return <SignIn />
  const cameraVisible =
    phase === 'idle' || phase === 'opening' || phase === 'live'
  return (
    <section
      className={[
        'app-page w-full max-w-[var(--page-width,_1200px)] px-[var(--page-gutter,_20px)] mx-[auto] py-[var(--gap-lg,_40px)_80px] catch-page max-w-[var(--page-width,_1200px)]',
        'max-[700px]:pt-7',
        'min-[768px]:px-[var(--page-gutter-md,_28px)]',
        '[&_>_p]:max-w-[60ch] [&_>_p]:my-4 [&_>_p]:text-[15px] [&_>_p]:leading-[1.6] [&_>_p]:[color:var(--color-tilly-text-secondary)]',
        "[&_input[type='radio']]:min-h-[auto] [&_input[type='radio']]:flex-none",
        "[&_input[type='checkbox']]:min-h-[auto] [&_input[type='checkbox']]:flex-none",
        "[&[data-camera='true']]:w-full [&[data-camera='true']]:max-w-[none] [&[data-camera='true']]:p-0 [&[data-camera='true']]:m-0 [&[data-camera='true']]:flex-1",
      ].join(' ')}
      data-camera={cameraVisible}
      aria-label={t("catch.title")}
    >
      <h1 className="sr-only">{t("catch.title")}</h1>
      <div
        className={[
          'catch-stage relative w-full h-[calc(100svh_-_var(--header-height,_80px)_-_1px)] overflow-hidden [background:#000]',
          '[&[hidden]]:hidden',
          '[@supports(height:_100dvh)]:h-[calc(100dvh_-_var(--header-height,_80px)_-_1px)]',
        ].join(' ')}
        hidden={!cameraVisible}
      >
        <video
          ref={video}
          className={[
            'catch-camera w-[min(100%,_480px)] max-h-[65svh] object-contain rounded-[var(--radius-photo,_10px)] [background:var(--color-tilly-surface)]',
            '[&[hidden]]:hidden',
            '[.catch-stage_&]:absolute [.catch-stage_&]:inset-0 [.catch-stage_&]:w-full [.catch-stage_&]:h-full [.catch-stage_&]:max-h-[none] [.catch-stage_&]:rounded-[0] [.catch-stage_&]:object-cover [.catch-stage_&]:[background:#000]',
          ].join(' ')}
          playsInline
          muted
          autoPlay
          aria-label={t("catch.cameraPreview")}
        />
        {phase === 'opening' && (
          <div
            className={
              'catch-camera-loading absolute inset-0 grid place-items-center pointer-events-none'
            }
          >
            <RoaringCat label={t("catch.openingCamera")} />
          </div>
        )}
        {phase === 'idle' && error && (
          <div
            className={[
              'catch-camera-error absolute inset-[24px_24px_140px] flex flex-col items-center justify-center gap-5 text-center [color:#fff]',
              '[&_p]:max-w-[40ch] [&_p]:text-[15px] [&_p]:leading-[1.5]',
            ].join(' ')}
          >
            <p role="alert">{error}</p>
            <button
              className={[
                'app-secondary min-h-11 p-[10px_18px] rounded-full [background:var(--color-tilly-surface)] inline-flex gap-2 items-center justify-center text-[14px]',
                'max-[700px]:[.profile-biography_>_&]:ml-[auto]',
              ].join(' ')}
              onClick={() => {
                void start()
              }}
            >
              {t("catch.tryCameraAgain")}</button>
          </div>
        )}
        <div
          className={
            'catch-shutter-controls absolute bottom-0 [inset-inline:0] flex justify-center p-[32px_24px_max(28px,_env(safe-area-inset-bottom))] [background:linear-gradient(transparent,_#0008)]'
          }
        >
          <button
            className={[
              'catch-shutter grid place-items-center w-20 h-20 p-1.25 [border:3px_solid_#fff] rounded-full [background:transparent] [box-shadow:0_1px_8px_#0005] [touch-action:manipulation]',
              '[&_>_span]:w-full [&_>_span]:h-full [&_>_span]:rounded-full [&_>_span]:[background:#fff] [&_>_span]:[transition:transform_120ms_ease]',
              '[&:active_>_span]:[transform:scale(0.9)]',
              'focus-visible:[outline:3px_solid_var(--color-tilly-accent)] focus-visible:[outline-offset:6px]',
              'motion-reduce:[&_>_span]:[transition:none]',
            ].join(' ')}
            aria-label={t("catch.takePhoto2")}
            disabled={phase !== 'live'}
            onClick={() => {
              void take()
            }}
          >
            <span aria-hidden="true" />
          </button>
        </div>
      </div>
      {(phase === 'review' || phase === 'saving') && (
        <>

          <h2
            className={
              'app-section-title [font:600_20px/1.2_var(--font-sans)] m-[32px_0_12px]'
            }
          >
            {t('capture-tags.title')}
          </h2>
          <p>
            {t('capture-tags.webHint')}
          </p>
          {loadingCandidates && (
            <RoaringCat label={t("catch.findingNearbyCats")} compact />
          )}
          {candidateError && (
            <p role="alert">
              {candidateError}{' '}
              <button
                disabled={phase === 'saving'}
                onClick={() => {
                  if (area) void nearby(area, generation.current)
                }}
              >
                {t("common.retry")}</button>
            </p>
          )}
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
              event.preventDefault()
              void save()
            }}
          >
            {preview && <CaptureTagEditor photo={preview} value={tags} onChange={setTags} candidates={candidates.map(cat => ({ id: cat.catId!, name: cat.cat }))} disabled={phase === 'saving' || !!attempt.current} />}
            <label className={'catch-confirm flex gap-3 items-center min-h-11'}>
              <input
                type="checkbox"
                checked={confirmed}
                disabled={phase === 'saving'}
                onChange={(event) => setConfirmed(event.target.checked)}
              />
              {t("catch.iveCheckedTheCatsInThisPhoto")}
            </label>
            <button
              className={
                'app-primary min-h-11.5 mt-3 rounded-[6px] [background:var(--color-tilly-accent)] [color:var(--color-tilly-on-signal)] inline-flex place-items-center p-[10px_20px] text-[14px] items-center justify-center gap-2'
              }
              disabled={
                phase === 'saving' ||
                !confirmed ||
                loadingCandidates ||
                !!candidateError
              }
            >
              {phase === 'saving' ? t("catch.savingCatch") : t("catch.saveCatch")}
            </button>
            <button
              type="button"
              className={[
                'app-secondary min-h-11 p-[10px_18px] rounded-full [background:var(--color-tilly-surface)] inline-flex gap-2 items-center justify-center text-[14px]',
                'max-[700px]:[.profile-biography_>_&]:ml-[auto]',
              ].join(' ')}
              disabled={phase === 'saving'}
              onClick={() => {
                reset()
                void start()
              }}
            >
              {t("catch.retakePhoto")}</button>
          </form>
        </>
      )}
      {phase === 'saved' && (
        <>
          <h2>{t('observe.saved')}</h2>
          {!finished?<fieldset disabled={finishing} className="my-4 grid max-w-[480px] gap-3">
            <p>{t('observe.finishHint')}</p>
            <label htmlFor="capture-final-note">{t('observe.noteLabel')}</label>
            <textarea id="capture-final-note" value={note} maxLength={280} rows={3} disabled={!!completion.current?.note?.key||completion.current?.note?.saved}
              className="rounded-xl border border-tilly-border bg-tilly-surface p-3" placeholder={t('observe.notePlaceholder')} onChange={event=>setNote(event.target.value)} />
            <button type="button" className="min-h-11 rounded-full bg-tilly-accent px-5 py-3 text-sm text-tilly-on-signal disabled:opacity-60" disabled={!note.trim()} onClick={()=>void finish(true)}>{t(finishing?'observe.finishing':'observe.save')}</button>
            <button type="button" disabled={!!completion.current?.note?.key&&!completion.current.note.saved} className="min-h-11 rounded-full border border-tilly-border px-5 py-3 text-sm disabled:opacity-60" onClick={()=>void finish(false)}>{t('observe.skip')}</button>
          </fieldset>:<>
          <Link
            className={
              'app-primary min-h-11.5 mt-3 rounded-[6px] [background:var(--color-tilly-accent)] [color:var(--color-tilly-on-signal)] inline-flex place-items-center p-[10px_20px] text-[14px] items-center justify-center gap-2'
            }
            to="/cats/$catId"
            params={{ catId: savedCat }}
          >
            {t("catch.openCatStory")}</Link>
          <button
            className={[
              'app-secondary min-h-11 p-[10px_18px] rounded-full [background:var(--color-tilly-surface)] inline-flex gap-2 items-center justify-center text-[14px]',
              'max-[700px]:[.profile-biography_>_&]:ml-[auto]',
            ].join(' ')}
            onClick={() => {
              reset()
              void start()
            }}
          >
            {t("catch.catchAnotherCat")}</button>
          </>}
        </>
      )}
      {error && !cameraVisible && (
        <p
          className={[
            'app-message text-[14px] leading-[1.6] [color:var(--color-tilly-text-secondary)] p-[24px_0]',
            '[&_button]:underline [&_button]:min-h-11',
          ].join(' ')}
          role="alert"
        >
          {error}
        </p>
      )}
    </section>
  )
}
