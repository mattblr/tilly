import type { ImageFieldsFragment, VideoFieldsFragment } from '~/generated/foir.content.generated';

// --- Rich media types ---

/** Image source with progressive loading data */
export interface ProgressiveImageSource {
  url: string;
  width?: number;
  height?: number;
  blurhash?: string;
  dominantColor?: string;
  thumbnailUrl?: string;
  variants?: Record<string, string>;
}

/** Video source with progressive loading data */
export interface ProgressiveVideoSource {
  url: string;
  hlsUrl?: string;
  width?: number;
  height?: number;
  blurhash?: string;
  dominantColor?: string;
  thumbnailUrl?: string;
  previewUrl?: string;
  duration?: number;
}

/** Check if a URL points to an HLS stream */
export function isHlsUrl(url: string): boolean {
  return url.includes('.m3u8');
}

/**
 * Flatten the platform's structured `ImageVariantSet` (each entry an
 * `ImageVariant { url, width, height }`) into the flat `size -> url` map
 * `ProgressiveMedia` picks from. Entries the pipeline hasn't produced are
 * omitted rather than left undefined.
 */
function toVariantMap(
  variants: ImageFieldsFragment['variants'],
): Record<string, string> | undefined {
  if (!variants) return undefined;
  const map: Record<string, string> = {};
  for (const size of ['small', 'medium', 'large'] as const) {
    const url = variants[size]?.url;
    if (url) map[size] = url;
  }
  return Object.keys(map).length ? map : undefined;
}

/** Extract a ProgressiveImageSource from a CMS image value */
export function toProgressiveSource(
  img: ImageFieldsFragment | null | undefined,
): ProgressiveImageSource | undefined {
  if (!img?.url) return undefined;
  return {
    url: img.url,
    width: img.width ?? undefined,
    height: img.height ?? undefined,
    blurhash: img.blurhash ?? undefined,
    dominantColor: img.dominantColor ?? undefined,
    thumbnailUrl: img.variants?.thumbnail?.url,
    variants: toVariantMap(img.variants),
  };
}

/** Extract a ProgressiveVideoSource from a CMS video value */
export function toVideoSource(
  v: VideoFieldsFragment | null | undefined,
): ProgressiveVideoSource | undefined {
  if (!v?.url) return undefined;
  return {
    url: v.url,
    hlsUrl: v.hlsManifestUrl ?? undefined,
    width: v.width ?? undefined,
    height: v.height ?? undefined,
    blurhash: v.blurhash ?? undefined,
    dominantColor: v.dominantColor ?? undefined,
    thumbnailUrl: v.thumbnailUrl ?? undefined,
    previewUrl: v.previewUrl ?? undefined,
    duration: v.duration ?? undefined,
  };
}
