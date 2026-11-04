import { useEffect, useRef } from 'react'
import { useAppCopy } from '~/features/app/copy'

const FRAME_COUNT = 61

interface PixelCatProps {
  className?: string
  size?: number
}

/**
 * Animated pixel art cat — 61-frame sprite animation driven by scroll position.
 * Uses canvas with imageSmoothingEnabled=false for crisp pixel art.
 * Frame advances as the user scrolls down the page.
 */
export function PixelCat({ className = '', size = 120 }: PixelCatProps) {
  const t = useAppCopy()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const framesRef = useRef<HTMLImageElement[]>([])
  const lastFrameRef = useRef(-1)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size (use 2x for retina)
    const dpr = Math.min(window.devicePixelRatio, 2)
    canvas.width = size * dpr
    canvas.height = size * dpr
    canvas.style.width = `${size}px`
    canvas.style.height = `${size}px`

    // Disable smoothing for crisp pixel art (matches iOS .interpolation(.none))
    ctx.imageSmoothingEnabled = false

    // Preload all frames
    let loadedCount = 0
    const images: HTMLImageElement[] = []

    for (let i = 1; i <= FRAME_COUNT; i++) {
      const img = new Image()
      const frameNum = String(i).padStart(3, '0')
      img.src = `/images/cat-frames/frame_${frameNum}.png`

      img.onload = () => {
        loadedCount++
        if (loadedCount === FRAME_COUNT) {
          framesRef.current = images
          // Draw first frame immediately
          drawFrame(ctx, canvas, 0)
          // Start listening for scroll
          window.addEventListener('scroll', onScroll, { passive: true })
          onScroll()
        }
      }

      img.onerror = () => {
        loadedCount++
      }

      images.push(img)
    }

    // Sample background color from corner of first frame
    let bgColor: [number, number, number] | null = null
    const TOLERANCE = 40

    function chromaKey(ctx: CanvasRenderingContext2D, w: number, h: number) {
      const imageData = ctx.getImageData(0, 0, w, h)
      const d = imageData.data

      // Sample bg from top-left corner on first call
      if (!bgColor) {
        bgColor = [d[0], d[1], d[2]]
      }

      const [br, bg, bb] = bgColor
      for (let i = 0; i < d.length; i += 4) {
        if (
          Math.abs(d[i] - br) < TOLERANCE &&
          Math.abs(d[i + 1] - bg) < TOLERANCE &&
          Math.abs(d[i + 2] - bb) < TOLERANCE
        ) {
          d[i + 3] = 0 // make transparent
        }
      }
      ctx.putImageData(imageData, 0, 0)
    }

    function drawFrame(
      ctx: CanvasRenderingContext2D,
      canvas: HTMLCanvasElement,
      frameIndex: number,
    ) {
      const frames = framesRef.current
      if (frames.length === 0) return

      const frame = frames[frameIndex]
      if (!frame) return

      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(frame, 0, 0, canvas.width, canvas.height)
      chromaKey(ctx, canvas.width, canvas.height)
    }

    function onScroll() {
      if (!ctx || !canvas) return
      const scrollTop = window.scrollY
      const maxScroll = document.body.scrollHeight - window.innerHeight
      if (maxScroll <= 0) return

      const progress = Math.min(scrollTop / maxScroll, 1)
      // Map scroll progress to frame index, looping through the animation twice
      const frameIndex = Math.floor(progress * (FRAME_COUNT * 2)) % FRAME_COUNT

      // Only redraw if frame changed
      if (frameIndex !== lastFrameRef.current) {
        lastFrameRef.current = frameIndex
        drawFrame(ctx, canvas, frameIndex)
      }
    }

    return () => {
      window.removeEventListener('scroll', onScroll)
    }
  }, [size])

  return (
    <canvas
      ref={canvasRef}
      className={`select-none [image-rendering:pixelated] ${className}`}
      aria-label={t('website.pixelCat')}
      role="img"
    />
  )
}
