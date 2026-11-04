import { ActionFailure } from '../../lib/failures'
import type { AppClient } from './data'
export type AppOperation = Extract<
  keyof AppClient['ns']['operations'],
  `execute.${string}`
>
const pendingRuns = new WeakMap<AppClient, Map<string, string>>()
const identities = new WeakMap<AppClient, {user: string | null}>()
/** Only a verified terminal failure permits a fresh execution on explicit
 * retry. A transport error or observation deadline keeps the pending identity. */
export class CompletedOperationFailure extends Error {
  constructor() { super('That action couldn’t complete. Try again.') }
}
export function setOperationIdentity(client: AppClient, user: string | null) { if (identities.get(client)?.user !== user) { pendingRuns.delete(client); identities.set(client, {user}) } }
function object(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : {}
}
/** SDK namespace invocation: Fóir authorizes and signs dispatch; never fetch a Worker operation route. */
export async function runAppOperation(
  client: AppClient,
  name: AppOperation,
  input: Record<string, unknown>,
  identity: { idempotencyKey?: string; concurrencyKey?: string } = {},
) {
  const owner = identities.get(client)
  const current = () => { if (identities.get(client) !== owner) throw new ActionFailure('pending') }
  const asynchronous = name === 'execute.tilly.save-catch' || name === 'execute.tilly.save-profile' || name === 'execute.tilly.post-my-catches' || name === 'execute.tilly.share-capture'
  const signature = JSON.stringify([name, input])
  const retries = pendingRuns.get(client) ?? new Map<string, string>()
  let retryKey = identity.idempotencyKey
  if (asynchronous && !retryKey) {
    retryKey = retries.get(signature) ?? crypto.randomUUID()
    if (retries.size >= 20 && !retries.has(signature)) retries.clear()
    retries.set(signature, retryKey)
    pendingRuns.set(client, retries)
  }
  const reply = object(await client.ns.operations[name]({ input, ...identity, ...(asynchronous ? { mode: 'ASYNC', idempotencyKey: retryKey } : {}) }))
  current()
  let execution = object(reply.execution)
  let result = object(reply.result)
  if (asynchronous && typeof execution.id === 'string') {
    // Hosted logout permanently closes the credential source. Also stop
    // observation and discard late responses when its account changes.
    const deadline = Date.now() + 120_000
    while (['PENDING', 'DISPATCHED', 'RUNNING', 'QUEUED'].includes(String(execution.status).toUpperCase())) {
      if (Date.now() >= deadline) throw new ActionFailure('pending')
      await new Promise(resolve => setTimeout(resolve, 600))
      current()
      const answer = await client.ns.operations.operationExecution({ id: execution.id })
      current()
      const observed = object(answer)
      if (observed.id !== execution.id || observed.operationKey !== name.slice('execute.'.length))
        throw new ActionFailure('pending')
      execution = observed
    }
    if (execution.result != null) result = object(execution.result)
  }
  if (['failed', 'cancelled', 'timed_out'].includes(String(execution.status).toLowerCase())) {
    retries.delete(signature)
    throw new CompletedOperationFailure()
  }
  if (typeof result.error === 'string' && result.error)
    throw new Error(result.error)
  if (typeof execution.error === 'string' && execution.error)
    throw new Error(execution.error)
  if (
    result.ok === false ||
    ['failed', 'cancelled', 'timed_out'].includes(String(execution.status).toLowerCase())
  )
    throw new Error('That action couldn’t complete. Try again.')
  // A queued/empty reply is not a saved social action. Retrying with the same
  // idempotency key lets the platform return that execution's eventual result.
  const catchSaved =
    name === 'execute.tilly.save-catch' &&
    typeof result.catId === 'string' &&
    typeof object(result.photo)._id === 'string' &&
    typeof result.captureId === 'string' && typeof result.revision === 'string' && Array.isArray(result.cats) && result.cats.length > 0
  if (result.ok !== true && !catchSaved)
    throw new ActionFailure('pending')
  retries.delete(signature)
  return { result, execution }
}
