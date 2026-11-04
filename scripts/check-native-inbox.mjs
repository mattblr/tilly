/** Host-only native link and inbox-state checks. No device claim. */
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
const root = fileURLToPath(new URL('../', import.meta.url))
const scratch = mkdtempSync(resolve(tmpdir(), 'tilly-inbox-'))
try {
  const binary = resolve(scratch, 'checks')
  for (const [command, args] of [
    ['swiftc', ['-parse-as-library', '-module-cache-path', resolve(scratch, 'modules'), resolve(root, 'ios/Tilly/Notifications/NotificationLink.swift'), resolve(root, 'ios/Tests/NotificationLinkChecks.swift'), '-o', binary]],
    [binary, []],
    ['swiftc', ['-swift-version', '6', '-parse-as-library', '-module-cache-path', resolve(scratch, 'modules'), resolve(root, 'ios/Tilly/Notifications/NotificationInbox.swift'), resolve(root, 'ios/Tests/NotificationInboxChecks.swift'), '-o', binary]],
    [binary, []],
  ]) {
    const result = spawnSync(command, args, { stdio: 'inherit' })
    if (result.error) throw result.error
    if (result.status !== 0) throw new Error(`${command} failed (${result.status}).`)
  }
} finally { rmSync(scratch, { recursive: true, force: true }) }
