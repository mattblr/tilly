import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
const root = fileURLToPath(new URL('../', import.meta.url))
const scratch = mkdtempSync(resolve(tmpdir(), 'tilly-theme-check-'))
try {
  const executable = resolve(scratch, 'theme')
  const build = spawnSync('swiftc', ['-swift-version', '6', '-parse-as-library', '-module-cache-path', resolve(scratch, 'modules'),
    resolve(root, 'ios/Tilly/Design/ThemeValues.swift'), resolve(root, 'ios/Tests/ThemeChecks.swift'), '-o', executable], { stdio: 'inherit' })
  if (build.error) throw build.error
  if (build.status) process.exitCode = build.status
  else {
    const run = spawnSync(executable, [resolve(root, 'ios/Tilly/Resources/DesignTokens.json')], { stdio: 'inherit' })
    if (run.error) throw run.error
    process.exitCode = run.status ?? 1
  }
} finally { rmSync(scratch, { recursive: true, force: true }) }
