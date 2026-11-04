import { useAppCopy } from './copy'
import { useEffect, useRef, useState } from 'react'
import { Crosshair } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '~/components/ui/dialog'
import { useTheme } from '~/components/ThemeProvider'
import type { Area } from './location'
import 'maplibre-gl/dist/maplibre-gl.css'
export type Destination = Area & { radius: number; name: string }
/** Browse a chosen map area without adding another geocoding provider or API key. */
function PlaceMap({
  initial,
  onChoose,
}: {
  initial: Area | null
  onChoose: (place: Destination) => void
}) {
  const t = useAppCopy()
  const container = useRef<HTMLDivElement>(null),
    point = useRef<Destination | null>(null)
  const [ready, setReady] = useState(false),
    [error, setError] = useState(false),
    [name, setName] = useState('')
  const { resolvedTheme } = useTheme()
  useEffect(() => {
    let active = true,
      instance: import('maplibre-gl').Map | undefined
    void Promise.all([
      import('maplibre-gl'),
      import('maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'),
    ])
      .then(([library, worker]) => {
        if (!active || !container.current) return
        library.setWorkerUrl(worker.default)
        instance = new library.Map({
          container: container.current,
          style: `https://tiles.openfreemap.org/styles/${resolvedTheme === 'dark' ? 'dark' : 'positron'}`,
          center: initial ? [initial.lng, initial.lat] : [0, 0],
          zoom: initial ? 10 : 1,
          attributionControl: { compact: true },
        })
        instance.addControl(
          new library.NavigationControl({ showCompass: false }),
          'top-right',
        )
        const update = () => {
          if (!instance) return
          const center = instance.getCenter(),
            bounds = instance.getBounds()
          point.current = {
            lat: center.lat,
            lng: center.lng,
            radius: Math.min(
              20000,
              Math.max(
                1500,
                ((bounds.getNorth() - bounds.getSouth()) * 111000) / 2,
              ),
            ),
            name: '',
          }
        }
        instance.on('moveend', update)
        instance.on('load', () => {
          if (active) {
            update()
            setReady(true)
          }
        })
        instance.on('error', () => {
          if (active) setError(true)
        })
      })
      .catch(() => {
        if (active) setError(true)
      })
    return () => {
      active = false
      instance?.remove()
    }
  }, [resolvedTheme])
  return (
    <>
      <div className={'travel-map-wrap relative'}>
        <div
          ref={container}
          className={
            'travel-map h-[min(360px,_40svh)] rounded-[8px] overflow-hidden'
          }
          role="region"
          aria-label={t('feed.mapInstructions')}
        />
        <Crosshair
          className={
            'travel-crosshair absolute top-[50%] left-[50%] [transform:translate(-50%,_-50%)] pointer-events-none [color:var(--color-tilly-accent)] [filter:drop-shadow(0_0_2px_white)]'
          }
          size={28}
          aria-hidden="true"
        />
      </div>
      <label htmlFor="travel-name">{t('feed.placeName')}</label>
      <input
        id="travel-name"
        maxLength={80}
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder={t('feed.placeNamePlaceholder')}
      />
      {error && !ready && (
        <p role="alert">{t('feed.mapFailed')}</p>
      )}
      <button
        className={
          'app-primary min-h-11.5 mt-3 rounded-[6px] [background:var(--color-tilly-accent)] [color:var(--color-tilly-on-signal)] inline-flex place-items-center p-[10px_20px] text-[14px] items-center justify-center gap-2'
        }
        disabled={!ready}
        onClick={() => {
          if (point.current)
            onChoose({ ...point.current, name: name.trim() || t('feed.selectedArea') })
        }}
      >
        {t('feed.browseArea')}
      </button>
    </>
  )
}
export function PlacePicker({
  open,
  onOpenChange,
  initial,
  onChoose,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  initial: Area | null
  onChoose: (place: Destination) => void
}) {
  const t = useAppCopy()
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={[
          'tilly-dialog [background:var(--color-tilly-bg)] [color:var(--color-tilly-text)] [border:1px_solid_var(--color-tilly-border)] font-sans w-[calc(100%_-_32px)] max-w-[640px] max-h-[calc(100svh_-_32px)] overflow-auto rounded-[var(--radius-photo,_10px)]',
          '[&_input]:min-h-11 [&_input]:[border:1px_solid_var(--color-tilly-border)] [&_input]:rounded-[6px] [&_input]:p-2.5',
        ].join(' ')}
      >
        <DialogTitle>{t('feed.travelling')}</DialogTitle>
        <DialogDescription>
          {t('feed.travelHint')}
        </DialogDescription>
        {open && (
          <PlaceMap
            initial={initial}
            onChoose={(place) => {
              onChoose(place)
              onOpenChange(false)
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
