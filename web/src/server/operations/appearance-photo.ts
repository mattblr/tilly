import type { QueryClient } from './types'
import { operationPhotoUrl } from './files'
import { backingFileId } from './content-safety'

export class AppearancePhotoRefusal extends Error {
  constructor() { super('A small, upright photo could not be prepared for analysis.') }
}
const refuse = (): never => { throw new AppearancePhotoRefusal() }
const LIMIT = 3 * 1024 * 1024
/** Validate framing/dimensions and remove every APP/COM segment, including
 * between progressive scans. No EXIF, XMP, ICC, GPS, comments or trailing bytes
 * leave the operation. This is a lossless metadata sanitizer, not a decoder.
 * An oriented original must be normalized by the native image variant first. */
export function analysisJpeg(input: Uint8Array): {bytes: Uint8Array; width: number; height: number} {
  if (!input.length || input.length > LIMIT || input[0] !== 255 || input[1] !== 216) return refuse()
  const parts = [input.subarray(0, 2)]
  let offset = 2, width = 0, height = 0, scans = 0, dimensions = false
  const word = (at: number) => input[at] * 256 + input[at + 1]
  while (offset < input.length) {
    const start = offset
    if (input[offset++] !== 255) return refuse()
    while (input[offset] === 255) offset++
    const marker = input[offset++]
    if (marker === 217) {
      if (offset !== input.length || !dimensions || scans === 0) return refuse()
      parts.push(input.subarray(start, offset))
      const bytes = new Uint8Array(parts.reduce((n, part) => n + part.length, 0))
      let at = 0; for (const part of parts) { bytes.set(part, at); at += part.length }
      return {bytes, width, height}
    }
    if (offset + 2 > input.length) return refuse()
    const length = word(offset), end = offset + length
    if (length < 2 || end > input.length) return refuse()
    const metadata = (marker >= 224 && marker <= 239) || marker === 254
    if (marker === 225) checkExifOrientation(input.subarray(offset + 2, end))
    if (marker === 192 || marker === 194) {
      if (dimensions || length < 8 || input[offset + 2] !== 8) return refuse()
      height = word(offset + 3); width = word(offset + 5)
      const components = input[offset + 7]
      if (!width || !height || width > 1024 || height > 1024 || ![1,3].includes(components) || length !== 8 + components * 3) return refuse()
      dimensions = true
    } else if (!metadata && ![196, 219, 221, 218].includes(marker)) return refuse()
    if (!metadata) parts.push(input.subarray(start, end))
    offset = end
    if (marker === 218) {
      if (!dimensions || ++scans > 64) return refuse()
      const entropy = offset
      while (offset < input.length) {
        if (input[offset] !== 255) { offset++; continue }
        let code = offset + 1
        while (input[code] === 255) code++
        if (input[code] === 0 || (input[code] >= 208 && input[code] <= 215)) { offset = code + 1; continue }
        break
      }
      parts.push(input.subarray(entropy, offset))
    }
  }
  return refuse()
}
function checkExifOrientation(segment: Uint8Array) {
  if (segment.length < 6 || String.fromCharCode(...segment.subarray(0,6)) !== 'Exif\0\0') return
  const data = segment.subarray(6)
  if (data.length < 8) return refuse()
  const little = data[0] === 73 && data[1] === 73
  if (!little && !(data[0] === 77 && data[1] === 77)) return refuse()
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength)
  if (view.getUint16(2, little) !== 42) return refuse()
  const first = view.getUint32(4, little)
  if (first < 8 || first + 2 > data.length) return refuse()
  const count = view.getUint16(first, little)
  if (count > 1024 || first + 2 + count * 12 + 4 > data.length) return refuse()
  for (let index = 0; index < count; index++) {
    const entry = first + 2 + index * 12
    if (view.getUint16(entry,little) === 274 && (view.getUint16(entry+2,little) !== 3 ||
      view.getUint32(entry+4,little) !== 1 || view.getUint16(entry+8,little) !== 1)) return refuse()
  }
}
/** Only the served small JPEG variant is accepted: never invent a transform
 * URL, forward the original, or send a private CDN bearer to the provider. */
export async function readAppearancePhoto(foir: QueryClient, captureId: string, fileId: string, filesOrigin?: string) {
  const result = await foir.raw<{capturePhoto: {photo: {variants: {small: {url: string; width: number; height: number} | null} | null} | null} | null}>(
    'query AppearanceDerivative($id: String) { capturePhoto(id: $id) { photo { variants(format: JPEG) { small { url width height } } } } }', {id: captureId})
  const image = result.capturePhoto?.photo?.variants?.small
  if (!image || !Number.isInteger(image.width) || !Number.isInteger(image.height) || image.width < 1 || image.height < 1 || image.width > 1024 || image.height > 1024) return refuse()
  const url = operationPhotoUrl(image.url, filesOrigin)
  if (backingFileId(url.href) !== fileId) return refuse()
  const response = await fetch(url, {redirect:'manual',signal:AbortSignal.timeout(30_000)})
  if (!response.ok || !response.body || !/^image\/jpeg(?:;|$)/i.test(response.headers.get('content-type') ?? '') ||
    Number(response.headers.get('content-length')) > LIMIT) return refuse()
  const reader = response.body.getReader(), parts: Uint8Array[] = []; let size = 0
  try {
    while (true) {
      const part = await reader.read(); if (part.done) break
      size += part.value.length; if (size > LIMIT) return refuse()
      parts.push(part.value)
    }
  } finally { await reader.cancel() }
  const bytes = new Uint8Array(size); let at = 0
  for (const part of parts) {bytes.set(part,at);at+=part.length}
  const clean = analysisJpeg(bytes)
  if (clean.width !== image.width || clean.height !== image.height) return refuse()
  return clean.bytes
}
