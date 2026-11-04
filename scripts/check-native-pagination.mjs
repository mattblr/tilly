/** Host-only checks of the production pagination core; no simulator or app launch. */
import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

if (process.platform !== 'darwin')
  throw new Error('Run native pagination checks on macOS with Swift installed.')
const root = new URL('../', import.meta.url)
const scratch = await mkdtemp(join(tmpdir(), 'tilly-pagination-'))
try {
  // Substitute only framework/SDK imports and the unrelated SwiftUI view modifier.
  // Paging.all, Paged and their error handling are the actual production source.
  let core = (
    await readFile(new URL('ios/Tilly/Foir/Paging.swift', root), 'utf8')
  )
    .replace('import Apollo\n', '')
    .replace('import SwiftUI\n', 'import Observation\n')
  const start = core.indexOf('/// Loads a screen')
  const end = core.indexOf('/// Malformed continuation', start)
  if (start < 0 || end < 0)
    throw new Error('Review the native paging fixture boundaries.')
  core = core.slice(0, start) + core.slice(end)
  const source = join(scratch, 'Paging.swift'),
    binary = join(scratch, 'checks')
  await writeFile(source, core)
  for (const [command, args] of [
    [
      'swiftc',
      [
        '-parse-as-library',
        '-module-cache-path',
        join(scratch, 'modules'),
        source,
        new URL('ios/Tilly/Foir/UserFailure.swift', root).pathname,
        new URL('ios/Tilly/Foir/ChronologicalPages.swift', root).pathname,
        new URL('ios/Tests/PaginationChecks.swift', root).pathname,
        '-o',
        binary,
      ],
    ],
    [binary, []],
  ]) {
    const result = spawnSync(command, args, { stdio: 'inherit' })
    if (result.error) throw result.error
    if (result.status !== 0)
      throw new Error(`${command} failed (${result.status}).`)
  }
} finally {
  await rm(scratch, { recursive: true, force: true })
}
