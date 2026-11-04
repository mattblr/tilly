/** Keep Apollo's scoped namespaces in one native target without duplicate
 * Swift basenames. Generated contents are never changed. Run after codegen. */
import { existsSync, readdirSync, renameSync, unlinkSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
function visit(directory, namespace) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) visit(path, namespace)
    // Apollo explicitly leaves cache configuration to the application. Use
    // Foir/NotificationSchemaConfiguration.swift's namespaced implementation.
    else if (['SchemaConfiguration.swift', `${namespace}_SchemaConfiguration.swift`].includes(entry.name)) unlinkSync(path)
    else if (['SelfieAPI', 'ExecutionAPI', 'ChallengeAPI'].includes(namespace) && ['JSON.swift', `${namespace}_JSON.swift`].includes(entry.name)) unlinkSync(path)
    else if (entry.name.endsWith('.swift') && !entry.name.startsWith(`${namespace}_`))
      renameSync(path, join(directory, `${namespace}_${entry.name}`))
  }
}
for (const namespace of ['NotificationAPI', 'SafetyAPI', 'SelfieAPI', 'ExecutionAPI', 'ChallengeAPI'])
  visit(fileURLToPath(new URL(`../ios/Tilly/${namespace}`, import.meta.url)), namespace)

// Preserve the generated main namespace root under a distinct basename too.
// Apollo can otherwise prune its existing root file on the next generation.
const mainRoot = fileURLToPath(new URL('../ios/Tilly/FoirAPI/', import.meta.url))
const mainNamespace = join(mainRoot, 'FoirAPI.graphql.swift')
if (existsSync(mainNamespace))
  renameSync(mainNamespace, join(mainRoot, 'FoirAPI_FoirAPI.graphql.swift'))
