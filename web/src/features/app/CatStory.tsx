import { CatPhotoViewer } from './CatPhotoViewer'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from '~/components/ui/carousel'
import { Link } from '@tanstack/react-router'
import { useAppSession } from './session'
import { usePages } from './use-pages'
import { cursorSource } from './paging'
import { countTaggedCatPhotos } from './captures'
import { readCatStory } from './cat-story'
import { Photo, CatchImage } from './CatchImage'
import { Likes } from './Likes'
import { CatchActions } from './Actions'
import { RoaringCat } from '~/components/RoaringCat'
import { useAppCopy } from './copy'
import { useResource } from './use-resource'
import { SafetyMenu } from './SafetyMenu'
import { PostHighlightBadges } from './PostHighlightBadges'

export function CatStory({
  catId,
  name,
  children,
}: {
  catId: string
  name: string
  children: ReactNode
}) {
  const { client, user, revision, locale } = useAppSession(),
    t = useAppCopy()
  const page = usePages(
    () => cursorSource(after => readCatStory(client, catId, !!user, locale, after)),
    [client, catId, user?.id, revision, locale],
  )
  const met = useResource(
    async () => {
      if (!user) return null
      return countTaggedCatPhotos(client, catId, user.id)
    },
    [client, catId, user?.id, revision],
  )
  const [selected, setSelected] = useState(0)
  const [viewing, setViewing] = useState<string | null>(null)
  const viewerTrigger = useRef<HTMLButtonElement | null>(null)
  const [api, setApi] = useState<CarouselApi>()
  const [reducedMotion, setReducedMotion] = useState(false)
  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReducedMotion(motion.matches)
    update()
    motion.addEventListener('change', update)
    return () => motion.removeEventListener('change', update)
  }, [])
  useEffect(() => {
    setSelected(0)
    api?.scrollTo(0, true)
  }, [api, catId, user?.id])
  useEffect(() => {
    if (!api) return
    const select = () => setSelected(api.selectedScrollSnap())
    select()
    api.on('select', select).on('reInit', select)
    return () => {
      api.off('select', select).off('reInit', select)
    }
  }, [api])
  useEffect(() => {
    if (
      page.rows.length &&
      selected >= page.rows.length - 2 &&
      page.next &&
      !page.busy &&
      !page.error
    )
      void page.more()
  }, [selected, page.rows.length, page.next, page.busy, page.error])
  const viewerSelected = useCallback(
    (index: number) => {
      setSelected(index)
      api?.scrollTo(index, true)
    },
    [api],
  )
  const dotStart = Math.max(0, Math.min(selected - 3, page.rows.length - 7))
  return (
    <>
      {!!page.rows.length && (
        <Carousel
          setApi={setApi}
          opts={{
            align: 'start',
            loop: false,
            duration: reducedMotion ? 0 : 25,
          }}
          tabIndex={0}
          className={[
            'cat-gallery relative left-1/2 mb-7 w-screen max-w-none -translate-x-1/2',
          ].join(' ')}
          aria-label={t('cat.photosOf', {name})}
        >
          <CarouselContent className="ml-0">
            {page.rows.map((capture, index) => (
              <CarouselItem
                key={capture.id}
                onDragStart={(event) => event.preventDefault()}
                className={[
                  'cat-gallery-slide pl-0 h-[min(72svh,_760px)] relative select-none',
                  '[&_img]:w-full [&_img]:h-full [&_img]:object-cover',
                ].join(' ')}
                aria-label={t(page.next ? 'cat.photoPositionLoaded' : 'cat.photoPosition', {number: String(index + 1), count: String(page.rows.length)})}
              >
                <button
                  type="button"
                  className="block h-full w-full cursor-zoom-in"
                  aria-label={t('cat.openPhoto', {number: String(index + 1), name})}
                  onClick={(event) => {
                    viewerTrigger.current = event.currentTarget
                    setViewing(capture.id)
                  }}
                >
                  <Photo
                    src={capture.photo}
                    alt={`${name}, ${new Date(capture.at).toLocaleDateString(locale)}`}
                    size="large"
                    active={Math.abs(index - selected) <= 1}
                  />
                </button>
                <div className="pointer-events-none absolute inset-x-4 top-4">
                  <PostHighlightBadges catalog={capture.highlights} selected={capture.highlightKeys} />
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          {page.rows.length > 1 && (
            <div
              className="absolute inset-x-3 bottom-3 flex justify-center"
              role="group"
              aria-label={t('cat.choosePhoto')}
            >
              <div className="flex max-w-full flex-wrap justify-center rounded-full bg-black/50 px-2">
                {page.rows
                  .slice(dotStart, dotStart + 7)
                  .map((capture, offset) => {
                    const index = dotStart + offset
                    return (
                      <button
                        key={capture.id}
                        type="button"
                        className="grid size-6 shrink-0 place-items-center"
                        aria-label={t('cat.goToPhoto', {number: String(index + 1)})}
                        aria-current={selected === index ? 'true' : undefined}
                        onClick={() => api?.scrollTo(index)}
                      >
                        <span
                          aria-hidden="true"
                          className={`size-1.5 rounded-full transition-opacity motion-reduce:transition-none ${selected === index ? 'bg-white opacity-100' : 'bg-white opacity-40'}`}
                        />
                      </button>
                    )
                  })}
              </div>
              <span className="sr-only" aria-live="polite">
                {t(page.next ? 'cat.photoPositionLoaded' : 'cat.photoPosition', {number: String(selected + 1), count: String(page.rows.length)})}
              </span>
            </div>
          )}
        </Carousel>
      )}
      {viewing && (
        <CatPhotoViewer
          photos={page.rows}
          initialId={viewing}
          name={name}
          reducedMotion={reducedMotion}
          onSelect={viewerSelected}
          onClose={() => {
            setViewing(null)
            const target =
              api?.slideNodes()[selected]?.querySelector('button') ??
              viewerTrigger.current
            requestAnimationFrame(() => target?.focus({ preventScroll: true }))
          }}
        />
      )}
      {children}
      <Likes photoKeys={page.rows.map((row) => row.id)}>
        <ol
          className={[
            'cat-timeline list-none p-[0_0_0_20px] m-[24px_0_0_5px] max-w-[680px]',
            'max-[640px]:pl-[0]',
          ].join(' ')}
          aria-label={t('cat.story.title', {name})}
        >
          {page.rows.map((capture) => (
            <li
              key={capture.id}
              className={[
                'cat-timeline-moment relative [border-left:1px_solid_var(--color-tilly-border)] p-[0_0_36px_24px]',
                "[&::before]:[content:''] [&::before]:absolute [&::before]:top-[5px] [&::before]:left-[-5px] [&::before]:w-2.25 [&::before]:h-2.25 [&::before]:rounded-full [&::before]:[background:var(--color-tilly-text-secondary)] [&::before]:[outline:4px_solid_var(--color-tilly-bg)]",
                '[&:first-child::before]:[background:var(--color-tilly-accent)]',
                '[&:last-child]:[border-color:transparent]',
                '[&_>_p]:my-3',
              ].join(' ')}
            >
              <div
                className={[
                  'cat-timeline-byline flex flex-wrap gap-[8px_16px] items-center mb-3.5 [color:var(--color-tilly-text-secondary)]',
                  '[&_a]:[color:var(--color-tilly-text)]',
                ].join(' ')}
              >
                <time dateTime={capture.at}>
                  {new Date(capture.at).toLocaleDateString(locale, {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </time>
                {capture.encounter?.authorId && (
                  <Link
                    to="/people/$userId"
                    params={{ userId: capture.encounter.authorId }}
                  >
                    {capture.encounter.author}
                  </Link>
                )}
              </div>
              <CatchImage photo={capture.photo} art={capture.art} name={name} />
              <PostHighlightBadges catalog={capture.highlights} selected={capture.highlightKeys} />
              {!!capture.reportableNotes?.length ? capture.reportableNotes.map(note => (
                <div key={note.id} className="flex items-start justify-between gap-3"><p>{note.text}</p><SafetyMenu targetType="note" targetId={note.id} ownerId={note.ownerId} onChanged={page.reload} /></div>
              )) : capture.notes.map((note) => (
                <p key={note}>{note}</p>
              ))}
              {capture.encounter && (
                <CatchActions row={capture.encounter} onChanged={page.reload} />
              )}
            </li>
          ))}
          {!page.next &&
            !page.busy &&
            !page.error &&
            !met.busy &&
            !met.error && (
              <li
                className={[
                  'cat-timeline-moment relative [border-left:1px_solid_var(--color-tilly-border)] p-[0_0_36px_24px] cat-first-hello',
                  "[&::before]:[content:''] [&::before]:absolute [&::before]:top-[5px] [&::before]:left-[-5px] [&::before]:w-2.25 [&::before]:h-2.25 [&::before]:rounded-full [&::before]:[background:var(--color-tilly-text-secondary)] [&::before]:[outline:4px_solid_var(--color-tilly-bg)]",
                  '[&:first-child::before]:[background:var(--color-tilly-accent)]',
                  '[&:last-child]:[border-color:transparent]',
                  '[&_>_p]:my-3',
                  '[&_h3]:[font:inherit] [&_h3]:[color:var(--color-tilly-text-secondary)]',
                ].join(' ')}
              >
                <h3>{t('cat.firstHello')}</h3>
                <p>
                  {t(
                    !user
                      ? 'cat.mine.signedOut'
                      : !met.data
                        ? 'cat.mine.none'
                        : met.data === 1
                          ? 'cat.mine.once'
                          : 'cat.mine.many',
                    { name, met: String(met.data ?? 0) },
                  )}
                </p>
              </li>
            )}
        </ol>
      </Likes>
      {page.busy && <RoaringCat label={t('cat.loadingCatches')} compact />}
      {page.error && (
        <p role="alert">
          {page.error}{' '}
          <button
            type="button"
            onClick={() =>
              page.rows.length ? void page.more() : page.reload()
            }
          >
            {t('common.retry')}
          </button>
        </p>
      )}
      {page.next && (
        <button
          type="button"
          className={
            'app-more block min-h-11 p-[0_24px] m-[32px_auto_0] [border:1px_solid_var(--color-tilly-border)] rounded-[6px] text-[14px]'
          }
          disabled={page.busy}
          onClick={() => void page.more()}
        >
          {t("web-app.moreCatches")}</button>
      )}
    </>
  )
}
