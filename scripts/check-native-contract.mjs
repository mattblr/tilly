/** Check active native documents against a schema exported with the target's
 * actual publishable key. Does not sign in, execute operations or alter codegen. */
import { readFileSync, readdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

const root = fileURLToPath(new URL('../', import.meta.url))
const require = createRequire(resolve(root, 'web/package.json'))
const { buildSchema, parse, validate, Kind } = require('graphql')
const [schemaPath, ...flags] = process.argv.slice(2)
if (!schemaPath || flags.some(flag => flag !== '--without-paid') || flags.length > 1)
  throw new Error('Usage: pnpm check:ios-contract <target-schema.graphqls> [--without-paid]')
const schema = buildSchema(readFileSync(resolve(schemaPath), 'utf8'))
const directory = resolve(root, 'ios/GraphQL/Operations')
const document = parse(readdirSync(directory).filter(name => name.endsWith('.graphql'))
  .map(name => readFileSync(resolve(directory, name), 'utf8')).join('\n') + '\n' + ['Notifications', 'Safety', 'Selfies', 'Execution', 'Challenges']
  .map(name => readFileSync(resolve(root, `ios/GraphQL/${name}/Operations.graphql`), 'utf8')).join('\n'))
if (flags.includes('--without-paid')) {
  const disabled = new Set(['MakeCatchArt', 'ClaimPremium'])
  document.definitions = document.definitions.filter(definition =>
    definition.kind !== Kind.OPERATION_DEFINITION || !disabled.has(definition.name?.value))
}
const errors = validate(schema, document)
if (errors.length) {
  for (const error of errors) console.error(error.message)
  process.exitCode = 1
} else console.log(`Native documents match the target schema${flags.length ? '; paid operations explicitly disabled' : ''}.`)
