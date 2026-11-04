import { all, createOwned, nodes } from './social'
import { checkedAudience, publicationHeld, publishCheckedFile } from './content-safety'
import type { QueryClient } from './types'

/** A profile is public or private. Anything but "public" is private. */
export type Privacy = 'public' | 'private'
export const privacyOf = (value: string | null | undefined): Privacy => !value || value === 'public' ? 'public' : 'private'

/** The user's choice, from their profile. Public until they say otherwise. */
export async function chosenPrivacy(foir: QueryClient, owner: string): Promise<Privacy> {
  const mine = await foir.raw<{ profiles: { edges: { node: { privacy: string | null } }[] } }>(
    'query ChosenPrivacy($owner: ID) { profiles(where: { ownerId: { eq: $owner } }, first: 1) { edges { node { privacy } } } }', { owner })
  return privacyOf(nodes(mine.profiles)[0]?.privacy)
}

type AudienceRow = { _id: string; _ownerId: string | null; privacy: string | null }
export type AudienceRecord = { id: string; privacy: Privacy; created: boolean }

/** Fóir reads catches through this record (`association_read`): whoever can
 * read a user's audience reads their catches. It is PUBLIC for a public
 * profile and PRIVATE, granted to each accepted follower, for a private one.
 * A record that names no audience is its owner's alone (a review hold).
 * Made on first use, as the user's chosen privacy, unless `preferred` says. */
export async function audienceFor(foir: QueryClient, owner: string, preferred?: Privacy): Promise<AudienceRecord> {
  const found = await foir.raw<{ page: { edges: { node: AudienceRow }[] } }>(
    'query Audience($owner: ID) { page: audiences(first: 2, where: { ownerId: { eq: $owner } }) { edges { node { _id _ownerId privacy } } } }',
    { owner })
  const rows = found.page.edges.map(edge => edge.node).filter(row => row._ownerId === owner)
  if (rows.length > 1) throw new Error('The user’s audience is ambiguous.')
  if (rows[0]) return { id: rows[0]._id, privacy: privacyOf(rows[0].privacy), created: false }
  const privacy = preferred ?? await chosenPrivacy(foir, owner)
  const id = await createOwned(foir, 'Audience', { privacy }, owner, `audience-${owner}`)
  await setVisibility(foir, id, privacy === 'public' ? 'PUBLIC' : 'PRIVATE')
  return { id, privacy, created: true }
}

async function setVisibility(foir: QueryClient, id: string, value: 'PUBLIC' | 'PRIVATE') {
  const result = await foir.raw<{ setAudienceVisibility: string }>(
    'mutation AudienceVisibility($id: ID!, $visibility: Visibility!) { setAudienceVisibility(id: $id, visibility: $visibility) }', { id, visibility: value })
  if (result.setAudienceVisibility !== value) throw new Error('The audience was not saved.')
}

/** A profile's privacy switch: the audience record's own visibility. Files are walked separately. */
export async function setAudiencePrivacy(foir: QueryClient, id: string, privacy: Privacy) {
  const result = await foir.raw<{ updateAudience: { record: { _id: string } | null } }>(
    'mutation AudiencePrivacy($id: ID, $data: AudienceUpdateInput!) { updateAudience(where: { id: { eq: $id } }, data: $data) { record { _id } } }',
    { id, data: { privacy: { set: privacy } } })
  if (!result.updateAudience?.record?._id) throw new Error('The audience was not saved.')
  await setVisibility(foir, id, privacy === 'public' ? 'PUBLIC' : 'PRIVATE')
}

/** Lets an accepted follower read the user's catches, or takes that back. */
export async function setFollowerAccess(foir: QueryClient, audience: string, follower: string, allowed: boolean) {
  if (allowed) {
    const granted = await foir.raw<{ grantAudienceAccess: { granteeId: string } | null }>(
      'mutation AudienceGrant($id: ID!, $who: ID!) { grantAudienceAccess(id: $id, granteeId: $who, access: READ) { granteeId } }', { id: audience, who: follower })
    if (granted.grantAudienceAccess?.granteeId !== follower) throw new Error('The follower was not accepted.')
  } else {
    await foir.raw('mutation AudienceRevoke($id: ID!, $who: ID!) { revokeAudienceAccess(id: $id, granteeId: $who) }', { id: audience, who: follower })
  }
}

/** The update for a record's `viewers`: an audience, or none (only its owner reads it). */
export const viewers = (audience: string | null) => audience ? { connect: { id: audience } } : { disconnect: true }
/** The create input for a record's `viewers`. Leave it out for a record only its owner reads. */
export const viewersRef = (audience: string) => ({ _ref: 'record', model: 'audience', id: audience })

/** Points records at an audience, or at none. Each type is a model with a `viewers` field. */
export async function setViewers(foir: QueryClient, records: [type: string, id: string][], audience: string | null) {
  for (const [type, id] of records) {
    const result = await foir.raw<Record<string, { record: { _id: string } | null } | null>>(
      `mutation Viewers($id: ID, $data: ${type}UpdateInput!) { update${type}(where: { id: { eq: $id } }, data: $data) { record { _id } } }`,
      { id, data: { viewers: viewers(audience) } })
    if (result[`update${type}`]?.record?._id !== id) throw new Error('The catch’s audience was not saved.')
  }
}

/** The records a catch is made of; each names its owner's audience in `viewers`. */
export const catchModels = ['CapturePhoto', 'CapturePost', 'CaptureCatTag', 'FieldNote', 'CatchArt']

/** Takes a record out of sight for review. A catch record stops naming an
 * audience, so only its owner reads it, and a photo or post shows as private;
 * a profile goes private. Files are narrowed separately. */
export async function hideRecord(foir: QueryClient, type: string, id: string) {
  if (type === 'Profile') {
    const result = await foir.raw<{ setProfileVisibility: string }>('mutation HideProfile($id: ID!) { setProfileVisibility(id: $id, visibility: PRIVATE) }', { id })
    if (result.setProfileVisibility !== 'PRIVATE') throw new Error('The profile could not be hidden.')
    return
  }
  if (!catchModels.includes(type)) throw new Error('This kind of record cannot be hidden.')
  const data = { viewers: viewers(null), ...(type === 'CapturePhoto' || type === 'CapturePost' ? { audience: { set: 'private' } } : {}) }
  const result = await foir.raw<Record<string, { record: { _id: string } | null } | null>>(
    `mutation HideRecord($id: ID, $data: ${type}UpdateInput!) { update${type}(where: { id: { eq: $id } }, data: $data) { record { _id } } }`, { id, data })
  if (result[`update${type}`]?.record?._id !== id) throw new Error('The record could not be hidden.')
}

type Catch = { _id: string; _ownerId: string; fileId: string }

async function fileVisibility(foir: QueryClient, id: string, value: 'PUBLIC' | 'PRIVATE') {
  const result = await foir.raw<{ setFileVisibility: string }>(
    'mutation CatchFileVisibility($id: ID!, $visibility: Visibility!) { setFileVisibility(id: $id, visibility: $visibility) }', { id, visibility: value })
  if (result.setFileVisibility !== value) throw new Error('The photo audience was not saved.')
}
const fileOf = (url: string | null | undefined) => {
  try { return url ? new URL(url).pathname.split('/').pop() ?? null : null } catch { return null }
}

/** The one rule for who sees a catch, used when it is saved, edited, re-shown
 * after a privacy switch and repaired. Its records are read through the owner's
 * audience: everyone for a public profile, accepted followers for a private one.
 * A catch held for review names no audience, so only its owner reads it. Its
 * photo and artwork bytes are public only for a public profile with nothing held.
 * The photo and its posts also carry `audience` (public or private): what the
 * catch shows as, for public feeds, the Private label and resharing.
 * `records: false` leaves the `viewers` links alone: a privacy switch changes
 * only the audience record and the files. */
export async function showCatch(foir: QueryClient, audience: AudienceRecord, capture: Catch, { records }: { records: boolean }) {
  const owner = capture._ownerId
  let held = await publicationHeld(foir, 'CapturePhoto', capture._id, capture.fileId)
  try {
    if (!held && audience.privacy === 'public') held = !await publishCheckedFile(foir, capture.fileId, 'CapturePhoto', capture._id)
    else await fileVisibility(foir, capture.fileId, 'PRIVATE')
    const shown = held ? 'private' : audience.privacy, to = held ? null : audience.id
    const photo = await foir.raw<{ updateCapturePhoto: { record: { _id: string } | null } | null }>(
      'mutation ShowCatch($id: ID, $data: CapturePhotoUpdateInput!) { updateCapturePhoto(where: {id: {eq: $id}, state: {eq: "ready"}}, data: $data) { record { _id } } }',
      { id: capture._id, data: { audience: { set: shown }, ...(records ? { viewers: viewers(to) } : {}) } })
    if (!photo.updateCapturePhoto?.record) throw new Error('The catch changed while saving who sees it. Retry.')
    const [posts, tags, notes, arts] = await Promise.all([
      all<{ _id: string }>(foir, { field: 'capturePosts', where: '{ ownerId: { eq: $owner }, photoKey: { eq: $photo }, reshareOf: { isNull: true } }',
        types: '$owner: ID, $photo: String', vars: { owner, photo: capture._id }, node: '_id' }),
      records ? all<{ _id: string }>(foir, { field: 'captureCatTags', where: '{ photoKey: { eq: $photo } }', types: '$photo: String', vars: { photo: capture._id }, node: '_id' }) : [],
      records ? all<{ _id: string }>(foir, { field: 'fieldNotes', where: '{ ownerId: { eq: $owner }, photoKey: { eq: $photo } }',
        types: '$owner: ID, $photo: String', vars: { owner, photo: capture._id }, node: '_id' }) : [],
      all<{ _id: string; art: { url: string | null } | null }>(foir, { field: 'catchArts', where: '{ ownerId: { eq: $owner }, photoKey: { eq: $photo } }',
        types: '$owner: ID, $photo: String', vars: { owner, photo: capture._id }, node: '_id art { url }' }),
    ])
    for (const post of posts) await foir.raw('mutation ShowCatchPost($id: ID, $data: CapturePostUpdateInput!) { updateCapturePost(where: {id: {eq: $id}}, data: $data) { record { _id } } }',
      { id: post._id, data: { audience: { set: shown }, ...(records ? { viewers: viewers(to) } : {}) } })
    await setViewers(foir, tags.map(tag => ['CaptureCatTag', tag._id]), to)
    // A note's words are checked on their own: flagged words hide only the note.
    for (const note of notes)
      await setViewers(foir, [['FieldNote', note._id]], to && !await publicationHeld(foir, 'FieldNote', note._id) ? to : null)
    for (const art of arts) {
      const file = fileOf(art.art?.url)
      if (records) await setViewers(foir, [['CatchArt', art._id]], to)
      if (!file) continue
      // Only artwork proven to come from a private generation attempt goes public.
      if (shown === 'public' && await checkedAudience(foir, 'CatchArt', art._id, 'public') === 'public') await publishCheckedFile(foir, file, 'CatchArt', art._id)
      else await fileVisibility(foir, file, 'PRIVATE')
    }
    return shown
  } catch (error) {
    await fileVisibility(foir, capture.fileId, 'PRIVATE')
    throw error
  }
}
