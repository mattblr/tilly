import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { useAppCopy } from '~/features/app/copy'
import { TillyAvatar } from '~/components/TillyAvatar'
import { worldCellCenter } from '~/lib/location'
import type { WorldActivity } from '~/features/app/data'

/** A user-controlled globe. No animation loop offscreen, hidden or in reduced motion. */
export function Globe({
  recent,
  pulse,
}: {
  recent: WorldActivity['recent']
  pulse: string | null
}) {
  const t = useAppCopy()
  const canvas = useRef<HTMLCanvasElement>(null)
  // One avatar per coarse region prevents stacked markers and reveals no user identity.
  const regions = useMemo(
    () => [
      ...new Map(
        [...recent].reverse().map((capture) => [capture.cell, capture]),
      ).values(),
    ],
    [recent],
  )
  const current = useRef({ recent: regions, pulse })
  current.current = { recent: regions, pulse }
  const redraw = useRef<() => void>(() => {})
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    redraw.current()
  }, [recent, pulse])
  useEffect(() => {
    const element = canvas.current
    if (!element) return
    let disposed = false,
      visible = false,
      phi = 0,
      theta = 0.25
    let timer: ReturnType<typeof setTimeout> | undefined
    let drag: { id: number; x: number; y: number } | null = null
    let globe: import('cobe').Globe | null = null
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const markers = () =>
      current.current.recent.flatMap((capture) => {
        const point = worldCellCenter(capture.cell)
        return point && capture.cell
          ? [
              {
                location: [point.lat, point.lng] as [number, number],
                size: CSS.supports('anchor-name: --probe') ? 0.001 : 0.035,
                id: capture.cell,
              },
            ]
          : []
      })
    const draw = () => {
      if (!disposed && visible && !document.hidden)
        globe?.update({ phi, theta, markers: markers() })
    }
    redraw.current = draw
    const schedule = () => {
      clearTimeout(timer)
      draw()
      if (
        !disposed &&
        globe &&
        visible &&
        !document.hidden &&
        !motion.matches &&
        !drag
      ) {
        timer = setTimeout(() => {
          phi += 0.003
          schedule()
        }, 1000 / 15)
      }
    }
    const observer = new IntersectionObserver((entries) => {
      visible = entries[0]?.isIntersecting ?? false
      schedule()
    })
    observer.observe(element)
    const resize = new ResizeObserver(() => {
      const width = Math.min(element.clientWidth || 480, 640)
      globe?.update({ width: width * 1.5, height: width * 1.5 })
      draw()
    })
    resize.observe(element)
    const down = (event: PointerEvent) => {
      if (!event.isPrimary || event.button !== 0) return
      drag = { id: event.pointerId, x: event.clientX, y: event.clientY }
      element.setPointerCapture(event.pointerId)
      schedule()
    }
    const move = (event: PointerEvent) => {
      if (!drag || event.pointerId !== drag.id) return
      phi += (event.clientX - drag.x) / 160
      theta = Math.max(
        -1.2,
        Math.min(1.2, theta + (event.clientY - drag.y) / 240),
      )
      drag.x = event.clientX
      drag.y = event.clientY
      draw()
    }
    const end = (event: PointerEvent) => {
      if (!drag || event.pointerId !== drag.id) return
      drag = null
      if (element.hasPointerCapture(event.pointerId))
        element.releasePointerCapture(event.pointerId)
      schedule()
    }
    const key = (event: KeyboardEvent) => {
      if (
        !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home'].includes(
          event.key,
        )
      )
        return
      event.preventDefault()
      if (event.key === 'ArrowLeft') phi -= 0.2
      if (event.key === 'ArrowRight') phi += 0.2
      if (event.key === 'ArrowUp') theta = Math.min(1.2, theta + 0.15)
      if (event.key === 'ArrowDown') theta = Math.max(-1.2, theta - 0.15)
      if (event.key === 'Home') {
        phi = 0
        theta = 0.25
      }
      draw()
    }
    element.addEventListener('pointerdown', down)
    element.addEventListener('pointermove', move)
    element.addEventListener('pointerup', end)
    element.addEventListener('pointercancel', end)
    element.addEventListener('lostpointercapture', end)
    element.addEventListener('keydown', key)
    document.addEventListener('visibilitychange', schedule)
    motion.addEventListener('change', schedule)
    void import('cobe')
      .then(({ default: createGlobe }) => {
        if (disposed) return
        const width = Math.min(element.clientWidth || 480, 640)
        globe = createGlobe(element, {
          width: width * 1.5,
          height: width * 1.5,
          devicePixelRatio: 1.5,
          phi,
          theta,
          dark: 0,
          diffuse: 1.4,
          mapSamples: 12000,
          mapBrightness: 5,
          baseColor: [0.93, 0.95, 0.99],
          markerColor: [0.08, 0.35, 0.87],
          glowColor: [0, 0, 0],
          markers: markers(),
          opacity: 1,
        })
        schedule()
      })
      .catch(() => {
        if (!disposed) setFailed(true)
      })
    return () => {
      disposed = true
      clearTimeout(timer)
      observer.disconnect()
      resize.disconnect()
      globe?.destroy()
      redraw.current = () => {}
      element.removeEventListener('pointerdown', down)
      element.removeEventListener('pointermove', move)
      element.removeEventListener('pointerup', end)
      element.removeEventListener('pointercancel', end)
      element.removeEventListener('lostpointercapture', end)
      element.removeEventListener('keydown', key)
      document.removeEventListener('visibilitychange', schedule)
      motion.removeEventListener('change', schedule)
    }
  }, [])
  return (
    <div
      className={[
        'world-globe relative w-full aspect-[1] max-w-[540px] m-[auto]',
        '[&_canvas]:w-full [&_canvas]:h-full',
      ].join(' ')}
    >
      {failed ? (
        <div
          className={
            'world-globe-fallback h-full grid place-items-center rounded-full [background:#1558df] [color:white] [font:24px_Georgia,_serif]'
          }
        >
          {t('website.globeFallback')}
        </div>
      ) : (
        <canvas
          ref={canvas}
          tabIndex={0}
          role="img"
          className={[
            'world-globe-interactive [cursor:grab] [touch-action:pan-y]',
            '[&:active]:[cursor:grabbing]',
            'focus-visible:[outline:3px_solid_var(--color-tilly-accent)] focus-visible:[outline-offset:4px] focus-visible:rounded-full',
          ].join(' ')}
          aria-label={t('website.globeInstructions')}
        />
      )}
      {!failed &&
        regions
          .filter((capture) => worldCellCenter(capture.cell))
          .map((capture) => (
            <span
              key={capture.cell}
              aria-hidden="true"
              className={`pointer-events-none absolute left-[anchor(center)] top-[anchor(center)] z-10 hidden -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-sm [position-anchor:var(--globe-anchor)] [opacity:var(--globe-visible)] transition-[opacity,scale] supports-[anchor-name:--probe]:block motion-reduce:transition-none ${pulse === capture.id ? 'scale-125' : 'scale-100'}`}
              style={
                {
                  '--globe-anchor': `--cobe-${capture.cell}`,
                  '--globe-visible': `var(--cobe-visible-${capture.cell}, 0)`,
                } as CSSProperties
              }
            >
              <TillyAvatar
                seed={`region:${capture.cell}`}
                size={28}
                motion={false}
              />
            </span>
          ))}
    </div>
  )
}
