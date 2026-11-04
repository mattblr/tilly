import { AsyncLocalStorage } from 'node:async_hooks'
import type { PreviewEnv } from './preview-policy'

// One request's Worker bindings, never a global credential/session cache.
const context = new AsyncLocalStorage<PreviewEnv>()
export const withPreviewEnvironment = <T>(env: PreviewEnv, render: () => T) => context.run(env, render)
export function previewEnvironment() {
  const env = context.getStore()
  if (!env) throw new Error('Preview rendering requires the verified Worker request context.')
  return env
}
