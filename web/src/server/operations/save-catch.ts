import { createFoirClient } from '@foir/sdk/data'
import { saveTaggedCapture } from './tagged-captures'
import { CaptureRefusal } from './capture-contract'
import { operationApi } from './environment'
import { withContentSafety } from './content-safety'
import * as generated from './generated/foir.op.tilly.save-catch.generated'
import type { CatchInput, DispatchEnvelope, OperationIngress, OperationResponse } from './types'

/**
 * Saves a catch: one photo and the cats tagged in it. Fóir dispatches this
 * operation asynchronously, so a save runs as bounded slices (capture-save.ts);
 * this synchronous form saves in one go and serves the same contract.
 */
export async function saveCatch(input: CatchInput, _envelope: DispatchEnvelope, ingress: OperationIngress): Promise<OperationResponse> {
  // The platform's word for who the run is for, not the request body's.
  const userId = ingress.userId
  if (!userId) return { status: 403, body: { error: 'sign in to catch a cat' } }
  const foir = withContentSafety(createFoirClient({ apiUrl: operationApi(ingress.apiUrl), dispatch: ingress.dispatch, generated }), ingress)
  try { return { status: 200, body: await saveTaggedCapture(foir, { ...input }, userId) } }
  catch (error) {
    if (error instanceof CaptureRefusal) return { status: error.status, body: { error: error.message } }
    throw error
  }
}
