export function stopCamera(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop())
}
export async function openCamera(
  media:
    Pick<MediaDevices, 'getUserMedia'> | undefined = navigator.mediaDevices,
) {
  if (!window.isSecureContext)
    throw new Error(
      'The camera needs a secure HTTPS connection. Open Tilly on its secure website.',
    )
  if (!media?.getUserMedia)
    throw new Error(
      'This browser does not provide a camera. Try Safari or Chrome on your phone.',
    )
  try {
    return await media.getUserMedia({
      audio: false,
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1600 },
        height: { ideal: 1600 },
      },
    })
  } catch (error) {
    const name = error instanceof DOMException ? error.name : ''
    throw new Error(
      name === 'NotAllowedError'
        ? 'Camera access was denied. Allow the camera in your browser settings, then try again.'
        : name === 'NotFoundError'
          ? 'No camera was found on this device.'
          : name === 'NotReadableError'
            ? 'The camera is busy. Close other camera apps and try again.'
            : 'The camera couldn’t open. Check its permission and try again.',
    )
  }
}
export async function cameraJpeg(video: HTMLVideoElement) {
  const width = video.videoWidth,
    height = video.videoHeight
  if (video.readyState < 2 || !width || !height)
    throw new Error('The camera is still getting ready. Try again in a moment.')
  const scale = Math.min(1, 1600 / Math.max(width, height)),
    canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(width * scale))
  canvas.height = Math.max(1, Math.round(height * scale))
  const context = canvas.getContext('2d')
  if (!context) throw new Error('This browser couldn’t capture the photo.')
  context.drawImage(video, 0, 0, canvas.width, canvas.height)
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob
          ? resolve(blob)
          : reject(
              new Error('The camera couldn’t save this photo. Try again.'),
            ),
      'image/jpeg',
      0.88,
    ),
  )
}
export function catchLocation(
  geo: Geolocation | undefined = navigator.geolocation,
) {
  return new Promise<{ lat: number; lng: number }>((resolve, reject) => {
    if (!geo) {
      reject(
        new Error(
          'This browser does not support location. Catching needs your approximate area.',
        ),
      )
      return
    }
    geo.getCurrentPosition(
      (position) => {
        const { latitude: lat, longitude: lng } = position.coords
        if (
          !Number.isFinite(lat) ||
          !Number.isFinite(lng) ||
          Math.abs(lat) > 90 ||
          Math.abs(lng) > 180
        ) {
          reject(
            new Error('Your location was unavailable. Try again outdoors.'),
          )
          return
        }
        resolve({ lat, lng })
      },
      (error) =>
        reject(
          new Error(
            error.code === 1
              ? 'Location access was denied. Allow location in browser settings to catch a nearby cat.'
              : 'Your location couldn’t be found. Try again outdoors.',
          ),
        ),
      { enableHighAccuracy: false, maximumAge: 30_000, timeout: 15_000 },
    )
  })
}
