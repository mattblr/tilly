import { createFoirClient } from '@foir/sdk/data'
import { continueRun } from '@foir/sdk/server'
import { operationApi } from './environment'
import { challengeAnnouncementSlice } from './challenge-announcements'
import { challengeAnnouncementStore } from './challenge-announcements-store'
import type { DispatchEnvelope, GeneratedOperation, OperationIngress } from './types'

/** Root supplies the generated module from this operation's actual served scope.
 * This dedicated switch must not activate reminders or old social hooks. */
export function challengeAnnouncementHandler(generated: GeneratedOperation, options: { dryRunOnly?: boolean; testRecipient?: string } = {}) {
  return async (envelope: DispatchEnvelope, ingress: OperationIngress, enabled: boolean) => {
    const dryRun = options.dryRunOnly === true || (envelope.input as Record<string, unknown> | undefined)?.dryRun === true
    if (!envelope.callback || (!options.dryRunOnly && (ingress.userId || envelope.context.userId || envelope.trigger.type !== 'schedule')))
      return { status: 403, body: { ok: false, error: 'A verified actorless asynchronous announcement dispatch is required.' } }
    if (!dryRun && !/^[a-z0-9]{10,40}$/.test(options.testRecipient ?? ''))
      return { status: 403, body: { ok: false, error: 'Challenge notification verification requires one configured disposable recipient.' } }
    if (!enabled && !dryRun) return { status: 403, body: { ok: false, error: 'Challenge announcement delivery is disabled.' } }
    const client = createFoirClient({ apiUrl: operationApi(ingress.apiUrl), dispatch: ingress.dispatch, generated,
      requestInit: { signal: AbortSignal.timeout(20_000) } })
    const answer = await challengeAnnouncementSlice(challengeAnnouncementStore(client, { testRecipient: options.testRecipient }), dryRun, envelope.continuation?.cursor)
    return 'cursor' in answer ? continueRun({ cursor: answer.cursor, progressMessage: 'Checking challenge invitation audience' })
      : { status: 200, body: answer.result }
  }
}
