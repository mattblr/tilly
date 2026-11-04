import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const root = fileURLToPath(new URL('../', import.meta.url))
const scratch = mkdtempSync(resolve(tmpdir(), 'tilly-error-check-'))
try {
  const executable = resolve(scratch, 'errors')
  const compile = spawnSync('xcrun', ['swiftc', '-swift-version', '6', '-parse-as-library',
    resolve(root, 'ios/Tilly/Foir/UserFailure.swift'), resolve(root, 'ios/Tests/UserFailureChecks.swift'), '-o', executable], { stdio: 'inherit' })
  if (compile.error) throw compile.error
  if (compile.status !== 0) process.exitCode = compile.status || 1
  else {
    const run = spawnSync(executable, [], { stdio: 'inherit' })
    if (run.error) throw run.error
    process.exitCode = run.status ?? 1
  }
} finally { rmSync(scratch, { recursive: true, force: true }) }
