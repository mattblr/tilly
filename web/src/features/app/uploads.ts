import type { AppClient } from './data'

export function uploadSlot(value: unknown, apiUrl: string) {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('The upload could not be started.')
  const slot = value as Record<string, unknown>
  const landed =
    slot.landed &&
    typeof slot.landed === 'object' &&
    !Array.isArray(slot.landed)
      ? (slot.landed as Record<string, unknown>)
      : {}
  if (
    typeof slot.uploadId !== 'string' ||
    !slot.uploadId ||
    slot.uploadId.length > 128 ||
    typeof slot.uploadUrl !== 'string' ||
    typeof landed.endpoint !== 'string' ||
    typeof landed.token !== 'string' ||
    !landed.token
  )
    throw new Error('The upload response was incomplete.')
  const storage = new URL(slot.uploadUrl),
    landing = new URL(landed.endpoint, apiUrl)
  if (
    storage.protocol !== 'https:' ||
    storage.username ||
    storage.password ||
    landing.origin !== new URL(apiUrl).origin ||
    landing.username ||
    landing.password
  )
    throw new Error('The upload returned an unexpected destination.')
  return {
    uploadId: slot.uploadId,
    storage: storage.href,
    landing: landing.href,
    token: landed.token,
  }
}
/** Both profile and camera photos are re-encoded before upload, stripping source metadata. */
export async function photoJpeg(file: Blob) {
  if (
    file.size > 12 * 1024 * 1024 ||
    !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)
  )
    throw new Error('Choose a JPEG, PNG or WebP photo under 12 MB.')
  const image = await createImageBitmap(file)
  try {
    if (
      !image.width ||
      !image.height ||
      image.width * image.height > 40_000_000
    )
      throw new Error('That photo is too large. Try a smaller version.')
    const scale = Math.min(1, 1600 / Math.max(image.width, image.height)),
      canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(image.width * scale))
    canvas.height = Math.max(1, Math.round(image.height * scale))
    const context = canvas.getContext('2d')
    if (!context) throw new Error('This browser couldn’t prepare the photo.')
    context.fillStyle = '#fff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (blob) =>
          blob
            ? resolve(blob)
            : reject(new Error('The photo couldn’t be prepared.')),
        'image/jpeg',
        0.88,
      ),
    )
  } finally {
    image.close()
  }
}
/** Standard private upload → storage PUT → scoped landing. No operation or API proxy. */
export async function uploadPhoto(
  client: AppClient,
  jpeg: Blob,
  apiUrl: string,
  signal: AbortSignal,
) {
  signal.throwIfAborted()
  const slot = uploadSlot(
    await client.ns.files.uploadFile({
      filename: 'tilly-photo.jpg',
      mimeType: 'image/jpeg',
      size: jpeg.size,
      visibility: 'PRIVATE',
    }),
    apiUrl,
  )
  signal.throwIfAborted()
  const put = await fetch(slot.storage, {
    method: 'PUT',
    headers: { 'Content-Type': 'image/jpeg' },
    body: jpeg,
    signal,
    credentials: 'omit',
    redirect: 'error',
  })
  if (!put.ok) throw new Error('The photo couldn’t upload. Try again.')
  const landed = await fetch(slot.landing, {
    method: 'POST',
    headers: { 'X-Foir-Token': slot.token },
    signal,
    credentials: 'omit',
    redirect: 'error',
  })
  if (!landed.ok)
    throw new Error('The photo upload couldn’t finish. Try again.')
  const file: unknown = await landed.json()
  if (
    !file ||
    typeof file !== 'object' ||
    Array.isArray(file) ||
    !('id' in file) ||
    typeof file.id !== 'string' ||
    !/^[A-Za-z0-9_-]{1,128}$/.test(file.id)
  )
    throw new Error('The upload did not return a usable file.')
  return file.id
}
