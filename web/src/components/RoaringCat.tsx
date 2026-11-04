import { useEffect, useRef, useState } from 'react'
import { useAppCopy } from '~/features/app/copy'
const frameCount = 61
const framesPerSecond = 20
const frameSource = (index: number) =>
  `/images/roaring-cat/frame_${String(index + 1).padStart(3, '0')}.png`
const stillFrame = frameSource(Math.floor(frameCount / 2))

// Cache immutable public artwork only; loading several lists reuses the frames.
let frames: Promise<HTMLImageElement[]> | undefined
function loadFrames() {
  return (frames ??= Promise.all(
    Array.from(
      { length: frameCount },
      (_, index) =>
        new Promise<HTMLImageElement>((resolve, reject) => {
          const image = new Image()
          image.onload = () => resolve(image)
          image.onerror = reject
          image.src = frameSource(index)
        }),
    ),
  ).catch((error: unknown) => {
    frames = undefined
    throw error
  }))
}

/** Matches iOS RoaringCat: 61 frames at 20fps, holding mid-roar for reduced motion. */
export function RoaringCat({
  size = 88,
  label,
  compact = false,
}: {
  size?: number
  label?: string
  compact?: boolean
}) {
  const t = useAppCopy()
  const loadingLabel = label ?? t('website.loading')
  const canvas = useRef<HTMLCanvasElement>(null)
  const [drawn, setDrawn] = useState(false)
  useEffect(() => {
    const element = canvas.current
    const context = element?.getContext('2d')
    if (!element || !context) return
    setDrawn(false)
    context.imageSmoothingEnabled = false
    let disposed = false
    let visible = false
    let loaded: HTMLImageElement[] = []
    let loading = false
    let didDraw = false
    let timer: ReturnType<typeof setTimeout> | undefined
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const stop = () => {
      clearTimeout(timer)
      timer = undefined
    }
    const tick = () => {
      stop()
      if (disposed || !visible || document.hidden || motion.matches) return
      if (loaded.length) {
        const index =
          Math.floor((Date.now() / 1000) * framesPerSecond) % frameCount
        context.clearRect(0, 0, size, size)
        context.drawImage(loaded[index], 0, 0, size, size)
        if (!didDraw) {
          didDraw = true
          setDrawn(true)
        }
      }
      timer = setTimeout(tick, 1000 / framesPerSecond)
    }
    const sync = () => {
      stop()
      if (disposed || !visible || document.hidden || motion.matches) return
      if (!loaded.length && !loading) {
        loading = true
        void loadFrames()
          .then((value) => {
            if (disposed) return
            loaded = value
            tick()
          })
          .catch(() => {
            // Keep the server-rendered still and loading label if a frame fails.
          })
      }
      tick()
    }
    const observer = new IntersectionObserver((entries) => {
      visible = entries[0]?.isIntersecting ?? false
      sync()
    })
    observer.observe(element)
    document.addEventListener('visibilitychange', sync)
    motion.addEventListener('change', sync)
    return () => {
      disposed = true
      stop()
      observer.disconnect()
      document.removeEventListener('visibilitychange', sync)
      motion.removeEventListener('change', sync)
    }
  }, [size])
  return (
    <div
      className={`roaring-loader flex [grid-column:1_/_-1] items-center justify-center flex-col [gap:10px] [min-height:180px] [color:var(--color-tilly-text-secondary)] [font:13px/1.5_var(--font-sans)]${compact ? ' roaring-loader-compact [min-height:auto] [padding-block:14px]' : ''}`}
      role="status"
    >
      <span
        className={[
          'roaring-loader-art relative block flex-none',
          '[&_img]:absolute [&_img]:inset-0 [&_img]:w-full [&_img]:h-full [&_img]:[image-rendering:pixelated]',
          '[&_canvas]:absolute [&_canvas]:inset-0 [&_canvas]:w-full [&_canvas]:h-full [&_canvas]:[image-rendering:pixelated] [&_canvas]:opacity-0',
          '[&[data-drawn="true"]_canvas]:opacity-100',
          '[&[data-drawn="true"]_img]:invisible',
          'motion-reduce:[&[data-drawn="true"]_img]:[visibility:visible]',
          'motion-reduce:[&[data-drawn="true"]_canvas]:opacity-0',
        ].join(' ')}
        data-drawn={drawn}
        style={{ width: size, height: size }}
        aria-hidden="true"
      >
        <img src={stillFrame} width={size} height={size} alt="" />
        <canvas ref={canvas} width={size} height={size} />
      </span>
      <span className="sr-only">{loadingLabel}</span>
    </div>
  )
}
