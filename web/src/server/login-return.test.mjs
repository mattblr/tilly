import assert from 'node:assert/strict'
import test from 'node:test'
import { loginReturn } from './login-return.ts'
test('hosted login returns only to the explicitly configured HTTPS preview sibling', () => {
  const request = (target, path = '/feed') => new Request(`https://app.example${path}?returnTo=${encodeURIComponent(target)}`)
  const result = loginReturn(request('https://preview.example/story'), 'preview.example')
  assert.equal(result.status, 302)
  assert.equal(result.headers.get('location'), 'https://preview.example/story')
  assert.match(result.headers.get('cache-control'), /no-store/)
  for (const target of ['https://evil.example/', 'http://preview.example/', 'https://preview.example.evil.test/', 'https://user@preview.example/', '//preview.example/'])
    assert.equal(loginReturn(request(target), 'preview.example'), null)
  assert.equal(loginReturn(request('https://preview.example/', '/other'), 'preview.example'), null)
  assert.equal(loginReturn(request('https://preview.example/'), ''), null)
})
