import { test } from 'node:test'
import assert from 'node:assert/strict'
import { seedRecords, seedProject, seedTarget, seedArguments } from './seed.mjs'
const sample = {
  modelKey: 'menu',
  naturalKey: 'main-nav',
  publish: true,
  data: { title: 'Navigation' },
}
const missing = {
  ok: false,
  error: { message: 'Record "main-nav" not found in model "menu".' },
}

test('production-plane development seeding requires the exact separately supplied target', () => {
  assert.deepEqual(seedTarget({ api: 'https://rpc.foir.io', project: 'isolated-dev', developmentProject: 'isolated-dev' }), { api: 'https://rpc.foir.io', project: 'isolated-dev' })
  for (const developmentProject of [undefined, 'another-project'])
    assert.throws(() => seedTarget({ api: 'https://rpc.foir.io', project: 'live-project', developmentProject }), /exact isolated development/)
  assert.throws(() => seedTarget({ api: 'https://unapproved.example', project: 'isolated-dev', developmentProject: 'isolated-dev' }), /supported Fóir/)
  // Production is the default, so the default also needs the explicit target.
  assert.throws(() => seedTarget({ project: 'my-project' }), /exact isolated development/)
  assert.equal(seedTarget({ api: 'https://rpc-dev.foir.io', project: 'dev-plane' }).api, 'https://rpc-dev.foir.io')
})

test('seed CLI keeps dry run and explicit development target, and refuses malformed flags', () => {
  assert.deepEqual(seedArguments(['--dry-run', '--development-project', 'isolated-dev']), { dryRun: true, developmentProject: 'isolated-dev' })
  for (const args of [['--development-project'], ['--development-project', '--dry-run'], ['--project', 'live'], ['--development-project', 'a', '--development-project', 'b']])
    assert.throws(() => seedArguments(args), /Usage/)
})

test('rerunning the seed keeps existing content and its translations untouched', async () => {
  const calls = []
  const count = await seedProject(
    [sample],
    async (command) => {
      calls.push(command)
      return { ok: true, value: { id: 'existing' } }
    },
    () => {},
  )
  assert.equal(count, 0)
  assert.deepEqual(calls, [['records', 'get', 'menu', 'main-nav']])
})

test('a missing record is created from its own fields, then its returned version is published', async () => {
  const calls = []
  const count = await seedProject(
    [sample],
    async (command, data) => {
      calls.push({ command, data })
      if (command[1] === 'get') return missing
      return {
        ok: true,
        value: { record: { id: 'new-record' }, version: { id: 'new-version' } },
      }
    },
    () => {},
  )
  assert.equal(count, 1)
  assert.deepEqual(calls[1].data, sample.data)
  assert.deepEqual(calls[2].command, ['records', 'publish', 'new-version'])
})

test('permission and transport failures never trigger a create', async () => {
  for (const code of [
    'PermissionDenied',
    'Unauthenticated',
    'Unavailable',
    'NotFound',
  ]) {
    const calls = []
    await assert.rejects(
      seedProject(
        [sample],
        async (command) => {
          calls.push(command)
          return { ok: false, error: { code } }
        },
        () => {},
      ),
      /stopped before creating/,
    )
    assert.equal(calls.length, 1)
  }
})

test('the seed refuses duplicate record keys before any writes', () => {
  assert.throws(
    () => seedRecords({ homeCopy: {}, records: [sample, sample] }),
    /duplicate seed record/,
  )
})
