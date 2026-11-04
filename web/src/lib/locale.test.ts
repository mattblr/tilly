import assert from 'node:assert/strict'
import test from 'node:test'
import {
  parseLocales,
  stripLocale,
  localizedPath,
  localeRewrite,
} from './locale'
const locales = parseLocales([
  { code: 'en-GB', displayName: 'English', isDefault: true, isRtl: false },
  { code: 'fr-FR', displayName: 'French', isDefault: false, isRtl: false },
])
test('locale rewriting uses configured locales and preserves query/hash', () => {
  const rewrite = localeRewrite(locales, 'fr-FR'),
    input = new URL('https://site.example/fr-fr/cats/cat123?q=one#story')
  assert.equal(
    rewrite.input({ url: input }).href,
    'https://site.example/cats/cat123?q=one#story',
  )
  assert.equal(
    rewrite.output({ url: input }).href,
    'https://site.example/fr-FR/cats/cat123?q=one#story',
  )
  assert.equal(stripLocale('/de-DE/feed', locales), '/de-DE/feed')
  assert.equal(localizedPath('/en-GB/feed', 'fr-FR', locales), '/fr-FR/feed')
})
test('locale paths cannot create aliases for console, manifest, operations or assets', () => {
  for (const path of [
    '/_foir/apps/tilly/admin',
    '/operations/save-catch',
    '/api/action',
    '/assets/app.js',
    '/images/cat.png',
    '/.well-known/openid-configuration',
  ]) {
    assert.equal(localizedPath(path, 'fr-FR', locales), path)
    assert.equal(stripLocale('/fr-FR' + path, locales), '/fr-FR' + path)
  }
  for (const path of [
    'https://elsewhere.example/path',
    '//elsewhere.example/path',
    '#story',
  ])
    assert.equal(localizedPath(path, 'fr-FR', locales), path)
})
test('locale configuration rejects malformed records rather than inventing languages', () => {
  assert.throws(() =>
    parseLocales([{ code: '../admin', isDefault: true, isRtl: false }]),
  )
  assert.deepEqual(parseLocales([]), [])
})
