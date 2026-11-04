import { createFoirClient } from '@foir/sdk/data'
import * as generated from './generated/foir.op.tilly.evaluate-challenges.generated'
import { operationApi } from './environment'
import { withContentSafety } from './content-safety'
import { continueRun } from '@foir/sdk/server'
import { operationCredential } from './credentials'
import { challengeCursor, evaluateCaptureChallenges } from './challenge-workflow'
import { ChallengeRefusal } from './challenge-contract'
import type { DispatchEnvelope, OperationIngress } from './types'

/** The signed install dispatch is the only data and credential authority. */
export async function evaluateChallenges(envelope: DispatchEnvelope, ingress: OperationIngress) {
  const client = withContentSafety(createFoirClient({ apiUrl: operationApi(ingress.apiUrl), dispatch: ingress.dispatch, generated,
    requestInit: { signal: AbortSignal.timeout(20_000) } }), ingress)
  try {
    let apiKey: string | undefined
    try { apiKey = await operationCredential(ingress, 'openai') }
    catch { /* No supported credential means unavailable, never an environment fallback. */ }
    console.info('Tilly challenge provider availability', { credentialConfigured: !!apiKey })
    const result = await evaluateCaptureChallenges(client, {...envelope.input}, ingress.userId ?? null,
      envelope.executionId, {enabled: true, apiKey, filesOrigin: ingress.filesOrigin},
      challengeCursor(envelope.continuation?.cursor))
    if (result.nextCursor) return continueRun({cursor: JSON.stringify(result.nextCursor)})
    return {status: 200, body: result}
  } catch (error) {
    if (error instanceof ChallengeRefusal) return {status: error.status, body: {ok: false, error: error.message}}
    throw error
  }
}
