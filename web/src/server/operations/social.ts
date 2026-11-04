import { CaptureRefusal } from './capture-contract'
import { ownCanonicalCapture, readCaptureMedia } from './capture-media'
import { operationApi } from './environment'
import { worldCellOf } from '../../lib/location'
import { withContentSafety, checkedAudience, checkSharingContent, readableCaptureContent, backingFileId, assertSocialAllowed, hasContentSafety, publicationHeld, publishCheckedFile } from './content-safety'
import type {
  SocialInput,
  DispatchEnvelope,
  OperationIngress,
  OperationResponse,
  QueryClient,
  GeneratedOperation,
  Connection,
  CreatedRecord,
  CatchPhoto,
  PageSelection,
  Audience,
} from './types'
import { errorMessage } from './types'
// changes.
//
// Every record is the user's own. A run acts for the user who triggered
// it, so it creates each record in their name (`ownerId`, from the run, never
// from the request), then makes it public or opens it to their friends. The
// user's own rows are the run's to change and remove.

import { createFoirClient } from '@foir/sdk/data'
import { hideRecord, audienceFor, privacyOf, setFollowerAccess, setViewers, viewers, viewersRef, type AudienceRecord } from './audience'

import * as addFieldNote from './generated/foir.op.tilly.add-field-note.generated'
import * as followCat from './generated/foir.op.follow_cat.generated'
import * as followUser from './generated/foir.op.follow_user.generated'
import * as likeCapture from './generated/foir.op.like_capture.generated'
import * as postMyCatches from './generated/foir.op.tilly.post-my-catches.generated'
import * as saveProfile from './generated/foir.op.tilly.save-profile.generated'
import * as shareCapture from './generated/foir.op.tilly.share-capture.generated'

const ID = /^[a-z0-9]{10,40}$/
const USERNAME = /^[a-z0-9_]{2,30}$/
// Who sees a user's catches: everyone, or the followers they accept.
const PRIVACY_CHOICES = ['public', 'private']

const catRef = (id: string) => ({ _ref: 'record', model: 'cat', id })
const refused = (status: number, error: string): OperationResponse => ({
  status,
  body: { ok: false, error },
})
const done = (body: Record<string, unknown> = {}): OperationResponse => ({
  status: 200,
  body: { ok: true, ...body },
})
const client = (ingress: OperationIngress, generated: GeneratedOperation) =>
  withContentSafety(createFoirClient({
    apiUrl: operationApi(ingress.apiUrl),
    dispatch: ingress.dispatch,
    generated,
  }), ingress)
export const nodes = <T>(connection: Connection<T> | null | undefined) =>
  (connection?.edges ?? []).map((e) => e.node)

/**
 * Every row of a list, read a page at a time: one answer never holds more
 * than 100. `where` may name variables declared in `types`.
 */
export async function all<T>(
  foir: QueryClient,
  { field, where, types = '', vars = {}, node }: PageSelection,
): Promise<T[]> {
  const query = `query Page($after: String${types ? `, ${types}` : ''}) {
    page: ${field}(${where ? `where: ${where}, ` : ''}first: 100, after: $after) {
      pageInfo { hasNextPage endCursor }
      edges { node { ${node} } }
    }
  }`
  const rows: T[] = []
  let after: string | null = null
  const seen = new Set<string>()
  do {
    const page: Connection<T> = (
      await foir.raw<{ page: Connection<T> }>(query, { ...vars, after })
    ).page
    rows.push(...nodes(page))
    after = page?.pageInfo?.hasNextPage ? page.pageInfo.endCursor : null
    if (page?.pageInfo?.hasNextPage && (!after || seen.has(after)))
      throw new Error(
        'The operation list did not provide a new continuation cursor.',
      )
    if (after) seen.add(after)
  } while (after)
  return rows
}

/** A list cut into pieces one filter can carry. */
const chunks = <T>(list: T[], size = 100) =>
  Array.from({ length: Math.ceil(list.length / size) }, (_, i) =>
    list.slice(i * size, (i + 1) * size),
  )

/** Creates a record of one of the user's own models, in their name. */
export async function createOwned(
  foir: QueryClient,
  type: string,
  input: Record<string, unknown>,
  owner: string | null,
  key: string,
): Promise<string> {
  const created = await foir.raw<Record<string, CreatedRecord>>(
    `mutation C($input: Create${type}Input!, $owner: ID, $key: String) {
      create${type}(input: $input, ownerId: $owner, idempotencyKey: $key) { record { _id } }
    }`,
    { input, owner, key },
  )
  const id = created[`create${type}`]?.record?._id
  if (!id) throw new Error(`Creating ${type} returned no record id`)
  return id
}

/** Makes one of the user's records readable by everyone. */
const makePublic = async (foir: QueryClient, type: string, id: string) => {
  await foir.raw(`mutation V($id: ID!) { set${type}Visibility(id: $id, visibility: PUBLIC) }`, { id })
}

/** Shows a profile to everyone, unless it's held for review. Answers how it shows. */
export async function showProfile(foir: QueryClient, id: string): Promise<'public' | 'private'> {
  const shown = await checkedAudience(foir, 'Profile', id, 'public') === 'public' ? 'public' : 'private'
  if (shown === 'private') { await hideRecord(foir, 'Profile', id); return shown }
  await foir.raw('mutation ShowProfile($id: ID!) { setProfileVisibility(id: $id, visibility: PUBLIC) }', { id })
  // A hold placed while this ran wins: re-read it after widening.
  if (hasContentSafety(foir)) {
    try {
      if (await publicationHeld(foir, 'Profile', id)) { await hideRecord(foir, 'Profile', id); return 'private' }
    } catch (error) {
      await hideRecord(foir, 'Profile', id)
      throw error
    }
  }
  return shown
}

const remove = (foir: QueryClient, type: string, id: string) =>
  foir.raw(`mutation D($id: String!) { delete${type}(id: $id) }`, { id })

/** The user's own catch: their ready capture, or null when the photo isn't theirs. */
export async function ownCatch(foir: QueryClient, photoKey: string): Promise<CatchPhoto | null> {
  const capture = await ownCanonicalCapture(foir, photoKey)
  return capture?.catKey ? { ...capture, catKey: capture.catKey } : null
}

export async function save_profile(
  input: SocialInput,
  envelope: DispatchEnvelope,
  ingress: OperationIngress,
): Promise<OperationResponse> {
  const me = ingress.userId
  if (!me) return refused(403, 'sign in to set up a profile')
  const displayName = String(input.displayName ?? '').trim()
  const username = String(input.username ?? '')
    .trim()
    .replace(/^@/, '')
    .toLowerCase()
  const bio = String(input.bio ?? '').trim()
  const photoFileId = input.photoFileId ? String(input.photoFileId) : null
  if (input.privacy != null && !PRIVACY_CHOICES.includes(String(input.privacy)))
    return refused(400, 'Your profile is public or private.')
  // The profile only records the choice; publication.ts applies it.
  const privacy = input.privacy == null ? null : privacyOf(String(input.privacy))
  if (!displayName || displayName.length > 60)
    return refused(400, 'Add a display name of up to 60 characters.')
  if (!USERNAME.test(username))
    return refused(
      400,
      'Use 2–30 letters, numbers or underscores for your username.',
    )
  if (bio.length > 160) return refused(400, 'Keep your bio to 160 characters.')

  const foir = client(ingress, saveProfile)
  const taken = await all<{ _ownerId: string | null }>(foir, {
    field: 'profiles',
    where: '{ username: { eq: $u } }',
    types: '$u: String',
    vars: { u: username },
    node: '_ownerId',
  })
  if (taken.some((p) => p._ownerId !== me))
    return refused(409, 'That username is taken.')

  const mine = await foir.raw<{
    profiles: {
      edges: Array<{
        node: {
          _id: string
          photo: { url: string | null } | null
        }
      }>
    }
  }>(
    `query Mine($me: ID) { profiles(where: { ownerId: { eq: $me } }, first: 1) { edges { node { _id photo { url } } } } }`,
    { me },
  )
  const existing = nodes(mine.profiles)[0]
  if (!await checkSharingContent(foir, { targetType: 'Profile', targetId: existing?._id ?? me,
    text: [displayName, username, bio].filter(Boolean).join('\n'),
    fileId: photoFileId || (input.removePhoto !== true && existing?.photo?.url ? backingFileId(existing.photo.url) : undefined),
  })) return refused(409, 'Those profile changes are waiting for review. Your current profile is unchanged.')
  // A public profile needs a public file too. Do this before linking a new
  // upload, and repair an unchanged photo when an older profile is saved.
  if (photoFileId) await serveProfilePhoto(foir, { fileId: photoFileId, profileId: existing?._id })
  else if (input.removePhoto !== true)
    await serveProfilePhoto(foir, { url: existing?.photo?.url, profileId: existing?._id })
  if (existing) {
    const data: Record<string, unknown> = {
      displayName: { set: displayName },
      username: { set: username },
      bio: { set: bio },
    }
    if (privacy) data.privacy = { set: privacy }
    if (photoFileId) data.photo = { set: photoFileId }
    // A null `set` is dropped on the way in; clearing a field is its own operator.
    else if (input.removePhoto === true) data.photo = { setNull: true }
    await foir.raw(
      `mutation U($id: ID, $data: ProfileUpdateInput!) { updateProfile(where: { id: { eq: $id } }, data: $data) { record { _id } } }`,
      { id: existing._id, data },
    )
    // A previous attempt may have created the profile before publication
    // failed. Retry that step too; moderation holds still keep it private.
    await showProfile(foir, existing._id)
    // An operator can hide the profile while its photo or fields are saving.
    // Do not leave a newly linked image public after that hide completed.
    if (hasContentSafety(foir)) {
      let held = true
      try { held = await publicationHeld(foir, 'Profile', existing._id) }
      finally {
        if (held) {
          const file = photoFileId || (input.removePhoto !== true && existing.photo?.url ? backingFileId(existing.photo.url) : null)
          if (file) await foir.raw('mutation HideHeldProfileFile($id: ID!) { setFileVisibility(id: $id, visibility: PRIVATE) }', { id: file })
          await hideRecord(foir, 'Profile', existing._id)
        }
      }
    }
    return done({ id: existing._id })
  }
  const profile: Record<string, unknown> = {
    displayName,
    username,
    bio,
    ...(photoFileId ? { photo: photoFileId } : {}),
    ...(privacy ? { privacy } : {}),
  }
  const id = await createOwned(
    foir,
    'Profile',
    profile,
    me,
    `${envelope.executionId}-profile`,
  )
  await showProfile(foir, id)
  return done({ id })
}

/**
 * Profile photos are public, independently of who sees the user's catches.
 * A new upload gives its file id; a photo already set gives only its URL,
 * whose last segment is the file id (Fóir's Image value exposes no file id).
 * Let failures reach the caller so a repair can be retried next launch.
 */
export async function serveProfilePhoto(
  foir: Pick<QueryClient, 'raw'>,
  { fileId, url, profileId }: { fileId?: string | null; url?: string | null; profileId?: string } = {},
) {
  if (!fileId && url) fileId = backingFileId(url)
  if (!fileId) return
  if (!ID.test(fileId))
    throw new Error('The profile photo has no valid file id.')
  if (!await checkSharingContent(foir, { targetType: 'input', targetId: `profile-photo-${fileId}`, text: '', fileId })) {
    await foir.raw('mutation HoldProfileFile($id: ID!) { setFileVisibility(id: $id, visibility: PRIVATE) }', { id: fileId })
    return
  }
  await publishCheckedFile(foir, fileId, profileId ? 'Profile' : 'input', profileId ?? `profile-photo-${fileId}`)
}

export async function like_capture(
  input: SocialInput,
  envelope: DispatchEnvelope,
  ingress: OperationIngress,
): Promise<OperationResponse> {
  const me = ingress.userId
  if (!me) return refused(403, 'sign in to like a capture')
  const photoKey = String(input.photoKey ?? '')
  if (!ID.test(photoKey)) return refused(400, 'photoKey is not an id')
  if (typeof input.liked !== 'boolean')
    return refused(400, 'liked must be true or false')

  const foir = client(ingress, likeCapture)
  const existing = await all<{ _id: string }>(foir, {
    field: 'captureLikes',
    where: '{ ownerId: { eq: $me }, photoKey: { eq: $p } }',
    types: '$me: ID, $p: String',
    vars: { me, p: photoKey },
    node: '_id',
  })
  if (!input.liked) {
    for (const like of existing) await remove(foir, 'CaptureLike', like._id)
    return done({ active: false })
  }
  const photo = await readCaptureMedia(foir, photoKey)
  if (!photo?.catKey) return refused(404, 'no such capture')
  await assertSocialAllowed(foir, me, photo._ownerId)
  if (existing.length) return done({ active: true, id: existing[0]._id })
  const catKey = photo.catKey
  const id = await createOwned(
    foir,
    'CaptureLike',
    { cat: catRef(catKey), catKey, photoKey },
    me,
    `${envelope.executionId}-like`,
  )
  await makePublic(foir, 'CaptureLike', id)
  return done({ active: true, id })
}

export async function follow_cat(
  input: SocialInput,
  envelope: DispatchEnvelope,
  ingress: OperationIngress,
): Promise<OperationResponse> {
  const me = ingress.userId
  if (!me) return refused(403, 'sign in to follow a cat')
  if (!ID.test(String(input.catId ?? '')))
    return refused(400, 'catId is not an id')
  if (typeof input.following !== 'boolean')
    return refused(400, 'following must be true or false')

  const foir = client(ingress, followCat)
  const existing = await all<{ _id: string }>(foir, {
    field: 'catFollows',
    where: '{ ownerId: { eq: $me }, catKey: { eq: $c } }',
    types: '$me: ID, $c: String',
    vars: { me, c: input.catId },
    node: '_id',
  })
  if (!input.following) {
    for (const follow of existing) await remove(foir, 'CatFollow', follow._id)
    return done({ active: false })
  }
  if (existing.length) return done({ active: true, id: existing[0]._id })
  const cat = await foir.raw<{ cat: { _id: string } | null }>(
    `query Cat($id: String) { cat(id: $id) { _id } }`,
    { id: input.catId },
  )
  if (!cat.cat?._id) return refused(404, 'no such cat')
  // A cat follow stays private: it is nobody's business but the user's.
  const id = await createOwned(
    foir,
    'CatFollow',
    { cat: catRef(String(input.catId)), catKey: input.catId },
    me,
    `${envelope.executionId}-follow`,
  )
  return done({ active: true, id })
}

/** A user's request to follow another, owned by the asker. */
type Request = { _id: string; _ownerId: string | null; followeeId: string | null; status: string | null }
/** The followed user's answer to a request, owned by them. */
type Approval = { _id: string; _ownerId: string | null; followerId: string | null; requestId: string | null; status: string | null }
const requestsFrom = (foir: QueryClient, follower: string, followee: string) => all<Request>(foir, {
  field: 'followRequests', where: '{ ownerId: { eq: $follower }, followeeId: { eq: $followee } }',
  types: '$follower: ID, $followee: String', vars: { follower, followee }, node: '_id _ownerId followeeId status',
})
const approvalsOf = (foir: QueryClient, followee: string, follower: string) => all<Approval>(foir, {
  field: 'followApprovals', where: '{ ownerId: { eq: $followee }, followerId: { eq: $follower } }',
  types: '$followee: ID, $follower: String', vars: { followee, follower }, node: '_id _ownerId followerId requestId status',
})
const answerTo = (approvals: Approval[], request: Request) => approvals.find(row => row.requestId === request._id)
const grantRead = async (foir: QueryClient, type: string, id: string, who: string) => {
  const granted = await foir.raw<Record<string, { granteeId: string } | null>>(
    `mutation ShareFollow($id: ID!, $who: ID!) { grant${type}Access(id: $id, granteeId: $who, access: READ) { granteeId } }`, { id, who })
  if (granted[`grant${type}Access`]?.granteeId !== who) throw new Error('The follow was not shared.')
}
/** Marks my answer, and who can see it: my audience while accepted; afterwards
 * only me and the asker, whose app then shows Follow again. */
async function answer(foir: QueryClient, approval: string, status: 'accepted' | 'declined' | 'removed' | 'left', shownTo: string | null, asker: string) {
  const updated = await foir.raw<{ updateFollowApproval: { record: { _id: string } | null } | null }>(
    'mutation FollowAnswer($id: ID, $data: FollowApprovalUpdateInput!) { updateFollowApproval(where: { id: { eq: $id } }, data: $data) { record { _id } } }',
    { id: approval, data: { status: { set: status }, viewers: viewers(shownTo) } })
  if (updated.updateFollowApproval?.record?._id !== approval) throw new Error('The follow was not saved.')
  if (status !== 'accepted') await grantRead(foir, 'FollowApproval', approval, asker)
}

/**
 * Following, by the one rule shared with who sees a user's catches. Only a
 * record's owner may change it or who it is shared with, so a follow has two
 * halves. The asker owns the request and shares it with the user they ask.
 * The user being followed owns the approval, read through their audience,
 * and their audience's read grant is what lets a follower of a private user
 * see their catches. A public user approves at once: the request creates
 * their approval for them. A follow is on while both halves stand.
 *
 * `following` follows or unfollows `userId`. `follower` answers
 * `userId`'s request to follow me (`accept`, `decline`) or removes them.
 * Unfollowing deletes the request at once; the followed user's app takes
 * back the access it gave when it next tidies (see tidyFollowers): Fóir does
 * not let a grantee give a grant up.
 */
export async function follow_user(
  input: SocialInput & { follower?: string },
  envelope: DispatchEnvelope,
  ingress: OperationIngress,
): Promise<OperationResponse> {
  const me = ingress.userId
  if (!me) return refused(403, 'sign in to follow people')
  const them = String(input.userId ?? '')
  if (!ID.test(them)) return refused(400, 'userId is not an id')
  if (them === me) return refused(400, 'you can’t follow yourself')
  const reply = input.follower
  if (reply !== undefined && !['accept', 'decline', 'remove'].includes(reply))
    return refused(400, 'follower is accept, decline or remove')
  if (reply === undefined && typeof input.following !== 'boolean')
    return refused(400, 'following must be true or false')
  const foir = client(ingress, followUser)

  if (reply) {
    // Their request to follow me: theirs to own, mine to answer.
    const asked = await requestsFrom(foir, them, me)
    const mine = await approvalsOf(foir, me, them)
    const audience = await audienceFor(foir, me)
    if (reply === 'accept') {
      const request = asked.find(row => !answerTo(mine, row))
      if (!request) return asked.some(row => answerTo(mine, row)?.status === 'accepted') ? done({ active: true, status: 'accepted' }) : refused(404, 'That request is gone.')
      await assertSocialAllowed(foir, me, them)
      await createOwned(foir, 'FollowApproval', { followerId: them, requestId: request._id, status: 'accepted', viewers: viewersRef(audience.id) }, me, `follower-${request._id}`)
      await setFollowerAccess(foir, audience.id, them, true)
      return done({ active: true, status: 'accepted' })
    }
    await dropFollower(foir, me, them, reply === 'decline' ? 'declined' : 'removed', asked, mine, audience)
    return done({ active: false, status: null })
  }

  const asked = await requestsFrom(foir, me, them)
  if (!input.following) {
    for (const request of asked) await remove(foir, 'FollowRequest', request._id)
    return done({ active: false, status: null })
  }
  await assertSocialAllowed(foir, me, them)
  const theirs = await approvalsOf(foir, them, me)
  const found = await foir.raw<{ profiles: { edges: { node: { privacy: string | null } }[] } }>(
    `query P($t: ID) { profiles(where: { ownerId: { eq: $t } }, first: 1) { edges { node { privacy } } } }`,
    { t: them },
  )
  const profile = found.profiles?.edges[0]?.node
  if (!profile) return refused(404, 'no such user')
  const open = privacyOf(profile.privacy) === 'public'
  let request = asked.find(row => !['declined', 'removed', 'left'].includes(answerTo(theirs, row)?.status ?? ''))
  if (request && answerTo(theirs, request)?.status === 'accepted') return done({ active: true, status: 'accepted', id: request._id })
  // An answered request is asked again, never reopened by itself.
  for (const old of asked) if (old !== request) await remove(foir, 'FollowRequest', old._id)
  if (!request) {
    const id = await createOwned(foir, 'FollowRequest', { followeeId: them, status: open ? 'accepted' : 'requested' }, me, `${envelope.executionId}-follow`)
    // The request is theirs to read and answer, and nobody else's.
    try { await grantRead(foir, 'FollowRequest', id, them) }
    catch (error) { await remove(foir, 'FollowRequest', id); throw error }
    request = { _id: id, _ownerId: me, followeeId: them, status: open ? 'accepted' : 'requested' }
  }
  if (!open) return done({ active: true, status: 'requested', id: request._id })
  // A public user approves at once: their approval, written for them and
  // read through their public audience.
  const audience = await audienceRecord(foir, them)
  await createOwned(foir, 'FollowApproval', { followerId: me, requestId: request._id, status: 'accepted',
    ...(audience?.privacy === 'public' ? { viewers: viewersRef(audience._id) } : {}) }, them, `follower-${request._id}`)
  return done({ active: true, status: 'accepted', id: request._id })
}

/** Declines or removes a follower of mine. Access goes first: a half-finished
 * removal leaves them seeing less, never more. */
async function dropFollower(foir: QueryClient, me: string, them: string, status: 'declined' | 'removed', asked: Request[], mine: Approval[], audience: AudienceRecord) {
  await setFollowerAccess(foir, audience.id, them, false)
  for (const row of mine) if (row.status === 'accepted') await answer(foir, row._id, 'removed', null, them)
  for (const request of asked) if (!answerTo(mine, request))
    await createOwned(foir, 'FollowApproval', { followerId: them, requestId: request._id, status }, me, `follower-${request._id}`)
      .then(id => grantRead(foir, 'FollowApproval', id, them))
}
/** Blocking ends following both ways: my requests to them go, and they stop
 * following me, with the access it gave. */
export async function endFollows(foir: QueryClient, me: string, them: string) {
  for (const request of await requestsFrom(foir, me, them)) await remove(foir, 'FollowRequest', request._id)
  await dropFollower(foir, me, them, 'removed', await requestsFrom(foir, them, me), await approvalsOf(foir, me, them), await audienceFor(foir, me))
}

/**
 * Takes back what people who stopped following me still hold: an accepted
 * approval whose request is gone is marked left, and any read grant on my
 * audience without a standing follow is revoked. Runs as me (only the owner
 * may change these), from my app, a page of approvals per dispatch.
 *
 * Fóir gap (docs/known-gaps.md, "Sharing another user's record"): a grantee
 * can't give up a grant, so unfollowing can't remove the follower's read grant
 * on my audience. This tidy exists only for that. Closes with app-declared
 * access rules, when an unfollow ends access at once and this goes.
 */
export async function tidyFollowers(foir: QueryClient, me: string, after?: string): Promise<{ after?: string }> {
  const audience = await audienceFor(foir, me)
  const page = await foir.raw<{ page: Connection<Approval> }>(
    `query TidyFollowers($me: ID, $after: String) { page: followApprovals(first: 20, after: $after, orderBy: [{createdAt: ASC}, {id: ASC}], where: { ownerId: { eq: $me }, status: { eq: "accepted" } }) { edges { node { _id _ownerId followerId requestId status } } pageInfo { hasNextPage endCursor } } }`,
    { me, after })
  const rows = nodes(page.page).filter(row => row._ownerId === me && row.followerId && row.requestId)
  const requests = rows.length ? await all<{ _id: string; _ownerId: string | null }>(foir, {
    field: 'followRequests', where: '{ id: { in: $ids }, followeeId: { eq: $me } }', types: '$ids: [ID], $me: String',
    vars: { ids: rows.map(row => row.requestId), me }, node: '_id _ownerId' }) : []
  for (const row of rows) {
    if (requests.some(request => request._id === row.requestId && request._ownerId === row.followerId)) continue
    await setFollowerAccess(foir, audience.id, row.followerId!, false)
    await answer(foir, row._id, 'left', null, row.followerId!)
  }
  const info = page.page?.pageInfo
  if (info?.hasNextPage) {
    if (!info.endCursor || info.endCursor === after) throw new Error('The follower list did not advance.')
    return { after: info.endCursor }
  }
  // Last page: grants left without any standing follow (an interrupted removal).
  const standing = new Set((await all<{ followerId: string | null }>(foir, {
    field: 'followApprovals', where: '{ ownerId: { eq: $me }, status: { eq: "accepted" } }', types: '$me: ID', vars: { me }, node: 'followerId' }))
    .flatMap(row => row.followerId ? [row.followerId] : []))
  const access = await foir.raw<{ access: { grants: { granteeId: string }[] } | null }>(
    'query TidyAudience($id: ID!) { access: audienceAccess(id: $id) { grants { granteeId } } }', { id: audience.id })
  for (const grant of access.access?.grants ?? []) if (!standing.has(grant.granteeId)) await setFollowerAccess(foir, audience.id, grant.granteeId, false)
  return {}
}

/** Another user's audience record, as far as this user may read it; null when unreadable or absent. */
async function audienceRecord(foir: QueryClient, owner: string) {
  const found = await foir.raw<{ page: { edges: { node: { _id: string; _ownerId: string | null; privacy: string | null } }[] } }>(
    'query TheirAudience($owner: ID) { page: audiences(first: 1, where: { ownerId: { eq: $owner } }) { edges { node { _id _ownerId privacy } } } }', { owner })
  return found.page.edges.map(edge => edge.node).find(row => row._ownerId === owner) ?? null
}

export async function add_field_note(
  input: SocialInput,
  envelope: DispatchEnvelope,
  ingress: OperationIngress,
): Promise<OperationResponse> {
  const me = ingress.userId
  if (!me) return refused(403, 'sign in to add a note')
  if (!ID.test(String(input.photoKey ?? '')))
    return refused(400, 'photoKey is not an id')
  const text = String(input.text ?? '').trim()
  if (text.length > 280) return refused(400, 'Keep a note to 280 characters.')

  const foir = client(ingress, addFieldNote)
  // The tags on offer are the note-tag records, edited in the console.
  const offered = (
    await all<{ label: string | null }>(foir, {
      field: 'noteTags',
      node: 'label',
    })
  ).map((t) => t.label)
  const tags = Array.isArray(input.tags)
    ? [...new Set(input.tags.filter((t) => offered.includes(t)))]
    : []
  if (!tags.length && !text)
    return refused(400, 'Choose what you noticed or write a note.')
  // Only a catch the user made themselves can carry their note.
  const caught = await ownCatch(foir, String(input.photoKey))
  if (!caught) return refused(403, 'That catch isn’t yours.')
  const previous = nodes(
    (
      await foir.raw<{ fieldNotes: Connection<{ _id: string }> }>(
        `query N($me:ID,$p:String) { fieldNotes(where:{ownerId:{eq:$me},photoKey:{eq:$p}},first:1,orderBy:[{createdAt:DESC}]) { edges { node { _id } } } }`,
        { me, p: caught._id },
      )
    ).fieldNotes,
  )[0]
  const data = {
    cat: catRef(caught.catKey),
    catKey: caught.catKey,
    photoKey: caught._id,
    tags,
    text,
  }
  const id =
    previous?._id ??
    (await createOwned(
      foir,
      'FieldNote',
      data,
      me,
      `${envelope.executionId}-note`,
    ))
  // A note is seen by whoever sees the catch it belongs to, once its words
  // pass moderation. A held catch, or flagged words, leave it to its owner.
  const audience = await audienceFor(foir, me)
  if (previous) {
    // Hidden first: changed words are read by moderation before anyone else.
    await setViewers(foir, [['FieldNote', id]], null)
    await foir.raw(
      `mutation N($id:ID,$data:FieldNoteUpdateInput!) { updateFieldNote(where:{id:{eq:$id}},data:$data) { record { _id } } }`,
      { id, data: { tags: { set: tags }, text: { set: text } } },
    )
  }
  const shown = !await publicationHeld(foir, 'CapturePhoto', caught._id) &&
    await checkedAudience(foir, 'FieldNote', id, 'public') === 'public'
  await setViewers(foir, [['FieldNote', id]], shown ? audience.id : null)
  return done({ id })
}

/** Only the verified actor's reposts of this photo; originals are never removable here. */
export async function ownReposts(
  foir: QueryClient,
  owner: string,
  photoKey: string,
) {
  const rows = await all<{
    _id: string
    _ownerId: string | null
    photoKey: string | null
    reshareOf: string | null
  }>(foir, {
    field: 'capturePosts',
    where:
      '{ ownerId: { eq: $me }, photoKey: { eq: $p }, reshareOf: { isNull: false } }',
    types: '$me: ID, $p: String',
    vars: { me: owner, p: photoKey },
    node: '_id _ownerId photoKey reshareOf',
  })
  return rows.filter(
    (row) =>
      row._ownerId === owner && row.photoKey === photoKey && !!row.reshareOf,
  )
}

export async function removeOwnReposts(
  foir: QueryClient,
  owner: string,
  photoKey: string,
) {
  const rows = await ownReposts(foir, owner, photoKey)
  for (const row of rows) await remove(foir, 'CapturePost', row._id)
}

/**
 * Shows a post the user made, by the one rule for catches: their audience
 * (everyone, or the followers they accept), unless its words or photo are held
 * for review, then only them. Returns what the post shows as.
 */
export async function showPost(foir: QueryClient, me: string, id: string) {
  const audience = await audienceFor(foir, me)
  // The private record stays readable only by its owner while it is checked.
  await setViewers(foir, [['CapturePost', id]], null)
  // A post whose photo is gone or no longer shared stays hidden.
  const shown = await checkedAudience(foir, 'CapturePost', id, 'public').catch(error => {
    if (error instanceof Error && /unavailable/.test(error.message)) return 'private'
    throw error
  }) === 'public' ? audience.privacy : null
  await foir.raw(
    `mutation ShowPost($id: ID, $data: CapturePostUpdateInput!) { updateCapturePost(where: { id: { eq: $id } }, data: $data) { record { _id } } }`,
    { id, data: { audience: { set: shown ?? 'private' }, viewers: viewers(shown ? audience.id : null) } })
  return shown
}

/**
 * Captions one of the user's catches, or reshares someone's public post with
 * a comment. Either is seen by the user's own audience: who sees a post
 * follows the profile's Public or Private setting, never a per-post choice.
 */
export async function share_capture(
  input: SocialInput,
  envelope: DispatchEnvelope,
  ingress: OperationIngress,
): Promise<OperationResponse> {
  const me = ingress.userId
  if (!me) return refused(403, 'sign in to share')
  const foir = client(ingress, shareCapture)
  if (input.reposted !== undefined && typeof input.reposted !== 'boolean')
    return refused(400, 'reposted must be true or false')
  if (input.reposted === false) {
    if (!ID.test(String(input.photoKey ?? '')))
      return refused(400, 'photoKey is not an id')
    await removeOwnReposts(foir, me, String(input.photoKey))
    return done({ active: false })
  }
  const note = String(input.note ?? '').trim()
  const comment = String(input.comment ?? '').trim()
  if (note.length > 280 || comment.length > 280)
    return refused(400, 'Keep it to 280 characters.')

  if (input.reshareOf) {
    if (!ID.test(input.reshareOf)) return refused(400, 'reshareOf is not an id')
    const original = (
      await foir.raw<{
        capturePost: {
          _id: string
          _ownerId: string | null
          catKey: string | null
          photoKey: string | null
          area: { lat: number | null; lng: number | null } | null
          audience: string | null
        } | null
      }>(
        `query O($id: String) { capturePost(id: $id) { _id _ownerId catKey photoKey area { lat lng } audience } }`,
        { id: input.reshareOf },
      )
    ).capturePost
    if (!original?.catKey || !original.photoKey)
      return refused(404, 'That post is gone.')
    await assertSocialAllowed(foir, me, original._ownerId)
    // A reshare reaches no further than the post it reshares: only a public
    // user's post goes on, since a private one was for their followers.
    if (original.audience !== 'public')
      return refused(403, 'Only a public post can be reshared.')
    const existing = await ownReposts(foir, me, original.photoKey)
    let id = existing[0]?._id
    if (id) {
      await foir.raw(
        `mutation U($id: ID, $data: CapturePostUpdateInput!) { updateCapturePost(where: { id: { eq: $id } }, data: $data) { record { _id } } }`,
        { id, data: { comment: { set: comment } } },
      )
      for (const duplicate of existing.slice(1))
        await remove(foir, 'CapturePost', duplicate._id)
    } else {
      id = await createOwned(foir, 'CapturePost', {
        cat: catRef(original.catKey),
        catKey: original.catKey,
        photoKey: original.photoKey,
        ...(original.area ? { area: original.area, worldCell: worldCellOf(original.area) } : {}),
        reshareOf: original._id,
        comment,
        audience: 'private',
        postedAt: new Date().toISOString(),
      }, me, `${envelope.executionId}-post`)
    }
    await showPost(foir, me, id)
    return done({ active: true, id })
  }

  if (!ID.test(String(input.photoKey ?? '')))
    return refused(400, 'photoKey is not an id')
  const caught = await ownCatch(foir, String(input.photoKey))
  if (!caught) return refused(403, 'That catch isn’t yours.')
  // Every catch was posted when it was saved: sharing it again changes its
  // caption, rather than posting it twice.
  const posted = nodes(
    (
      await foir.raw<{
        capturePosts: { edges: Array<{ node: { _id: string; reshareOf: string | null } }> }
      }>(
        `query P($me: ID, $p: String) { capturePosts(where: { ownerId: { eq: $me }, photoKey: { eq: $p }, reshareOf: { isNull: true } }, first: 1) { edges { node { _id reshareOf } } } }`,
        { me, p: caught._id },
      )
    ).capturePosts,
  ).find((p) => !p.reshareOf)
  let id = posted?._id
  if (id) {
    // Hidden first: the new words are read by moderation before anyone else.
    await setViewers(foir, [['CapturePost', id]], null)
    await foir.raw(
      `mutation U($id: ID, $data: CapturePostUpdateInput!) { updateCapturePost(where: { id: { eq: $id } }, data: $data) { record { _id } } }`,
      { id, data: { note: { set: note } } },
    )
  } else {
    id = await createOwned(foir, 'CapturePost', {
      cat: catRef(caught.catKey),
      catKey: caught.catKey,
      photoKey: caught._id,
      ...(caught.area ? { area: caught.area, worldCell: worldCellOf(caught.area) } : {}),
      note,
      audience: 'private',
      postedAt: caught._createdAt,
    }, me, `${envelope.executionId}-post`)
  }
  await showPost(foir, me, id)
  return done({ id })
}

/** Runs as a bounded native walk: see publication.ts. */
export async function post_my_catches(): Promise<OperationResponse> {
  return refused(400, 'Posting your catches requires asynchronous dispatch.')
}
