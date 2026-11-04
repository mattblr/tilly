/** Execute the production ordinary streak calendar rules without a simulator or credentials. */
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
const root = fileURLToPath(new URL('../', import.meta.url))
const scratch = mkdtempSync(resolve(tmpdir(), 'tilly-streak-check-'))
try {
  const executable = resolve(scratch, 'streak')
  const result = spawnSync('swiftc', ['-swift-version', '6', '-parse-as-library', '-module-cache-path', resolve(scratch, 'modules'),
    resolve(root, 'ios/Tilly/Profile/CaptureStreak.swift'), resolve(root, 'ios/Tests/StreakChecks.swift'), '-o', executable], { stdio: 'inherit' })
  if (result.error) throw result.error
  if (result.status) process.exitCode = result.status
  else {
    const run = spawnSync(executable, [], { stdio: 'inherit' })
    if (run.error) throw run.error
    process.exitCode = run.status ?? 1
  }
} finally { rmSync(scratch, { recursive: true, force: true }) }
