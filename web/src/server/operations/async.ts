import { createCallbackClient, CONTINUATION_MEDIA_TYPE } from '@foir/sdk/server'
import type { DispatchEnvelope, OperationResponse } from './types'
/** Fóir owns this run and its next slice. All work/callbacks finish inside the
 * current request; no detached promise, credential persistence or second queue. */
export async function runAsyncSlice(
  envelope: DispatchEnvelope,
  apiUrl: string,
  work: () => Promise<OperationResponse | Response>,
) {
  if (!envelope.callback)
    throw new Error('An asynchronous platform dispatch is required.')
  const out = await work()
  if (out instanceof Response) {
    if (
      out.status !== 200 ||
      out.headers.get('Content-Type') !== CONTINUATION_MEDIA_TYPE
    )
      throw new Error('Unexpected operation continuation.')
    out.headers.set('Cache-Control', 'no-store')
    return out
  }
  const callback = createCallbackClient(envelope.callback, {
    executionId: envelope.executionId,
    apiUrl,
  })
  if (out.status >= 400 || out.body.ok !== true)
    await callback.fail(
      'OPERATION_FAILED',
      typeof out.body.error === 'string'
        ? out.body.error
        : 'The operation could not finish.',
      { retryable: false },
    )
  else await callback.complete(out.body)
  return Response.json(
    { accepted: true },
    { status: 202, headers: { 'Cache-Control': 'no-store' } },
  )
}
