/** Regenerate both SDK surfaces with the website's own scoped publishable key. */
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import { existsSync, mkdtempSync, copyFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'

const root = fileURLToPath(new URL('../', import.meta.url))
for (const file of ['.env.local', '.env']) {
  try {
    process.loadEnvFile(resolve(root, file))
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }
}
const apiKey = process.env.VITE_PLATFORM_API_KEY
if (!apiKey)
  throw new Error(
    'Set VITE_PLATFORM_API_KEY in the root .env before generating website types.',
  )
const origin = new URL(
  process.env.VITE_PLATFORM_API_URL || 'https://api.foir.dev',
).origin
const env = {
  ...process.env,
  FOIR_API_KEY: apiKey,
  VITE_PLATFORM_API_URL: `${origin}/graphql`,
}
const scratch = mkdtempSync(resolve(tmpdir(), 'tilly-schema-'))
try {
  for (const [command, args, cwd] of [
    [
      process.env.FOIR_CLI_PATH || resolve(root, 'node_modules/.bin/foir'),
      [
        'types',
        '--public-api-url',
        origin,
        '--save-manifest', resolve(scratch, 'served-manifest.json'),
        '--out',
        'foir.website.generated.ts',
      ],
      scratch,
    ],
    [
      existsSync(resolve(root, 'web/node_modules/.bin/graphql-codegen'))
        ? resolve(root, 'web/node_modules/.bin/graphql-codegen')
        : resolve(root, 'node_modules/.bin/graphql-codegen'),
      ['--config', 'codegen.ts'],
      resolve(root, 'web'),
    ],
  ]) {
    const result = spawnSync(command, args, { cwd, env, stdio: 'inherit' })
    if (result.error) throw result.error
    if (result.status !== 0) process.exit(result.status || 1)
    if (cwd === scratch) {
      const prune = spawnSync(process.execPath, [resolve(root, 'scripts/prune-manifest-types.mjs'), resolve(scratch, 'served-manifest.json'), resolve(scratch, 'client-manifest.json')], {stdio: 'inherit'})
      if (prune.status !== 0) process.exit(prune.status || 1)
      const generate = spawnSync(command, ['types', '--from', 'client-manifest.json', '--out', 'foir.website.generated.ts'], {cwd: scratch, env, stdio: 'inherit'})
      if (generate.status !== 0) process.exit(generate.status || 1)
      copyFileSync(
        resolve(scratch, 'foir.website.generated.ts'),
        resolve(root, 'web/src/generated/foir.website.generated.ts'),
      )
    }
  }
} finally {
  rmSync(scratch, { recursive: true, force: true })
}
