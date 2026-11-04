import { FOIR_CONSOLE_ORIGINS } from '@foir/sdk/placement'

/** Match the placement handshake and CSP to one selected Fóir environment. */
export function consoleEnvironment(apiUrl = 'https://api.foir.dev', filesUrl?: string) {
  const apiOrigin = new URL(apiUrl).origin
  const production = apiOrigin === 'https://api.foir.dev'
  if (!production && apiOrigin !== 'https://api-dev.foir.dev')
    throw new Error('Configure the console for a supported Fóir API origin.')
  const filesOrigin = production ? 'https://cdn.foir.dev' : 'https://cdn-dev.foir.dev'
  if (filesUrl && new URL(filesUrl).origin !== filesOrigin)
    throw new Error('Console API and file origins must select the same environment.')
  return { apiOrigin, filesOrigin, consoleOrigins: production ? FOIR_CONSOLE_ORIGINS.production : FOIR_CONSOLE_ORIGINS.dev }
}
