import type { QueryClient } from './types'
import { operationApi } from './environment'
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Invalid upload response.')
  return value as Record<string, unknown>
}
/** All generated/user-derived bytes start private. Publishing a catch's
 * files is a separate audience operation; a trial never runs that step. */
export async function uploadOperationImage(
  foir: QueryClient,
  bytes: Uint8Array<ArrayBuffer>,
  filename: string,
  apiUrl?: string,
) {
  const api = operationApi(apiUrl)
  const begun = object(
      await foir.raw(
        `mutation Begin($filename: String!, $size: Int!) {
  uploadFile(filename: $filename, mimeType: "image/png", size: $size, visibility: PRIVATE) { uploadUrl landed { endpoint token } }
 }`,
        { filename, size: bytes.byteLength },
      ),
    ),
    slot = object(begun.uploadFile),
    ticket = object(slot.landed)
  if (
    typeof slot.uploadUrl !== 'string' ||
    typeof ticket.endpoint !== 'string' ||
    typeof ticket.token !== 'string' ||
    !ticket.token
  )
    throw new Error('The upload slot was incomplete.')
  const storage = new URL(slot.uploadUrl),
    landing = new URL(ticket.endpoint, api)
  if (
    storage.protocol !== 'https:' ||
    storage.username ||
    storage.password ||
    landing.origin !== api ||
    landing.username ||
    landing.password
  )
    throw new Error('Unexpected upload destination.')
  const put = await fetch(storage, {
    method: 'PUT',
    headers: { 'Content-Type': 'image/png' },
    body: bytes,
    redirect: 'manual',
    signal: AbortSignal.timeout(60_000),
  })
  if (!put.ok) throw new Error('The artwork could not be stored.')
  const response = await fetch(landing, {
    method: 'POST',
    headers: { 'X-Foir-Token': ticket.token },
    redirect: 'manual',
    signal: AbortSignal.timeout(30_000),
  })
  if (!response.ok || !response.body)
    throw new Error('The artwork upload could not finish.')
  const reader = response.body.getReader(),
    chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.length
      if (size > 65536) throw new Error('Upload metadata exceeded its limit.')
      chunks.push(value)
    }
  } finally {
    await reader.cancel()
  }
  const data = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) {
    data.set(chunk, offset)
    offset += chunk.length
  }
  const file = object(JSON.parse(new TextDecoder().decode(data)))
  if (typeof file.id !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(file.id))
    throw new Error('The uploaded file has no usable identity.')
  return file.id
}

export function operationFilesOrigin(value?: string) {
  const origin = value || 'https://cdn.foir.dev',
    url = new URL(origin)
  if (
    url.protocol !== 'https:' ||
    url.origin !== origin ||
    url.username ||
    url.password
  )
    throw new Error('FOIR_FILES_ORIGIN must be an HTTPS origin.')
  return origin
}
/** Validate even an already-approved file's URL against this deployment. */
export function operationPhotoUrl(value: string, origin?: string) {
  const url = new URL(value)
  if (
    url.origin !== operationFilesOrigin(origin) ||
    url.username ||
    url.password
  )
    throw new Error('That photo is not on the configured Fóir CDN.')
  return url
}
/** Read only this deployment's Fóir CDN, with no redirects or unbounded body. */
export async function readOperationPhoto(value: string, origin?: string) {
  const url = operationPhotoUrl(value, origin)
  const response = await fetch(url, {
    redirect: 'manual',
    signal: AbortSignal.timeout(30_000),
  })
  if (
    !response.ok ||
    !response.body ||
    !/^image\/(?:jpeg|png|webp)(?:;|$)/i.test(
      response.headers.get('Content-Type') ?? '',
    )
  )
    throw new Error(`The photo could not be read as a supported image (HTTP ${response.status}).`)
  const reader = response.body.getReader(),
    chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.length
      if (size > 20 * 1024 * 1024)
        throw new Error('The photo exceeds the image limit.')
      chunks.push(value)
    }
  } finally {
    await reader.cancel()
  }
  if (!size) throw new Error('The photo is empty.')
  const bytes = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.length
  }
  return Buffer.from(bytes)
}
