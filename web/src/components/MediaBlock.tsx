import { useSyncExternalStore } from 'react'
import { Link } from '@tanstack/react-router'
import { MediaConfigFitEnum } from '~/generated/foir.content.generated'
import type { MediaFieldsFragment } from '~/generated/foir.content.generated'
import ProgressiveMedia from './ProgressiveMedia'
import { MediaOverlayLayer } from './MediaOverlayLayer'
import { toProgressiveSource, toVideoSource } from '~/lib/media'
import { pagePath } from '~/lib/platform'

// Tailwind's `md` breakpoint. Kept in sync with the `md:hidden` /
// `hidden md:block` wrappers below — both surfaces SSR-render, but only the
// one that matches this query loads its full media.
const DESKTOP_MQ = '(min-width: 768px)'

/**
 * Returns 'desktop' or 'mobile' based on the viewport, or null during SSR and
 * the first render before hydration resolves. Returning null is deliberate:
 * SSR can't know the client's viewport, and a `<video src>` in the wrong
 * branch starts downloading as soon as the HTML is parsed. With null on the
 * server, neither branch's full media is in the SSR HTML — only the matched
 * variant loads after hydration.
 */
function useResponsiveVariant(): 'desktop' | 'mobile' | null {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(DESKTOP_MQ)
      mq.addEventListener('change', cb)
      return () => mq.removeEventListener('change', cb)
    },
    () => (window.matchMedia(DESKTOP_MQ).matches ? 'desktop' : 'mobile'),
    () => null,
  )
}

type MediaImageValue = NonNullable<NonNullable<MediaFieldsFragment['image']>['desktop']>
type MediaVideoValue = NonNullable<NonNullable<MediaFieldsFragment['video']>['desktop']>

function MediaSurface({
  image,
  video,
  alt,
  fitCover,
  autoplay,
  muted,
  loop,
  active = true,
  priority = false,
}: {
  image?: MediaImageValue | null
  video?: MediaVideoValue | null
  alt?: string
  fitCover: boolean
  autoplay: boolean
  muted: boolean
  loop: boolean
  active?: boolean
  priority?: boolean
}) {
  return (
    <ProgressiveMedia
      image={toProgressiveSource(image)}
      video={toVideoSource(video)}
      alt={alt ?? image?.alt ?? undefined}
      // The square wrapper dictates the box, so always fill it and let
      // object-fit decide how the media sits inside: `cover` crops to fill the
      // circle, `contain` letterboxes the whole frame within it.
      fill
      fit={fitCover ? 'cover' : 'contain'}
      className="h-full w-full"
      autoplay={autoplay}
      muted={muted}
      loop={loop}
      active={active}
      priority={priority}
    />
  )
}

/**
 * Editorial media — an image or a video, with an optional content overlay,
 * optionally wrapped in a link.
 *
 * Media renders in a square box and fully rounded (`rounded-full`), so it's
 * always a true circle whatever the source's aspect ratio. `fit` decides how
 * the media sits inside: Cover crops it to fill the circle, Contain letterboxes
 * the whole frame within it. The shape lives here rather than in the CMS
 * because it's a site-wide presentation choice, not per-record content.
 */
export function MediaBlock({
  block,
  priority,
}: {
  block: MediaFieldsFragment
  /** Set on the first block in a page so its media is the LCP candidate. */
  priority?: boolean
}) {
  const variant = useResponsiveVariant()

  const desktopImage = block.image?.desktop ?? null
  const desktopVideo = block.video?.desktop ?? null
  const mobileImage = block.image?.mobile ?? desktopImage
  const mobileVideo = block.video?.mobile ?? desktopVideo

  const hasAny =
    desktopImage || desktopVideo || block.image?.mobile || block.video?.mobile
  if (!hasAny) return null

  const hasMobileSpecific = !!block.image?.mobile || !!block.video?.mobile
  const fitCover = block.config?.fit === MediaConfigFitEnum.cover

  // Unset (null) means "use the sensible default" — ambient looping playback.
  const autoplay = block.config?.autoplay ?? true
  // Autoplay requires muted per browser policy — coerce it on regardless of
  // the authored value.
  const muted = autoplay ? true : (block.config?.muted ?? true)
  const loop = block.config?.loop ?? true
  const alt = block.config?.alt ?? undefined

  // A square box is what makes `rounded-full` a true circle rather than a
  // lozenge, and it gives the media a definite height without depending on any
  // intrinsic aspect ratio — a video-only block has no image to measure, which
  // previously collapsed the whole surface to zero height under `cover`.
  const wrapperClass =
    'relative aspect-square w-full overflow-hidden rounded-full'

  // The dual-render wraps each variant in a viewport-toggle div. It must carry
  // `h-full w-full` or it collapses to content height, breaking the height
  // chain the media's `h-full` resolves against.
  const branchClass = 'h-full w-full'

  const inner = (
    <>
      {hasMobileSpecific ? (
        <>
          <div className={`md:hidden ${branchClass}`}>
            <MediaSurface
              image={mobileImage}
              video={mobileVideo}
              alt={alt}
              fitCover={fitCover}
              autoplay={autoplay}
              muted={muted}
              loop={loop}
              active={variant === 'mobile'}
              priority={priority}
            />
          </div>
          <div className={`hidden md:block ${branchClass}`}>
            <MediaSurface
              image={desktopImage}
              video={desktopVideo}
              alt={alt}
              fitCover={fitCover}
              autoplay={autoplay}
              muted={muted}
              loop={loop}
              active={variant === 'desktop'}
              priority={priority}
            />
          </div>
        </>
      ) : (
        <MediaSurface
          image={desktopImage}
          video={desktopVideo}
          alt={alt}
          fitCover={fitCover}
          autoplay={autoplay}
          muted={muted}
          loop={loop}
          priority={priority}
        />
      )}
      <MediaOverlayLayer
        content={block.overlay?.content}
        settings={block.overlay?.settings}
      />
    </>
  )

  // linkRef takes priority over linkUrl. When neither resolves the block
  // renders as a plain <div>.
  const linkHref = pagePath(block.linkRef) ?? block.linkUrl ?? null

  if (linkHref && (block.linkOpenInNewTab || !linkHref.startsWith('/'))) {
    return (
      <a
        href={linkHref}
        className={`block ${wrapperClass}`}
        {...(block.linkOpenInNewTab
          ? { target: '_blank', rel: 'noopener noreferrer' }
          : {})}
      >
        {inner}
      </a>
    )
  }

  if (linkHref) {
    return (
      <Link to={linkHref} className={`block ${wrapperClass}`}>
        {inner}
      </Link>
    )
  }

  return <div className={wrapperClass}>{inner}</div>
}
