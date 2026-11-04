import { createAppClient } from '@foir/sdk/app'
import { operationApi } from './environment'
import type { OperationIngress } from './types'

/** Read only the credential owner bound to this verified dispatch. */
export async function operationCredential(ingress: OperationIngress, field: string) {
  const app = createAppClient({
    apiUrl: operationApi(ingress.apiUrl),
    dispatch: ingress.dispatch,
    requestInit: { signal: AbortSignal.timeout(15_000) },
  })
  let fields: Record<string, string>
  try {
    fields = await app.install.credentials()
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    const reason = /not installed|no install/i.test(message) ? 'owner_unavailable'
      : /scope|grant|forbidden|permission/i.test(message) ? 'scope_refused'
      : 'read_failed'
    // Only a fixed category: no response body, credential, identity or token.
    console.warn(`Fóir credential read refused: ${reason}`)
    throw error
  }
  const key = fields[field]?.trim()
  if (!key) throw new Error('The provider credential is not configured in Fóir.')
  return key
}
