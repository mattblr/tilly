import { toProgressiveSource, type ProgressiveImageSource } from './media'
import seed from '../../content/seed.json'
import type { PageData } from './platform'

const defaults = seed.homeCopy

export type HomeCopy = typeof defaults
export type HomeCopyKey = keyof HomeCopy
export type CopyEntry = { key?: string | null; value?: string | null }
export type HomeImage = { url: string; alt: string; source?: ProgressiveImageSource }
const images = {
  cat: {
    url: '/images/app/cat.webp',
    alt: defaults['image.cat.alt'],
  },
  street: {
    url: '/images/app/street.webp',
    alt: defaults['image.street.alt'],
  },
  friends: {
    url: '/images/app/friends.webp',
    alt: defaults['image.friends.alt'],
  },
  art: {
    url: '/images/app/cubist-cat.webp',
    alt: defaults['image.art.alt'],
  },
}
export type HomeImages = Record<keyof typeof images, HomeImage>

/** Native ui-copy fields retain Fóir's locale resolution; missing entries use the example copy. */
export function resolveHomeCopy(entries: readonly CopyEntry[] = []): HomeCopy {
  const copy = { ...defaults }
  for (const entry of entries) {
    if (
      entry.key &&
      Object.hasOwn(copy, entry.key) &&
      typeof entry.value === 'string'
    )
      copy[entry.key as HomeCopyKey] = entry.value
  }
  return copy
}

function safeImageUrl(url: string) {
  return /^https:\/\//i.test(url) || /^\/(?!\/)/.test(url)
}

/** The first four image blocks on page/home override cat, street, friends and art. */
export function resolveHomeImages(
  page?: PageData | null,
  copy = resolveHomeCopy(),
): HomeImages {
  const result: HomeImages = { ...images }
  for (const key of Object.keys(images) as (keyof HomeImages)[]) {
    const url = copy[`image.${key}.url`]
    result[key] = {
      url: safeImageUrl(url) ? url : images[key].url,
      alt: copy[`image.${key}.alt`],
    }
  }
  const media = (page?.blocks?.entries ?? []).filter(
    (entry) => entry?.__typename === 'EditorialMedia',
  )
  for (const [index, key] of (
    Object.keys(images) as (keyof HomeImages)[]
  ).entries()) {
    const image = media[index]?.image?.desktop
    // Public site media must have a normal HTTPS or same-origin asset URL.
    if (image?.url && safeImageUrl(image.url))
      result[key] = {
        source: toProgressiveSource(image),
        url: image.url,
        alt: image.alt ?? media[index]?.config?.alt ?? copy[`image.${key}.alt`],
      }
  }
  return result
}

export const defaultHomeCopy = resolveHomeCopy()
export const defaultHomeImages = resolveHomeImages()
