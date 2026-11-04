import { useState, useEffect, useCallback, useRef } from 'react'

export type LoadStage = 'color' | 'blurhash' | 'thumbnail' | 'full'

const STAGE_ORDER: Record<LoadStage, number> = {
  color: 0,
  blurhash: 1,
  thumbnail: 2,
  full: 3,
}

interface UseProgressiveLoadOptions {
  blurhash?: string
  thumbnailUrl?: string
  fullUrl?: string
  /** For video, we listen for canplay instead of Image load */
  isVideo?: boolean
}

/**
 * State machine for progressive media loading.
 * Stages advance forward: color -> blurhash -> thumbnail -> full.
 * Skips stages when data is missing, and resets when the source changes.
 */
export function useProgressiveLoad({
  blurhash,
  thumbnailUrl,
  fullUrl,
  isVideo,
}: UseProgressiveLoadOptions): { stage: LoadStage; onFullReady: () => void } {
  const [stage, setStage] = useState<LoadStage>('color')

  // The starting point for a given source: the cheapest placeholder we have.
  const baseStage: LoadStage = blurhash
    ? 'blurhash'
    : thumbnailUrl
      ? 'thumbnail'
      : fullUrl
        ? 'full'
        : 'color'

  // Advancing never regresses. `onFullReady` can fire during commit (a cached
  // video reports readyState >= 3 in the ref callback, before any effect runs),
  // so a plain `setStage` in the effects below would clobber `full` back down
  // to `blurhash` and strand the media invisible behind its thumbnail.
  const advance = useCallback((next: LoadStage) => {
    setStage((prev) => (STAGE_ORDER[next] > STAGE_ORDER[prev] ? next : prev))
  }, [])

  const sourceKey = `${fullUrl ?? ''}|${thumbnailUrl ?? ''}|${blurhash ?? ''}`
  const sourceKeyRef = useRef(sourceKey)

  useEffect(() => {
    if (sourceKeyRef.current !== sourceKey) {
      // A genuinely different source — restart the sequence.
      sourceKeyRef.current = sourceKey
      setStage(baseStage)
    } else {
      advance(baseStage)
    }
  }, [sourceKey, baseStage, advance])

  // Preload thumbnail
  useEffect(() => {
    if (!thumbnailUrl || stage === 'full') return
    const img = new Image()
    img.onload = () => advance('thumbnail')
    img.src = thumbnailUrl
  }, [thumbnailUrl, stage, advance])

  // Preload full image (skip for video — caller uses onFullReady via canplay)
  useEffect(() => {
    if (!fullUrl || isVideo) return
    const img = new Image()
    img.onload = () => advance('full')
    img.src = fullUrl
  }, [fullUrl, isVideo, advance])

  const onFullReady = useCallback(() => advance('full'), [advance])

  return { stage, onFullReady }
}
