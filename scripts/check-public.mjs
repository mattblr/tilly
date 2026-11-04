import { readFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'

// Scan the candidate public tree. Ignored local configuration is excluded;
// accidentally tracked .env/key files are still inspected and refused.
const files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean)
const findings = new Set()
for (const path of files) {
  let source
  try { source = await readFile(path, 'utf8') }
  catch (error) { if (error.code === 'ENOENT') continue; throw error }
  if (/(?:TTS|EID)-\d+|\/Users\/|trycloudflare\.com|foir_pub_[A-Za-z0-9_-]{20,}|-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/.test(source)) findings.add(path)
  if (/(?:^|\/)\.env$|\.secret\.json$|\.p8$|\.jwt$/.test(path)) findings.add(path)
  if (path.startsWith('web/src/server/') && /env\.[A-Z_]*(?:OPENAI|REVENUECAT|STRIPE)[A-Z_]*(?:KEY|SECRET)/.test(source)) findings.add(path)
}
console.log(JSON.stringify({ possiblePrivateFiles: [...findings] }))
if (findings.size) process.exitCode = 1
