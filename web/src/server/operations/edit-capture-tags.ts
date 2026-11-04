import { createFoirClient } from '@foir/sdk/data'
import * as generated from './generated/foir.op.tilly.update-capture-tags.generated'
import { operationApi } from './environment'
import { CaptureRefusal } from './capture-contract'
import { editTaggedCapture } from './tagged-captures'
import { withContentSafety } from './content-safety'
import type { DispatchEnvelope, OperationIngress, OperationInput, OperationResponse } from './types'

/** Caller identity and data authority come only from verified platform ingress. */
export async function update_capture_tags(input: OperationInput, _envelope: DispatchEnvelope, ingress: OperationIngress): Promise<OperationResponse> {
  if (!ingress.userId) return { status: 403, body: { error: 'Sign in to edit your capture.' } }
  const foir = withContentSafety(createFoirClient({ apiUrl: operationApi(ingress.apiUrl), dispatch: ingress.dispatch, generated }), ingress)
  try { return { status: 200, body: await editTaggedCapture(foir, { ...input }, ingress.userId) } }
  catch (error) {
    if (error instanceof CaptureRefusal) return { status: error.status, body: { error: error.message } }
    throw error
  }
}
