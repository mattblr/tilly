import { withPreviewEnvironment } from './server/preview-context'
import {
  previewGate,
  previewResponse,
  type PreviewEnv,
} from './server/preview-policy'
import handler from '@tanstack/react-start/server-entry'
import { loginReturn } from './server/login-return'
import { operationFetch, type OperationEnv } from './server/operations/dispatch'
import {
  consoleRequest,
  consoleResponse,
  isConsoleRequest,
} from './server/console-policy'

// One Worker serves Start pages, the console route, manifest and signed operations.
export default {
  async fetch(
    request: Request,
    env: OperationEnv & PreviewEnv & Pick<WorkerBindings, 'ASSETS'>,
  ) {
    const build = {
      preview: import.meta.env.VITE_FOIR_PREVIEW === 'true',
      apiKey: import.meta.env.VITE_PLATFORM_API_KEY ?? '',
    }
    const denied = await previewGate(request, env, build)
    if (denied) return denied
    if (build.preview) {
      const path = new URL(request.url).pathname
      if (/\.[a-z0-9]{1,8}$/i.test(path))
        return previewResponse(await env.ASSETS.fetch(request))
      return withPreviewEnvironment(env, async () => previewResponse(await handler.fetch(request)))
    }
    const returning = loginReturn(request, env.TILLY_PREVIEW_HOST)
    if (returning) return returning
    const operation = await operationFetch(request, env)
    if (operation) return operation
    if (isConsoleRequest(request)) {
      const { request: scopedRequest, nonce } = consoleRequest(request)
      return consoleResponse(await handler.fetch(scopedRequest), nonce, env)
    }
    return handler.fetch(request)
  },
}
