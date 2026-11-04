import { encounterCopy } from './data'
import { requestArea, type Area } from './location'
import { RoaringCat } from '~/components/RoaringCat'
import { createPortal } from 'react-dom'
import { Link } from '@tanstack/react-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import type { Encounter } from './data'
import { readViewport } from './map-query'
import type { Cell, Viewport } from './viewport'
import { useResource } from './use-resource'
import { useAppSession } from './session'
import { CatchImage, Photo } from './CatchImage'
import { useAppCopy } from './copy'
import { latestSightings } from './map-data'
import { useTheme } from '~/components/ThemeProvider'
import { relativeTime } from '~/lib/location'
import 'maplibre-gl/dist/maplibre-gl.css'
const duration = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 450
function MapCanvas({
  rows,
  fallback,
  cells,
  selected,
  onSelect,
  onViewport,
}: {
  rows: Encounter[]
  fallback: Area | null
  cells: Cell[]
  selected: string | null
  onSelect: (id: string | null) => void
  onViewport: (bounds: Viewport) => void
}) {
  const t = useAppCopy()
  const markerCopy = JSON.stringify([t('explore.cluster.one'), t('explore.cluster.other'), t('explore.cat.one'), t('explore.cat.other'), t('explore.sightingLabel')])
  const container = useRef<HTMLDivElement>(null)
  const map = useRef<import('maplibre-gl').Map | null>(null)
  const current = useRef({ rows, cells, selected, onSelect, onViewport, t })
  current.current = { rows, cells, selected, onSelect, onViewport, t }
  const refreshMarkers = useRef(() => {})
  const [photoHosts, setPhotoHosts] = useState<
    { id: string; host: HTMLElement }[]
  >([])
  const camera = useRef<{ center: [number, number]; zoom: number } | null>(null)
  const { resolvedTheme } = useTheme()
  const locationRequested = useRef(false)
  const [ready, setReady] = useState(false),
    [error, setError] = useState(false)
  useEffect(() => {
    let active = true,
      styleLoaded = false,
      markerFrame = 0
    const hosts = new Map<string, HTMLElement>()
    const markers = new Map<string, import('maplibre-gl').Marker>()
    setReady(false)
    void Promise.all([
      import('maplibre-gl'),
      import('maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'),
    ])
      .then(([library, worker]) => {
        if (!active || !container.current) return
        library.setWorkerUrl(worker.default)
        const instance = new library.Map({
          container: container.current,
          style: `https://tiles.openfreemap.org/styles/${resolvedTheme === 'dark' ? 'dark' : 'positron'}`,
          center:
            camera.current?.center ??
            (fallback ? [fallback.lng, fallback.lat] : [0, 0]),
          zoom: camera.current?.zoom ?? (fallback ? 10 : 1),
          attributionControl: { compact: true },
          cooperativeGestures: true,
        })
        map.current = instance
        let interacted = false
        instance.on('dragstart', () => {
          interacted = true
        })
        instance.on('zoomstart', (event) => {
          if (event.originalEvent) interacted = true
        })
        instance.addControl(
          new library.NavigationControl({ showCompass: false }),
          'top-right',
        )
        const geolocate = new library.GeolocateControl({
          positionOptions: {
            enableHighAccuracy: false,
            timeout: 12000,
            maximumAge: 60000,
          },
          trackUserLocation: false,
          fitBoundsOptions: { maxZoom: 13 },
        })
        instance.addControl(geolocate, 'top-right')
        const renderMarkers = () => {
          if (
            !active ||
            !instance.getSource('sightings') ||
            !instance.isSourceLoaded('sightings')
          )
            return
          const source = instance.getSource(
            'sightings',
          ) as import('maplibre-gl').GeoJSONSource
          const held = new Set<string>()
          const byId = new Map(current.current.rows.map((row) => [row.id, row]))
          for (const feature of instance.queryRenderedFeatures({
            layers: ['sighting-layout', 'area-layout'],
          })) {
            if (feature.geometry.type !== 'Point') continue
            const properties = feature.properties
            const area = properties.area === true
            const cluster = properties.cluster === true || area
            const id = area
              ? `area:${properties.hash}`
              : cluster
                ? `cluster:${properties.cluster_id}`
                : String(properties.id)
            if (held.has(id)) continue
            held.add(id)
            const row = byId.get(String(properties.id))
            if (!cluster && !row) continue
            const selected = row?.id === current.current.selected
            const signature = JSON.stringify([
              feature.geometry.coordinates,
              properties.point_count,
              properties.count,
              row?.postedAt,
              current.current.t('explore.sightingLabel'),
              current.current.t('explore.cluster.one'),
              current.current.t('explore.cluster.other'),
              current.current.t('explore.cat.one'),
              current.current.t('explore.cat.other'),
            ])
            if (
              markers.has(id) &&
              markers.get(id)!.getElement().dataset.signature !== signature
            ) {
              markers.get(id)!.remove()
              markers.delete(id)
              hosts.delete(id)
            }
            if (markers.has(id)) {
              markers
                .get(id)!
                .getElement()
                .setAttribute('aria-pressed', String(selected))
              continue
            }
            const button = document.createElement('button')
            button.type = 'button'
            button.dataset.signature = signature
            button.className = cluster
              ? 'map-area-count flex flex-col justify-center items-center rounded-full [width:64px] [height:64px] [border:3px_solid_var(--color-tilly-surface)] [background:var(--color-tilly-accent)] [color:var(--color-tilly-on-signal)] font-sans cursor-pointer [&_strong]:[font-size:18px] [&_strong]:[font-variant-numeric:tabular-nums] [&_span]:[font-size:11px]'
              : 'map-sighting-pin [background:transparent] [border:0] flex flex-col items-center [gap:4px] cursor-pointer [&_>_span:not(.map-pin-image)]:[padding:2px_6px] [&_>_span:not(.map-pin-image)]:[border-radius:5px] [&_>_span:not(.map-pin-image)]:[background:var(--color-tilly-surface)] [&_>_span:not(.map-pin-image)]:[color:var(--color-tilly-text)] [&_>_span:not(.map-pin-image)]:[font:11px/1.4_var(--font-sans)] [&_>_span:not(.map-pin-image)]:whitespace-nowrap'
            button.setAttribute('aria-pressed', String(selected))
            const coordinates = feature.geometry.coordinates as [number, number]
            if (cluster) {
              const count = Number(
                area ? properties.count : properties.point_count,
              )
              button.setAttribute(
                'aria-label',
                current.current.t(count === 1 ? 'explore.cluster.one' : 'explore.cluster.other', {count: String(count)}),
              )
              const number = document.createElement('strong')
              number.textContent = String(count)
              const label = document.createElement('span')
              label.textContent = current.current.t(count === 1 ? 'explore.cat.one' : 'explore.cat.other')
              button.append(number, label)
              button.addEventListener('click', (event) => {
                event.stopPropagation()
                if (area) {
                  instance.fitBounds(
                    [
                      [Number(properties.west), Number(properties.south)],
                      [Number(properties.east), Number(properties.north)],
                    ],
                    { padding: 60, maxZoom: 16, duration: duration() },
                  )
                  return
                }
                void source
                  .getClusterExpansionZoom(Number(properties.cluster_id))
                  .then((zoom) => {
                    if (active)
                      instance.easeTo({
                        center: coordinates,
                        zoom: Math.min(zoom, 20),
                        duration: duration(),
                      })
                  })
                  .catch(() => {})
              })
            } else if (row) {
              button.setAttribute(
                'aria-label',
                current.current.t('explore.sightingLabel', {name: row.cat, when: relativeTime(row.postedAt, undefined, undefined, current.current.t)}),
              )
              const host = document.createElement('span')
              host.className =
                "map-pin-image [.map-sighting-pin_>_&]:[width:48px] [.map-sighting-pin_>_&]:[height:48px] [.map-sighting-pin_>_&]:rounded-full [.map-sighting-pin_>_&]:object-cover [.map-sighting-pin_>_&]:[border:3px_solid_var(--color-tilly-surface)] [.map-sighting-pin_>_&]:[outline:8px_solid_var(--color-tilly-accent-muted)] [.map-sighting-pin_>_&]:[transition:scale_.2s] [.map-sighting-pin[aria-pressed='true']_>_&]:[scale:1.12] [.map-sighting-pin[aria-pressed='true']_>_&]:[outline-color:var(--color-tilly-accent)] [@media(prefers-reduced-motion:_reduce)]:[.map-sighting-pin_>_&]:[transition:none] block overflow-hidden [background:var(--color-tilly-surface)]"
              hosts.set(id, host)
              button.append(host)
              const label = document.createElement('span')
              label.textContent = `${row.cat} · ${relativeTime(row.postedAt, undefined, undefined, current.current.t)}`
              button.append(label)
              if (Date.now() - Date.parse(row.postedAt ?? '') > 72 * 3600000)
                button.classList.add(
                  ..."map-sighting-older [&:not([aria-pressed='true'])]:[opacity:.65]".split(
                    ' ',
                  ),
                )
              button.addEventListener('click', (event) => {
                event.stopPropagation()
                current.current.onSelect(row.id)
              })
            }
            markers.set(
              id,
              new library.Marker({ element: button, anchor: 'center' })
                .setLngLat(coordinates)
                .addTo(instance),
            )
          }
          for (const [id, marker] of markers)
            if (!held.has(id)) {
              marker.remove()
              markers.delete(id)
              hosts.delete(id)
            }
          const next = [...hosts].map(([id, host]) => ({ id, host }))
          setPhotoHosts((previous) =>
            previous.length === next.length &&
            previous.every(
              (item, index) =>
                item.id === next[index].id && item.host === next[index].host,
            )
              ? previous
              : next,
          )
        }
        // Coalesce source/camera events; marker rendering never moves the camera.
        const scheduleMarkers = () => {
          if (markerFrame || !active) return
          markerFrame = requestAnimationFrame(() => {
            markerFrame = 0
            if (active) renderMarkers()
          })
        }
        refreshMarkers.current = scheduleMarkers
        instance.on('load', () => {
          if (!active) return
          instance.addSource('sightings', {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] },
            cluster: true,
            clusterRadius: 65,
            clusterMaxZoom: 16,
          })
          // The layer makes the source renderable; accessible HTML pins carry its UI.
          instance.addSource('areas', {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] },
          })
          instance.addLayer({
            id: 'area-layout',
            type: 'circle',
            source: 'areas',
            paint: { 'circle-radius': 1, 'circle-opacity': 0 },
          })
          instance.addLayer({
            id: 'sighting-layout',
            type: 'circle',
            source: 'sightings',
            paint: { 'circle-radius': 1, 'circle-opacity': 0 },
          })
          if (!locationRequested.current) {
            locationRequested.current = true
            navigator.geolocation?.getCurrentPosition(
              (position) => {
                if (!active || interacted) return
                instance.easeTo({
                  center: [position.coords.longitude, position.coords.latitude],
                  zoom: 13,
                  duration: duration(),
                })
              },
              () => {
                /* Keep the request's coarse location, or the world view. */
              },
              { enableHighAccuracy: false, maximumAge: 60000, timeout: 12000 },
            )
          }
          styleLoaded = true
          setReady(true)
          setError(false)
          reportViewport()
        })
        const reportViewport = () => {
          const bounds = instance.getBounds(),
            center = instance.getCenter()
          camera.current = {
            center: [center.lng, center.lat],
            zoom: instance.getZoom(),
          }
          current.current.onViewport({
            west: bounds.getWest(),
            east: bounds.getEast(),
            south: bounds.getSouth(),
            north: bounds.getNorth(),
          })
        }
        reportViewport()
        instance.on('idle', scheduleMarkers)
        instance.on('moveend', () => {
          scheduleMarkers()
          reportViewport()
        })
        instance.on('click', () => current.current.onSelect(null))
        instance.on('error', () => {
          if (active && !styleLoaded) setError(true)
        })
      })
      .catch(() => {
        if (active) setError(true)
      })
    return () => {
      active = false
      cancelAnimationFrame(markerFrame)
      refreshMarkers.current = () => {}
      for (const marker of markers.values()) marker.remove()
      map.current?.remove()
      map.current = null
    }
  }, [resolvedTheme])
  useEffect(() => {
    if (!ready) return
    const source = map.current?.getSource('sightings') as
      import('maplibre-gl').GeoJSONSource | undefined
    source?.setData({
      type: 'FeatureCollection',
      features: rows.flatMap((row) =>
        row.area
          ? [
              {
                type: 'Feature' as const,
                geometry: {
                  type: 'Point' as const,
                  coordinates: [row.area.lng, row.area.lat],
                },
                properties: { id: row.id },
              },
            ]
          : [],
      ),
    })
    const areas = map.current?.getSource('areas') as
      import('maplibre-gl').GeoJSONSource | undefined
    areas?.setData({
      type: 'FeatureCollection',
      features: cells.map((cell) => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [cell.lng, cell.lat] },
        properties: {
          area: true,
          hash: cell.hash,
          count: cell.count,
          ...cell.bounds,
        },
      })),
    })
  }, [ready, rows, cells, markerCopy])
  useEffect(() => {
    refreshMarkers.current()
    const row = current.current.rows.find((row) => row.id === selected)
    if (ready && row?.area)
      map.current?.easeTo({
        center: [row.area.lng, row.area.lat],
        zoom: Math.max(map.current.getZoom(), 13),
        offset: [0, -100],
        duration: duration(),
      })
  }, [selected, ready])
  return (
    <>
      {photoHosts.map(({ id, host }) =>
        createPortal(
          <Photo
            src={rows.find((row) => row.id === id)?.photo ?? null}
            alt=""
            className={'map-pin-photo rounded-full'}
            size="small"
          />,
          host,
          id,
        ),
      )}
      <div
        ref={container}
        className={[
          'explore-canvas h-[calc(100svh_-_var(--header-height,_80px)_-_150px)] min-h-90 max-h-[900px]',
          'max-[700px]:h-[calc(100svh_-_130px)] max-[700px]:min-h-115',
        ].join(' ')}
        role="region"
        aria-label={t('explore.mapLabel')}
      />
      {error && (
        <p
          className={[
            'explore-map-error absolute left-[16px] right-[60px] bottom-[20px] [background:var(--color-tilly-bg)] [color:var(--color-tilly-text)] p-4 text-[14px]',
            '[&_button]:underline [&_button]:min-h-11',
          ].join(' ')}
          role="status"
        >
          {t('explore.mapFailed')}
        </p>
      )}
    </>
  )
}

function SightingPanel({
  row,
  previous,
  next,
  dismiss,
}: {
  row: Encounter
  previous: () => void
  next: () => void
  dismiss: () => void
}) {
  const t = useAppCopy()
  const [expanded, setExpanded] = useState(false)
  const drag = useRef<number | null>(null)
  const dragged = useRef(false)
  return (
    <section
      className={[
        'sighting-panel absolute bottom-[18px] left-[50%] [translate:-50%_0] w-[min(440px,_calc(100%_-_32px))] p-[0_20px_16px] rounded-[25px] [background:var(--color-tilly-bg)] [color:var(--color-tilly-text)] [animation:sighting-arrive_.25s_ease-out]',
        'max-[700px]:bottom-[30px] max-[700px]:w-[calc(100%_-_16px)]',
        'motion-reduce:[animation:none]',
      ].join(' ')}
      aria-label={row.cat}
      onKeyDown={(event) => {
        if (event.key === 'Escape') dismiss()
      }}
    >
      <button
        className={[
          'sighting-grabber w-full h-7.5 flex justify-center items-center [touch-action:none]',
          '[&_>_span]:w-8.5 [&_>_span]:h-1.25 [&_>_span]:rounded-[10px] [&_>_span]:[background:var(--color-tilly-border)]',
        ].join(' ')}
        aria-label={t(expanded ? 'explore.collapse' : 'explore.expand')}
        aria-expanded={expanded}
        onClick={() => {
          if (!dragged.current) setExpanded((value) => !value)
        }}
        onPointerDown={(event) => {
          drag.current = event.clientY
          dragged.current = false
          event.currentTarget.setPointerCapture(event.pointerId)
        }}
        onPointerUp={(event) => {
          if (drag.current !== null) {
            const distance = event.clientY - drag.current
            dragged.current = Math.abs(distance) > 8
            if (distance < -35) setExpanded(true)
            else if (distance > 55) {
              if (expanded) setExpanded(false)
              else dismiss()
            }
          }
          drag.current = null
        }}
      >
        <span aria-hidden="true" />
      </button>
      <button
        className={[
          'sighting-dismiss absolute top-[8px] right-[6px] w-11 h-11 grid place-items-center rounded-full',
          'hover:[background:var(--color-tilly-surface)]',
        ].join(' ')}
        onClick={dismiss}
        aria-label={t('explore.dismiss')}
      >
        <X size={18} />
      </button>
      <div
        className={[
          'sighting-summary flex items-center gap-3.5 pr-4.5',
          '[&_h2]:[font:600_23px/1.2_var(--font-sans)] [&_h2]:m-[0_0_5px]',
          '[&_p]:text-[12px] [&_p]:leading-[1.5] [&_p]:[color:var(--color-tilly-text-secondary)]',
        ].join(' ')}
      >
        <Photo
          src={row.photo}
          alt=""
          className={
            'sighting-thumb w-17.5 h-17.5 object-cover rounded-[var(--app-photo-radius,_10px)] flex-none'
          }
          size="small"
        />
        <div>
          <h2>
            {row.catId ? (
              <Link to="/cats/$catId" params={{ catId: row.catId }}>
                {row.cat}
              </Link>
            ) : (
              row.cat
            )}
          </h2>
          <p>
            {t('explore.panel.lastSpotted', {
              when: relativeTime(row.postedAt, undefined, undefined, t),
            })}
          </p>
          <p>{t('explore.panel.footer')}</p>
        </div>
      </div>
      <div
        className={[
          'sighting-detail grid [grid-template-rows:0fr] [transition:grid-template-rows_.25s_ease]',
          "[&[data-expanded='true']]:[grid-template-rows:1fr]",
          '[&_>_div]:overflow-hidden',
          '[&_p]:mt-4 [&_p]:text-[14px] [&_p]:leading-[1.55] [&_p]:[overflow-wrap:anywhere]',
          'motion-reduce:[transition:none]',
        ].join(' ')}
        data-expanded={expanded}
      >
        <div>
          {expanded && (
            <>
              <CatchImage photo={row.photo} art={row.art} name={row.cat} />
              <p>{row.note || t('explore.panel.noNotes')}</p>
              <p
                className={[
                  'sighting-by',
                  '[.sighting-detail_&]:text-[12px] [.sighting-detail_&]:[color:var(--color-tilly-text-secondary)]',
                ].join(' ')}
              >
                {t('cat.caughtBy', { catcher: row.author })}
              </p>
            </>
          )}
        </div>
      </div>
      <div
        className={[
          'sighting-browse flex justify-between gap-4 mt-3',
          '[&_button]:inline-flex [&_button]:items-center [&_button]:gap-1.5 [&_button]:min-h-11 [&_button]:text-[13px]',
        ].join(' ')}
      >
        <button onClick={previous}>
          <ChevronLeft size={16} />
          {t('explore.previous')}
        </button>
        <button onClick={next}>
          {t('explore.next')}
          <ChevronRight size={16} />
        </button>
      </div>
    </section>
  )
}

export function WorldMap() {
  const t = useAppCopy(),
    { client, ready, user, revision, locale } = useAppSession()
  const fallback = useResource(() => requestArea(), [])
  const [selected, setSelected] = useState<string | null>(null)
  const [viewport, setViewport] = useState<Viewport | null>(null),
    [settled, setSettled] = useState<Viewport | null>(null)
  useEffect(() => {
    const timer = setTimeout(() => setSettled(viewport), 180)
    return () => clearTimeout(timer)
  }, [viewport])
  const resource = useResource(
    async () =>
      ready && settled
        ? readViewport(client, settled, locale)
        : { rows: [], cells: [] },
    [client, ready, user?.id, revision, settled, locale],
  )
  const rows = (resource.data?.rows ?? []).map(row=>encounterCopy(row,t)),
    cells = resource.data?.cells ?? []
  const busy = resource.busy || !settled,
    error = resource.error
  const sightings = useMemo(() => latestSightings(rows), [rows])
  const chosen = sightings.find((row) => row.id === selected)
  const step = (direction: number) => {
    const index = sightings.findIndex((row) => row.id === selected)
    setSelected(
      sightings[(index + direction + sightings.length) % sightings.length]
        ?.id ?? null,
    )
  }
  const onViewport = (bounds: Viewport) =>
    setViewport((previous) =>
      previous &&
      Object.keys(bounds).every(
        (key) =>
          Math.abs(
            bounds[key as keyof Viewport] - previous[key as keyof Viewport],
          ) < 0.000001,
      )
        ? previous
        : bounds,
    )
  const count =
    sightings.length + cells.reduce((sum, cell) => sum + cell.count, 0)
  return (
    <section
      className={[
        'app-page w-full max-w-[var(--page-width,_1200px)] px-[var(--page-gutter,_20px)] mx-[auto] py-[var(--gap-lg,_40px)_80px] explore-page pt-[var(--gap-md,_24px)] pb-6',
        'max-[700px]:pt-7 max-[700px]:pt-4',
        'min-[768px]:px-[var(--page-gutter-md,_28px)]',
      ].join(' ')}
    >
      <div
        className={
          'explore-stage relative rounded-[var(--app-photo-radius,_10px)] overflow-hidden [background:var(--color-tilly-surface)]'
        }
      >
        {!fallback.busy && (
          <MapCanvas
            fallback={fallback.data}
            rows={sightings}
            cells={cells}
            selected={selected}
            onSelect={setSelected}
            onViewport={onViewport}
          />
        )}
        <div
          className={[
            'explore-heading absolute top-[16px] left-[16px] max-w-[calc(100%_-_80px)] p-[12px_16px] rounded-[14px] [color:var(--color-tilly-text)] [background:var(--color-tilly-bg)] pointer-events-none',
            '[&_h1]:[font:600_20px/1.2_var(--font-sans)] [&_h1]:mb-1',
            '[&_p]:text-[12px] [&_p]:[color:var(--color-tilly-text-secondary)]',
            'max-[700px]:top-[10px] max-[700px]:left-[10px] max-[700px]:p-[10px_12px]',
          ].join(' ')}
        >
          <h1>{t('navigation.map')}</h1>
          <p>
            {busy && !rows.length
              ? ''
              : count
                ? t(count === 1 ? 'explore.summary.one' : 'explore.summary.other', {count: String(count)})
                : t('explore.none')}
          </p>
        </div>
        {busy && !rows.length && (
          <div
            className={
              'explore-loading absolute inset-0 grid place-items-center pointer-events-none'
            }
          >
            <RoaringCat label={t('feed.loading.following')} />
          </div>
        )}
        {chosen && (
          <SightingPanel
            key={chosen.id}
            row={chosen}
            previous={() => step(-1)}
            next={() => step(1)}
            dismiss={() => setSelected(null)}
          />
        )}
        {error && (
          <p
            className={[
              'explore-map-error absolute left-[16px] right-[60px] bottom-[20px] [background:var(--color-tilly-bg)] [color:var(--color-tilly-text)] p-4 text-[14px]',
              '[&_button]:underline [&_button]:min-h-11',
            ].join(' ')}
            role="alert"
          >
            {error} <button onClick={resource.reload}>{t('common.retry')}</button>
          </p>
        )}
      </div>
    </section>
  )
}
