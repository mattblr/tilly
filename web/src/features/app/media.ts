import type { Image } from '@foir/sdk/data'
import { toProgressiveSource } from '../../lib/media'
export type { ProgressiveImageSource } from '../../lib/media'
export function appImage(image: Image | null | undefined) {
  return image ? toProgressiveSource({ ...image, crop: null }) ?? null : null
}
