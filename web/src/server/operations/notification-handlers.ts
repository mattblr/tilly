import { createFoirClient } from '@foir/sdk/data'
import { continueRun } from '@foir/sdk/server'
import { operationApi } from './environment'
import { notificationStore } from './notification-store'
import { notificationSlice } from './notification-workflow'
import { settingsInput } from './notification-policy'
import type { DispatchEnvelope, GeneratedOperation, OperationIngress, OperationResponse } from './types'

/** Each module must be generated from this operation's real dispatch scope. */
export function notificationHandlers(generated: { save: GeneratedOperation; reminder: GeneratedOperation; campaign: GeneratedOperation }) {
  const store = (ingress: OperationIngress, module: GeneratedOperation) => notificationStore(createFoirClient({
    apiUrl: operationApi(ingress.apiUrl), dispatch: ingress.dispatch, generated: module,
  }))
  return {
    async save(input: Record<string, unknown>, ingress: OperationIngress): Promise<OperationResponse> {
      if (!ingress.userId) return { status: 403, body: { ok: false, error: 'Sign in to change notification settings.' } }
      const values = settingsInput(input)
      await store(ingress, generated.save).save(ingress.userId, values)
      return { status: 200, body: { ok: true } }
    },
    async slice(kind: 'reminder' | 'campaign', envelope: DispatchEnvelope, ingress: OperationIngress) {
      if (ingress.userId || !envelope.callback) return { status: 403, body: { ok: false, error: 'An operator or scheduled asynchronous dispatch is required.' } }
      const input = envelope.input as Record<string, unknown> ?? {}
      const answer = await notificationSlice(store(ingress, generated[kind]), kind, input, envelope.continuation?.cursor)
      return answer.cursor ? continueRun({ cursor: answer.cursor, progressMessage: 'Checking notification audience' }) : { status: 200, body: answer.result! }
    },
  }
}
