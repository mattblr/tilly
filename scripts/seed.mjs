/** Populate a new example project using the signed-in person's standard Fóir CLI. */
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { readFile, mkdtemp, writeFile, rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const execute = promisify(execFile)
const productionApi = 'https://rpc.foir.io', devApi = 'https://rpc-dev.foir.io'

/** Production Fóir can host an isolated development project. Require its
 * explicit ID as a second check rather than treating every production-plane
 * project as a safe seed target because an environment file happened to load. */
export function seedTarget({ api = productionApi, project, developmentProject }) {
  if (![productionApi, devApi].includes(api))
    throw new Error('Choose a supported Fóir control plane before seeding.')
  if (api !== devApi && (!project || developmentProject !== project))
    throw new Error('Seeding on production Fóir requires --development-project with the exact isolated development project ID from your reviewed setup.')
  return { api, project }
}

export function seedArguments(args) {
  let dryRun = false, developmentProject
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--dry-run') dryRun = true
    else if (args[i] === '--development-project' && !developmentProject && args[i + 1] && !args[i + 1].startsWith('-')) developmentProject = args[++i]
    else throw new Error('Usage: pnpm seed [--dry-run] [--development-project <reviewed-id>]')
  }
  return { dryRun, developmentProject }
}

export function seedRecords(content) {
  if (!content.homeCopy || !Array.isArray(content.records))
    throw new Error('Expected homeCopy and records in seed.json')
  const records = [
    {
      modelKey: 'ui-copy',
      naturalKey: 'marketing-home',
      publish: false,
      data: {
        entries: Object.entries(content.homeCopy).map(([key, value]) => ({
          key,
          value,
        })),
      },
    },
    ...content.records,
  ]
  const identities = new Set()
  for (const record of records) {
    const identity = `${record.modelKey}/${record.naturalKey}`
    if (
      !record.modelKey ||
      !record.naturalKey ||
      !record.data ||
      identities.has(identity)
    )
      throw new Error(`Invalid or duplicate seed record: ${identity}`)
    identities.add(identity)
  }
  return records
}

/** Do not mistake an authentication, model, scope or transport failure for absence. */
export function recordIsMissing(error, record) {
  return (
    !error?.code &&
    error?.message ===
      `Record "${record.naturalKey}" not found in model "${record.modelKey}".`
  )
}

export async function seedProject(records, cli, report = console.log) {
  let created = 0
  for (const record of records) {
    const label = `${record.modelKey}/${record.naturalKey}`
    const found = await cli([
      'records',
      'get',
      record.modelKey,
      record.naturalKey,
    ])
    if (found.ok) {
      report(`Keep existing ${label}`)
      continue
    }
    if (!recordIsMissing(found.error, record))
      throw new Error(
        `Cannot read ${label}; stopped before creating it (${found.error?.code ?? 'CLI error'}).`,
      )
    const result = await cli(
      [
        'records',
        'create',
        record.modelKey,
        '--natural-key',
        record.naturalKey,
      ],
      record.data,
    )
    if (!result.ok || !result.value?.record?.id)
      throw new Error(
        `Could not create ${label}; no existing content was replaced.`,
      )
    created++
    if (record.publish) {
      const versionId =
        result.value.version?.id ?? result.value.record.currentVersionId
      if (!versionId)
        throw new Error(
          `Created ${label} but received no version to publish. Inspect its draft in Fóir.`,
        )
      const published = await cli(['records', 'publish', versionId])
      if (!published.ok)
        throw new Error(
          `Created ${label} but publishing failed. Publish its draft in Fóir; rerunning preserves existing records.`,
        )
    }
    report(`Created ${label}${record.publish ? ' and published it' : ''}`)
  }
  return created
}

async function main() {
  const { dryRun, developmentProject } = seedArguments(process.argv.slice(2))
  if (existsSync(join(root, '.env'))) process.loadEnvFile(join(root, '.env'))
  const content = JSON.parse(
    await readFile(join(root, 'web/content/seed.json'), 'utf8'),
  )
  const records = seedRecords(content)
  const project = process.env.FOIR_PROJECT_ID
  const tenant = process.env.FOIR_TENANT_ID
  const api = process.env.FOIR_API_URL || productionApi
  seedTarget({ api, project, developmentProject })
  console.log(
    `Target: ${api} / workspace ${tenant || '(not set)'} / project ${project || '(not set)'}`,
  )
  if (dryRun) {
    for (const record of records)
      console.log(
        `Ensure ${record.modelKey}/${record.naturalKey}${record.publish ? ' (publish only if newly created)' : ''}`,
      )
    console.log(
      'Dry run: validated local JSON only; no platform calls or writes.',
    )
    return
  }
  if (!project || !tenant)
    throw new Error(
      'Set FOIR_PROJECT_ID and FOIR_TENANT_ID in .env before seeding. Sign in with foir login and push the root config first.',
    )
  const temporary = await mkdtemp(join(tmpdir(), 'tilly-seed-'))
  let sequence = 0
  try {
    const cli = async (command, data) => {
      const args = [
        process.env.FOIR_CLI_PATH || join(root, 'node_modules/@foir/cli/dist/cli.js'),
        '--api-url',
        api,
        '--project-id',
        project,
        '--tenant-id',
        tenant,
        '--org-id',
        '-',
        '--json',
        ...command,
      ]
      if (data) {
        const file = join(temporary, `${sequence++}.json`)
        await writeFile(file, JSON.stringify(data), { mode: 0o600 })
        args.push('--file', file)
      }
      try {
        const result = await execute(process.execPath, args, {
          // Every record call is explicitly scoped above; no local config push
          // or dependency resolution is needed to populate those records.
          cwd: temporary,
          maxBuffer: 8 * 1024 * 1024,
        })
        return { ok: true, value: JSON.parse(result.stdout) }
      } catch (failure) {
        // Capture record output rather than printing it. CLI JSON errors are on stderr.
        const lines = String(failure.stderr || '')
          .trim()
          .split('\n')
          .reverse()
        for (const line of lines) {
          try {
            const value = JSON.parse(line)
            if (value.error) return { ok: false, error: value.error }
          } catch {}
        }
        return { ok: false, error: { code: 'CliFailed' } }
      }
    }
    const created = await seedProject(records, cli)
    console.log(
      `Done: ${created} created. Existing content and translations were left intact.`,
    )
  } finally {
    await rm(temporary, { recursive: true, force: true })
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
)
  main().catch((error) => {
    console.error(error.message)
    process.exitCode = 1
  })
