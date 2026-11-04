import { collectConnection } from '../app/paging'
import type { PlacementSession } from '@foir/sdk/placement'

let session: PlacementSession | undefined
export const setSession = (value: PlacementSession) => {
  session = value
}
export const clearSession = (value: PlacementSession | undefined) => {
  if (session === value) session = undefined
}
export const ask = <T>(query: string, variables?: Record<string, unknown>) => {
  if (!session)
    throw new Error('The Fóir placement session is no longer connected.')
  return session.request<T>(query, variables)
}
type Connection<T> = {
  edges: { node: T }[]
  pageInfo: { hasNextPage: boolean; endCursor: string | null }
}

export async function everyRow<T>(
  field: string,
  node: string,
  args = '',
): Promise<T[]> {
  const selected = session
  if (!selected) throw new Error('The Fóir placement session is no longer connected.')
  return collectConnection(async (after) => {
    // A stale paginated reader must never switch authority midway through its
    // rows. SDK close/revocation still applies to the captured scoped session.
    if (session !== selected) throw new Error('The Fóir placement session changed during this read.')
    const data = await selected.request<{ page: Connection<T> }>(
      `query R($after: String) { page: ${field}(${args}first: 100, after: $after) { pageInfo { hasNextPage endCursor } edges { node { ${node} } } } }`,
      { after },
    )
    return data.page
  })
}

export async function page<T>(
  field: string,
  node: string,
  after: string | null,
  first: number,
  args = '',
) {
  const data = await ask<{ page: Connection<T> }>(
    `query R($after: String, $first: Int) { page: ${field}(${args}first: $first, after: $after) { pageInfo { hasNextPage endCursor } edges { node { ${node} } } } }`,
    { after, first },
  )
  if (
    data.page.pageInfo.hasNextPage &&
    (!data.page.pageInfo.endCursor || data.page.pageInfo.endCursor === after)
  )
    throw new Error('The list did not provide a new continuation cursor.')
  return {
    rows: data.page.edges.map((e) => e.node),
    after: data.page.pageInfo.hasNextPage ? data.page.pageInfo.endCursor : null,
  }
}

export const update = (
  type: string,
  id: string,
  data: Record<string, unknown>,
) =>
  ask(
    `mutation U($id: ID, $data: ${type}UpdateInput!) { update${type}(where: { id: { eq: $id } }, data: $data) { record { _id } } }`,
    { id, data },
  )
export const create = (
  type: string,
  input: Record<string, unknown>,
  ownerId?: string,
) =>
  ask(
    `mutation C($input: Create${type}Input!, $ownerId: ID) { create${type}(input: $input, ownerId: $ownerId) { record { _id } } }`,
    { input, ownerId },
  )
export const remove = (type: string, id: string) =>
  ask(`mutation D($id: String!) { delete${type}(id: $id) }`, { id })
export const sets = (values: Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries(values).map(([key, value]) => [key, { set: value }]),
  )

export type Tier = {
  _id: string
  days: number
  name: string
  badge?: { url: string | null } | null
  stylePrompt: string
  animated: boolean
}
export type Photo = {
  _id: string
  _createdAt: string
  cat?: { name: string }
  photo?: {
    url: string
    width: number
    height: number
    webp?: { thumbnail?: { url: string }; medium?: { url: string } }
  }
}
export type Trial = {
  _id: string
  _createdAt: string
  runId: string
  photoKey: string
  prompt: string
  artModel: string
  artQuality: string
  status: string
  seconds: number
  error?: string
  art?: { webp?: { medium?: { url: string } } }
}
export type App = {
  _id: string
  artModel: string
  artQuality: string
  clusterAt: number
  nearYouMeters: number
  nearYouHours: number
  nearMeMeters: number
  trendingPerCat: number
}
export type Book = {
  _id: string
  _naturalKey: string
  entries: { _id?: string; key: string; value: string }[]
}
export type Tag = { _id: string; label: string; position: number }
export type Grant = {
  _id: string
  _ownerId: string
  until: string
  note: string
}
export type Profile = { _ownerId: string; displayName: string; username: string }
