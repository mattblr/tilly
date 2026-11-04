import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  consoleRequest,
  consoleResponse,
  isConsoleRequest,
} from './console-policy.ts'

test('the console uses a new server nonce and refuses a visitor-supplied value', async () => {
  const request = new Request('https://site.example/_foir/apps/tilly/admin', {
    headers: { 'x-tilly-csp-nonce': 'visitor-supplied' },
  })
  const first = consoleRequest(request)
  const second = consoleRequest(request)
  assert.notEqual(first.nonce, 'visitor-supplied')
  assert.notEqual(first.nonce, second.nonce)
  assert.equal(first.request.headers.get('x-tilly-csp-nonce'), first.nonce)
  const response = consoleResponse(
    new Response('<html></html>', {
      headers: {
        'content-type': 'text/html',
        'cache-control': 'public, max-age=60',
      },
    }),
    first.nonce,
  )
  assert.equal(response.headers.get('cache-control'), 'no-store')
  const policy = response.headers.get('content-security-policy')
  assert.ok(policy.includes(`script-src 'self' 'nonce-${first.nonce}'`))
  assert.ok(policy.includes('frame-ancestors https://app.foir.io'))
  assert.equal(await response.text(), '<html></html>')
})

test('console aliases keep the same embedding policy', () => {
  for (const path of [
    '/_foir/apps/tilly/admin',
    '/_foir/apps/tilly/admin/',
    '/_FOIR/Apps/Tilly/ADMIN',
    '/%5Ffoir/apps/tilly/admin',
  ])
    assert.ok(isConsoleRequest(new Request(`https://site.example${path}`)))
  assert.equal(isConsoleRequest(new Request('https://site.example/')), false)
  assert.equal(
    isConsoleRequest(
      new Request('https://site.example/_foir/apps/tilly/admin-extra'),
    ),
    false,
  )
})

test('production console policy selects only production API, media and parent origins', () => {
  const policy = consoleResponse(new Response(''), 'nonce', {
    FOIR_API_ORIGIN: 'https://api.foir.dev', FOIR_FILES_ORIGIN: 'https://cdn.foir.dev',
  }).headers.get('content-security-policy')
  assert.match(policy, /frame-ancestors https:\/\/app\.foir\.io/)
  assert.match(policy, /connect-src 'self' https:\/\/api\.foir\.dev/)
  assert.match(policy, /img-src 'self' https:\/\/cdn\.foir\.dev data:/)
  assert.ok(!policy.includes('-dev.foir'))
  for (const env of [
    { FOIR_API_ORIGIN: 'https://api.foir.dev', FOIR_FILES_ORIGIN: 'https://cdn-dev.foir.dev' },
    { FOIR_API_ORIGIN: 'https://untrusted.example', FOIR_FILES_ORIGIN: 'https://cdn.foir.dev' },
  ]) assert.throws(() => consoleResponse(new Response(''), 'nonce', env))
})
