import { useRef, useCallback, useEffect } from 'react'
import type {
  ProgressiveImageSource,
  ProgressiveVideoSource,
} from '~/lib/media'
import { isHlsUrl } from '~/lib/media'
import { useProgressiveLoad } from '~/hooks/useProgressiveLoad'
import BlurhashCanvas from './BlurhashCanvas'
import { cn } from '~/lib/utils'

interface ProgressiveMediaProps {
  image?: ProgressiveImageSource
  video?: ProgressiveVideoSource
  alt?: string
  className?: string
  /** Fill the parent container instead of using intrinsic aspect ratio */
  fill?: boolean
  /** How the media sits in its box. Defaults to `cover`. */
  fit?: 'cover' | 'contain'
  /** Video playback. Browser policy requires `muted` for autoplay. */
  autoplay?: boolean
  muted?: boolean
  loop?: boolean
  /**
   * Whether this surface is the one the viewport actually shows. A false
   * value keeps the full asset unloaded — the placeholder layers still
   * render — so the hidden half of a desktop/mobile pair never downloads.
   */
  active?: boolean
  /** Treat as the LCP candidate: decode eagerly at high fetch priority. */
  priority?: boolean
  imageSize?: 'small' | 'medium' | 'large'
  onError?: () => void
}

function pickVariant(
  variants?: Record<string, string>,
  preferred = 'medium',
): string | undefined {
  if (!variants) return undefined
  return (
    variants[preferred] ??
    variants['medium'] ??
    variants['small'] ??
    Object.values(variants)[0]
  )
}

export default function ProgressiveMedia({
  image,
  video,
  alt,
  className,
  fill,
  fit = 'cover',
  autoplay = true,
  muted = true,
  loop = true,
  active = true,
  priority = false,
  imageSize = 'medium',
  onError,
}: ProgressiveMediaProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const cleanupRef = useRef<(() => void) | null>(null)

  const source = video ?? image
  const isVideo = !!video
  const hlsUrl = video?.hlsUrl
  const useHls = !!(hlsUrl && isHlsUrl(hlsUrl) && active)
  const fullUrl = isVideo
    ? video?.url
    : (pickVariant(image?.variants, imageSize) ?? image?.url)

  // Gate the download on `active` so the CSS-hidden half of a
  // desktop/mobile pair never fetches its asset.
  const { stage, onFullReady } = useProgressiveLoad({
    blurhash: source?.blurhash,
    thumbnailUrl: source?.thumbnailUrl,
    fullUrl: active ? fullUrl : undefined,
    isVideo,
  })

  // Ref callback — runs synchronously during commit (before useEffect).
  // Catches the SSR hydration race where canplay fires before React attaches handlers,
  // and also handles client-side navigation by adding direct DOM listeners.
  const videoCallbackRef = useCallback(
    (el: HTMLVideoElement | null) => {
      // Clean up previous listeners
      if (cleanupRef.current) {
        cleanupRef.current()
        cleanupRef.current = null
      }

      videoRef.current = el
      if (!el) return

      // Already loaded (SSR hydration or browser cache)
      if (el.readyState >= 3) {
        onFullReady()
        return
      }

      // Direct DOM listeners — bypass React synthetic events entirely.
      const handler = () => {
        onFullReady()
        el.removeEventListener('canplay', handler)
        el.removeEventListener('playing', handler)
      }
      el.addEventListener('canplay', handler)
      el.addEventListener('playing', handler)

      cleanupRef.current = () => {
        el.removeEventListener('canplay', handler)
        el.removeEventListener('playing', handler)
      }
    },
    [onFullReady],
  )

  // HLS setup — separate from the videoCallbackRef progressive load detection.
  // When HLS is active, the source is attached via hls.js or native Safari HLS,
  // not the <video src> attribute.
  useEffect(() => {
    const el = videoRef.current
    if (!el || !useHls || !hlsUrl) return

    // Safari: native HLS support
    if (el.canPlayType('application/vnd.apple.mpegurl')) {
      el.src = hlsUrl
      return
    }

    // Other browsers: dynamically import hls.js
    let hls: InstanceType<typeof import('hls.js').default> | null = null
    let cancelled = false

    import('hls.js')
      .then((mod) => {
        const Hls = mod.default
        if (cancelled) return
        if (!Hls.isSupported()) {
          if (fullUrl) el.src = fullUrl
          return
        }
        hls = new Hls()
        hls.loadSource(hlsUrl)
        hls.attachMedia(el)
      })
      .catch(() => {
        // hls.js not installed — fall back to direct URL
        if (!cancelled && fullUrl) el.src = fullUrl
      })

    return () => {
      cancelled = true
      if (hls) {
        hls.destroy()
        hls = null
      }
    }
  }, [useHls, hlsUrl, fullUrl])

  // Every hook above runs unconditionally — bail out only afterwards, so the
  // hook order stays stable across renders.
  if (!source) return null

  const w = source.width
  const h = source.height
  const aspect = w && h ? w / h : 16 / 10
  const fitClass = fit === 'contain' ? 'object-contain' : 'object-cover'
  // Autoplay only works muted; coerce rather than trust the authored value.
  const effectiveMuted = autoplay ? true : muted

  return (
    <div
      className={cn(
        'relative overflow-hidden',
        fill && 'h-full w-full',
        className,
      )}
      style={fill ? undefined : { aspectRatio: `${aspect}` }}
    >
      {/* Layer 1: dominant color */}
      {source.dominantColor && (
        <div
          className="absolute inset-0"
          style={{ backgroundColor: source.dominantColor }}
        />
      )}

      {/* Layer 2: blurhash */}
      {source.blurhash && (
        <div
          className={`absolute inset-0 transition-opacity duration-300 ease-in-out ${
            stage === 'color' ? 'opacity-0' : 'opacity-100'
          }`}
        >
          <BlurhashCanvas hash={source.blurhash} />
        </div>
      )}

      {/* Layer 3: thumbnail */}
      {source.thumbnailUrl && (
        <img
          src={source.thumbnailUrl}
          alt=""
          aria-hidden
          className={`absolute inset-0 h-full w-full ${fitClass} transition-opacity duration-400 ease-in-out ${
            stage === 'thumbnail' || stage === 'full'
              ? 'opacity-100'
              : 'opacity-0'
          }`}
        />
      )}

      {/* Layer 4: full media — only mounted for the visible variant, so the
          hidden half of a desktop/mobile pair costs nothing. */}
      {active && fullUrl ? (
        isVideo ? (
          <video
            ref={videoCallbackRef}
            {...(!useHls ? { src: fullUrl } : {})}
            autoPlay={autoplay}
            muted={effectiveMuted}
            loop={loop}
            playsInline
            className={`absolute inset-0 h-full w-full ${fitClass} transition-opacity duration-500 ease-in-out ${
              stage === 'full' ? 'opacity-100' : 'opacity-0'
            }`}
          />
        ) : (
          <img
            src={fullUrl}
            alt={alt ?? ''}
            loading={priority ? 'eager' : 'lazy'}
            onError={onError}
            fetchPriority={priority ? 'high' : 'auto'}
            className={`absolute inset-0 h-full w-full ${fitClass} transition-opacity duration-500 ease-in-out ${
              stage === 'full' ? 'opacity-100' : 'opacity-0'
            }`}
          />
        )
      ) : null}
    </div>
  )
}
