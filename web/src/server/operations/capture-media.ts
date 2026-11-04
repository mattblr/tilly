import type { Area, QueryClient } from './types'
export interface CaptureMedia {
  _id: string
  _ownerId?: string | null
  _createdAt: string
  catKey: string | null
  area: Area | null
  photo: { url: string | null; width: number | null; height: number | null } | null
  cat: { name: string | null } | null
}
const mediaFields = '_id _ownerId _createdAt catKey area { lat lng } photo { url width height } cat { name }'
/** A ready capture's media, by id; never substitute a caller-provided URL. */
export async function readCaptureMedia(foir: QueryClient, photoKey: string): Promise<CaptureMedia | null> {
  const canonical = (await foir.raw<{ capturePhoto: (CaptureMedia & { state: string }) | null }>(
    `query CaptureMedia($id: String) { capturePhoto(id: $id) { ${mediaFields} state } }`, { id: photoKey },
  )).capturePhoto
  return canonical?.state === 'ready' ? canonical : null
}
export async function ownCanonicalCapture(foir: QueryClient, photoKey: string): Promise<CaptureMedia | null> {
  const answer = await foir.raw<{ myCapturePhotos: { edges: { node: CaptureMedia & { state: string } }[] } }>(
    `query OwnCanonicalCapture($id: ID) { myCapturePhotos(where: { id: { eq: $id } }, first: 1) { edges { node { ${mediaFields} state } } } }`,
    { id: photoKey },
  )
  const row = answer.myCapturePhotos?.edges[0]?.node
  return row?.state === 'ready' ? row : null
}
