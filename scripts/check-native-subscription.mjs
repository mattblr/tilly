/** Host-only production subscription account/race controls; no store/device claim. */
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
const root = fileURLToPath(new URL('../', import.meta.url))
const scratch = mkdtempSync(resolve(tmpdir(), 'tilly-subscription-'))
try {
  const binary = resolve(scratch, 'checks')
  const common = ['-swift-version', '6', '-parse-as-library', '-module-cache-path', resolve(scratch, 'modules')]
  for (const [command, args, env] of [
    ['swiftc', [...common, '-emit-module', '-emit-library', '-module-name', 'RevenueCat', resolve(root, 'ios/Tests/RevenueCatSubscriptionStub.swift'), '-o', resolve(scratch, 'libRevenueCat.dylib'), '-emit-module-path', resolve(scratch, 'RevenueCat.swiftmodule')]],
    ['swiftc', [...common, '-I', scratch, '-L', scratch, '-lRevenueCat', resolve(root, 'ios/Tilly/Premium/Subscription.swift'), resolve(root, 'ios/Tests/SubscriptionChecks.swift'), '-o', binary]],
    [binary, [], {...process.env, DYLD_LIBRARY_PATH: scratch}],
  ]) {
    const result = spawnSync(command, args, {stdio: 'inherit', env})
    if (result.error) throw result.error
    if (result.status !== 0) throw new Error(`${command} failed (${result.status}).`)
  }
} finally { rmSync(scratch, {recursive: true, force: true}) }
