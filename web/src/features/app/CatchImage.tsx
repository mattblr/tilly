import ProgressiveMedia from '~/components/ProgressiveMedia'
import type { ProgressiveImageSource } from '~/lib/media'
import { useEffect, useState, type ReactNode } from 'react'
import { useAppCopy } from './copy'
export type PhotoSource = string | ProgressiveImageSource | null
export function Photo({
  src,
  alt,
  className,
  active = true,
  size = 'medium',
  fit = 'cover',
  fallback,
}: {
  src: PhotoSource
  alt: string
  className?: string
  active?: boolean
  size?: 'small' | 'medium' | 'large'
  fit?: 'cover' | 'contain'
  fallback?: ReactNode
}) {
  const image = typeof src === 'string' ? { url: src } : src
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [image?.url])
  return image && !failed ? (
    <ProgressiveMedia
      image={image}
      alt={alt}
      fill
      fit={fit}
      className={className}
      active={active}
      imageSize={size}
      onError={() => setFailed(true)}
    />
  ) : (
    (fallback ?? (
      <div
        className={`${className ?? ''} app-photo-missing grid place-items-center bg-tilly-surface text-sm text-tilly-text-secondary`}
        role={alt ? 'img' : undefined}
        aria-label={alt || undefined}
      />
    ))
  )
}
/** Mirrors iOS ArtFlip's 280ms blur/dissolve and six-second IntelligenceGlow. */
export function CatchImage({
  photo,
  art,
  name,
}: {
  photo: PhotoSource
  art: PhotoSource
  name: string
}) {
  const t = useAppCopy()
  const [hovered, setHovered] = useState(false),
    [held, setHeld] = useState(false),
    [focused, setFocused] = useState(false)
  const showingArt = !!art && (hovered || held || focused)
  return (
    <div
      className={`catch-image group/catch relative isolate w-full aspect-[4/5] rounded-[var(--app-photo-radius,10px)] bg-tilly-surface focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-tilly-accent [.sighting-detail_&]:float-left [.sighting-detail_&]:mr-4 [.sighting-detail_&]:mb-2 [.sighting-detail_&]:mt-4 [.sighting-detail_&]:w-[130px] [.sighting-detail_&]:aspect-square [.tilly-art-preview_>_&]:aspect-[3/4] [.cat-timeline_&]:aspect-[4/3] [.cat-timeline_&]:mb-4 ${art ? "cursor-pointer before:pointer-events-none before:absolute before:-inset-[3px] before:z-0 before:rounded-[inherit] before:bg-[conic-gradient(from_var(--catch-angle),#bd82f2,#f5baeb,#8c9eff,#ff6678,#ffba70,#c787ff,#bd82f2)] before:blur-[6px] before:opacity-65 before:content-[''] before:animate-[catch-glow-turn_6s_steps(90)_infinite] motion-reduce:before:animate-none" : ''}`}
      data-art={showingArt}
      role={art ? 'button' : undefined}
      tabIndex={art ? 0 : undefined}
      aria-label={
        art
          ? `${name}. ${t(showingArt ? 'art.flipBack' : 'art.flip')}`
          : undefined
      }
      aria-pressed={art ? showingArt : undefined}
      onPointerEnter={(event) => {
        if (event.pointerType === 'mouse') setHovered(true)
      }}
      onPointerLeave={() => setHovered(false)}
      onPointerUp={(event) => {
        if (art && event.pointerType !== 'mouse') setHeld((value) => !value)
      }}
      onFocus={(event) =>
        setFocused(event.currentTarget.matches(':focus-visible'))
      }
      onBlur={() => {
        setFocused(false)
        setHeld(false)
      }}
      onClick={(event) => {
        if (art && event.detail === 0) {
          setFocused(false)
          setHeld(!showingArt)
        }
      }}
      onKeyDown={(event) => {
        if (art && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault()
          setFocused(false)
          setHeld(!showingArt)
        }
      }}
    >
      <div className="catch-image-clip absolute inset-0 z-20 overflow-hidden rounded-[inherit] bg-tilly-surface">
        <Photo
          src={photo}
          alt={name}
          className="catch-original size-full object-cover transition-[filter] duration-[280ms] ease-in-out group-data-[art=true]/catch:blur-[16px] motion-reduce:blur-none motion-reduce:transition-none"
        />
        {art && (
          <div
            className={[
              'catch-art-layer pointer-events-none absolute inset-0 opacity-0 blur-[16px] transition-[filter,opacity] duration-[280ms] ease-in-out',
              'group-data-[art=true]/catch:opacity-100 group-data-[art=true]/catch:blur-none',
              'motion-reduce:blur-none motion-reduce:transition-none',
            ].join(' ')}
            aria-hidden="true"
          >
            <Photo
              src={art}
              alt=""
              className="catch-art size-full object-cover"
              active={showingArt}
            />
          </div>
        )}
      </div>
      {art && (
        <span
          className={[
            'catch-glow pointer-events-none absolute -inset-[2px] z-10 rounded-[inherit] bg-[conic-gradient(from_var(--catch-angle),#bd82f2,#f5baeb,#8c9eff,#ff6678,#ffba70,#c787ff,#bd82f2)] animate-[catch-glow-turn_6s_steps(90)_infinite]',
            'motion-reduce:animate-none',
          ].join(' ')}
          aria-hidden="true"
        />
      )}
    </div>
  )
}
