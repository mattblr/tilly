import {operationCredential} from './credentials'
import {makeArtworkHook} from './artwork-handler'
import { readCaptureMedia } from './capture-media'
import {
  uploadOperationImage,
  readOperationPhoto,
  operationFilesOrigin,
} from './files'
import { operationApi } from './environment'
import type {
  ArtInput,
  DispatchEnvelope,
  OperationIngress,
  OperationResponse,
  QueryClient,
} from './types'
import { errorMessage } from './types'
// Fóir operation: redraws a user's own catch, stores art under its audience, and sends a notification.
// Platform work in progress: project operations will be able to read their authorized
// credentials directly. Until then this operation uses its installed manifest's credential.

import { createFoirClient } from '@foir/sdk/data'

import * as previewGenerated from './generated/foir.op.tilly.preview-art.generated'

import * as sharedHelpers from './social'
const helpers = async () => sharedHelpers

/** Where Fóir serves files from: the only place a photo's link may point. */
const ID = /^[a-z0-9]{10,40}$/

const refused = (status: number, error: string): OperationResponse => ({
  status,
  body: { ok: false, error },
})

export async function make_catch_art(input: ArtInput, envelope: DispatchEnvelope, ingress: OperationIngress): Promise<OperationResponse | Response> {
  return makeArtworkHook(input,envelope,ingress)
}

/** How long the image model and everything else may take, in milliseconds. */
const DRAW_LIMIT = 180_000
const FETCH_LIMIT = 30_000

/**
 * Has the image model redraw a photo from a prompt, with the key the Tilly
 * app's install holds. Answers the drawing's bytes.
 */
export async function draw(
  ingress: OperationIngress,
  {
    source,
    prompt,
    model,
    quality,
    shape,
  }: {
    source: Uint8Array<ArrayBuffer>
    prompt: string
    model?: string | null
    quality?: string | null
    shape?: { width?: number | null; height?: number | null }
  },
) {
  if (!ingress.artwork?.enabled) throw new Error('Artwork generation is not enabled.')
  const key = await operationCredential(ingress, 'openai')
  const form = new FormData()
  form.append('model', model || 'gpt-image-1-mini')
  form.append('quality', quality || 'low')
  // Chosen product policy: trust the provider's built-in prompt/output filter
  // alongside upload moderation and report/review. Callers cannot weaken it.
  form.append('moderation', 'auto')
  form.append('n', '1')
  form.append('output_format', 'png')
  // The drawing takes the photo's shape, so the scene isn't squeezed into a square.
  form.append(
    'size',
    !shape?.width || !shape?.height || shape.width === shape.height
      ? '1024x1024'
      : shape.width > shape.height
        ? '1536x1024'
        : '1024x1536',
  )
  form.append('prompt', prompt)
  form.append('image', new Blob([source], { type: 'image/jpeg' }), 'catch.jpg')
  const drawn = await fetch('https://api.openai.com/v1/images/edits', {
    method: 'POST',
    headers: { authorization: `Bearer ${key}` },
    body: form,
    redirect: 'manual',
    signal: AbortSignal.timeout(DRAW_LIMIT),
  })
  const answer = (await drawn.json()) as {
    error?: { message?: string }
    data?: { b64_json?: string }[]
  }
  if (!drawn.ok)
    throw new Error('The image provider refused this artwork request.')
  const png = Buffer.from(answer.data?.[0]?.b64_json ?? '', 'base64')
  if (!png.length) throw new Error('the image provider sent no image')
  return png
}

/**
 * preview-art: draws one capture in a style, with a model and quality, and keeps
 * it as an art trial, never as anyone's art. The admin page's Run button reads
 * the trial, which says how it's going.
 *
 * The page hands over the photo's link, because a run it starts has no user and
 * so gets no working link to a private photo itself. A link is only followed to
 * Fóir's own files. Run from the CLI as someone signed in, it reads the photo.
 */
export async function preview_art(
  input: ArtInput,
  envelope: DispatchEnvelope,
  ingress: OperationIngress,
): Promise<OperationResponse> {
  if (!ingress.artwork?.enabled) return refused(503, 'Artwork generation is not enabled.')
  const photoKey = String(input.photoKey ?? '')
  if (!ID.test(photoKey)) return refused(400, 'photoKey is not an id')
  const h = await helpers()
  const foir = createFoirClient({
    apiUrl: operationApi(ingress.apiUrl),
    dispatch: ingress.dispatch,
    generated: previewGenerated,
  })

  let photo
  if (input.photoUrl) {
    const given = new URL(String(input.photoUrl))
    if (
      given.origin !== operationFilesOrigin(ingress.filesOrigin) ||
      !!given.username ||
      !!given.password
    )
      return refused(400, 'that photo isn’t one of Tilly’s')
    photo = {
      photo: { url: given.href, width: input.width, height: input.height },
    }
  } else {
    photo = await readCaptureMedia(foir, photoKey)
  }
  if (!photo?.photo?.url) return refused(404, 'that capture has no photo')
  const sourceUrl = photo.photo.url
  const sourceShape = photo.photo
  let prompt: string | null | undefined = input.prompt
  if (!prompt) {
    const tiers = await h.all<{
      days: number | null
      stylePrompt: string | null
    }>(foir, { field: 'streakTiers', node: 'days stylePrompt' })
    prompt =
      tiers.find((t) => t.days === Number(input.tierDays))?.stylePrompt ??
      tiers.sort((a, b) => (a.days ?? 0) - (b.days ?? 0))[0]?.stylePrompt
  }
  const artModel = input.model || 'gpt-image-1-mini'
  const artQuality = input.quality || 'low'
  // Written once, when it's over: a run can't change a record it made.
  const report = (result: Record<string, unknown>) =>
    h.createOwned(
      foir,
      'ArtTrial',
      {
        photoKey,
        runId: envelope.executionId,
        prompt,
        artModel,
        artQuality,
        ...result,
      },
      ingress.userId ?? null,
      `trial-${envelope.executionId}`,
    )

  const run = async () => {
    const started = Date.now()
    const source = await readOperationPhoto(sourceUrl, ingress.filesOrigin)
    console.error(
      `preview_art ${envelope.executionId}: photo read, ${source.length} bytes; drawing with ${artModel} ${artQuality}`,
    )
    const png = await draw(ingress, {
      source,
      prompt: `${prompt} No words or lettering in the picture.`,
      model: artModel,
      quality: artQuality,
      shape: sourceShape,
    })
    console.error(
      `preview_art ${envelope.executionId}: drawn after ${Math.round((Date.now() - started) / 1000)}s, ${png.length} bytes`,
    )
    const fileId = await uploadOperationImage(
      foir,
      png,
      `trial-${envelope.executionId}.png`,
      ingress.apiUrl,
    )
    return report({
      status: 'ready',
      art: fileId,
      seconds: Math.round((Date.now() - started) / 1000),
    })
  }
  const failed = async (err: unknown) => {
    const why = errorMessage(err).slice(0, 300)
    console.error(`preview_art ${envelope.executionId} failed: ${why}`)
    await report({ status: 'failed', error: why }).catch((e) =>
      console.error(
        `preview_art ${envelope.executionId} couldn't say so: ${errorMessage(e)}`,
      ),
    )
    return why
  }
  try {
    const id = await run()
    return { status: 200, body: { ok: true, id } }
  } catch (error) {
    await failed(error)
    throw error
  }
}

/** Any active Premium grant: free, RevenueCat or Stripe uses this same gate. */
/** Tells the user their art is ready, in the console's words. */
export async function tell(
  foir: QueryClient,
  me: string,
  {
    name,
    style,
    catKey,
    artId,
  }: { name: string; style: string; catKey: string; artId: string },
) {
  // Preferences are private and fail closed. Older installations without the
  // reviewed read grant still finish the artwork, but cannot send a notification
  // until their scoped manifest is updated. Never notify around a failed read.
  try {
    const settings = await foir.raw<{ notificationSettingss: { edges: { node: { artReady: boolean | null } }[] } }>(
      `query N($me: ID) { notificationSettingss(first: 1, where: {ownerId: {eq: $me}}) { edges { node { artReady } } } }`, { me },
    )
    if (settings.notificationSettingss?.edges[0]?.node.artReady !== true) return
  } catch { return }
  const art = (
    await foir.raw<{
      uiCopy: {
        entries: Array<{
          key: string | null
          value: string | null
        } | null> | null
      } | null
    }>(`query C { uiCopy(naturalKey: "art") { entries { key value } } }`)
  ).uiCopy
  // Read after applying the catch's audience, so private art carries a signed
  // link. The notification extension has no user session or app key.
  const picture = await foir
    .raw<{ catchArt: { art: { url: string | null } | null } | null }>(
      `query P($id: String) { catchArt(id: $id) { art { url } } }`,
      { id: artId },
    )
    .catch(() => null) // A missing image must not suppress the text notification.
  const say = (key: string, fallback: string) =>
    (art?.entries?.find((e) => e?.key === key)?.value || fallback)
      .replaceAll('{name}', name)
      .replaceAll('{style}', style)
  await foir.raw(
    `mutation N($input: SendNotificationInput!) { sendNotification(input: $input) }`,
    {
      input: {
        userId: me,
        category: 'art_ready',
        idempotencyKey: `art-ready:${artId}:${me}`,
        title: say('ready.title', 'Your {style} {name} is ready'),
        message: say('ready.body', 'Flip your catch of {name} to see it.'),
        actionUrl: `tilly://cat/${catKey}?art=${artId}`,
        imageUrl: picture?.catchArt?.art?.url,
      },
    },
  )
}
