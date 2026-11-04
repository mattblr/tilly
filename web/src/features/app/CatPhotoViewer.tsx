import { useAppCopy } from '~/features/app/copy'
import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogTitle } from '~/components/ui/dialog'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from '~/components/ui/carousel'
import { Photo } from './CatchImage'
import type { ProgressiveImageSource } from './media'
import type { PostHighlight } from '../../lib/post-highlights'
import { PostHighlightBadges } from './PostHighlightBadges'

export function CatPhotoViewer({
  photos,
  initialId,
  name,
  reducedMotion,
  onSelect,
  onClose,
}: {
  photos: Array<{ id: string; photo: ProgressiveImageSource | null; highlights?: PostHighlight[]; highlightKeys?: string[] }>
  initialId: string
  name: string
  reducedMotion: boolean
  onSelect: (index: number) => void
  onClose: () => void
}) {
  const t = useAppCopy()
  const [api, setApi] = useState<CarouselApi>()
  const [selected, setSelected] = useState(
    Math.max(
      0,
      photos.findIndex((photo) => photo.id === initialId),
    ),
  )
  useEffect(() => {
    if (!api) return
    const select = () => {
      const index = api.selectedScrollSnap()
      setSelected(index)
      onSelect(index)
    }
    select()
    api.on('select', select).on('reInit', select)
    return () => {
      api.off('select', select).off('reInit', select)
    }
  }, [api, onSelect])
  const dotStart = Math.max(0, Math.min(selected - 3, photos.length - 7))
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent
        fullScreen
        aria-describedby={undefined}
        onCloseAutoFocus={(event) => event.preventDefault()}
      >
        <DialogTitle className="sr-only">{t("cat.photosOf", {name})}</DialogTitle>
        <Carousel
          setApi={setApi}
          opts={{
            startIndex: Math.max(
              0,
              photos.findIndex((photo) => photo.id === initialId),
            ),
            loop: false,
            duration: reducedMotion ? 0 : 25,
          }}
          className="h-full w-full"
          tabIndex={0}
          aria-label={t("cat.webFullScreenPhotos", {name})}
        >
          <CarouselContent className="ml-0">
            {photos.map((photo, index) => (
              <CarouselItem
                key={photo.id}
                className="relative h-dvh select-none pl-0 [&_img]:object-contain"
                aria-label={`${index + 1} of ${photos.length}`}
                onDragStart={(event) => event.preventDefault()}
              >
                <Photo
                  src={photo.photo}
                  alt={`${name}, photo ${index + 1}`}
                  size="large"
                  fit="contain"
                  className="h-full w-full"
                  active={Math.abs(index - selected) <= 1}
                />
                <div className="pointer-events-none absolute left-4 right-16 top-[max(16px,env(safe-area-inset-top))]">
                  <PostHighlightBadges catalog={photo.highlights ?? []} selected={photo.highlightKeys ?? []} />
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          {photos.length > 1 && (
            <div
              role="group"
              aria-label={t("cat.choosePhoto")}
              className="absolute inset-x-3 bottom-[max(16px,env(safe-area-inset-bottom))] flex justify-center"
            >
              <div className="flex rounded-full bg-black/60 px-2">
                {photos.slice(dotStart, dotStart + 7).map((photo, offset) => {
                  const index = dotStart + offset
                  return (
                    <button
                      key={photo.id}
                      type="button"
                      className="grid size-6 place-items-center"
                      aria-label={`Go to photo ${index + 1}`}
                      aria-current={selected === index ? 'true' : undefined}
                      onClick={() => api?.scrollTo(index)}
                    >
                      <span
                        aria-hidden="true"
                        className={`size-1.5 rounded-full bg-white ${selected === index ? 'opacity-100' : 'opacity-40'}`}
                      />
                    </button>
                  )
                })}
              </div>
              <span className="sr-only" aria-live="polite">
                {t("cat.webPhotoPosition", {index:String(selected+1),count:String(photos.length)})}
              </span>
            </div>
          )}
        </Carousel>
      </DialogContent>
    </Dialog>
  )
}
