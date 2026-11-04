/** In-process checks of the built Worker. No HTTP server or live Fóir calls. */
import assert from 'node:assert/strict'
import { readFile, readdir, access } from 'node:fs/promises'

const { default: worker } = await import('../web/dist/server/index.js')
const env = {
  FOIR_PROJECT_ID: 'example-project',
  FOIR_TENANT_ID: 'example-workspace',
}
const originalFetch = globalThis.fetch
// Run against either platform plane without allowing arbitrary SDK destinations.
const apiOrigin = process.env.CHECK_FOIR_API_ORIGIN || 'https://api.foir.dev'
assert.ok(['https://api-dev.foir.dev', 'https://api.foir.dev'].includes(apiOrigin))
const cdnOrigin = apiOrigin === 'https://api.foir.dev'
  ? 'https://cdn.foir.dev'
  : 'https://cdn-dev.foir.dev'
let requests = 0
try {
  globalThis.fetch = async () => {
    requests++
    throw new Error('Console rendering must not read the public CMS')
  }
  const consolePage = await worker.fetch(
    new Request('https://site.example/_foir/apps/tilly/admin', {
      headers: { accept: 'text/html', 'x-tilly-csp-nonce': 'visitor-value' },
    }),
    env,
  )
  const html = await consolePage.text()
  assert.equal(consolePage.status, 200)
  assert.equal(requests, 0)
  assert.ok(html.includes('Connecting to Fóir'))
  assert.ok(!html.includes('<nav'))
  assert.equal(consolePage.headers.get('cache-control'), 'no-store')
  const policy = consolePage.headers.get('content-security-policy')
  const nonce = policy.match(/'nonce-([^']+)'/)[1]
  assert.notEqual(nonce, 'visitor-value')
  for (const script of html.matchAll(/<script\b([^>]*)>/g))
    assert.ok(script[1].includes(`nonce="${nonce}"`))
  for (const asset of html.matchAll(/(?:src|href)="(\/assets\/[^"?]+)"/g))
    await access(new URL(`../web/dist/client${asset[1]}`, import.meta.url))

  for (const path of [
    '/_foir/apps/tilly/admin/',
    '/%5Ffoir/apps/tilly/admin',
    '/_FOIR/Apps/Tilly/ADMIN',
  ]) {
    const alias = await worker.fetch(
      new Request(`https://site.example${path}`, {
        headers: { accept: 'text/html' },
        signal: AbortSignal.timeout(10000),
      }),
      env,
    )
    await alias.text()
    assert.ok(
      alias.headers
        .get('content-security-policy')
        ?.includes(`frame-ancestors ${apiOrigin === 'https://api.foir.dev' ? 'https://app.foir.io' : 'https://app-dev.foir.io'}`),
    )
  }

  const manifest = await worker.fetch(
    new Request('https://site.example/_foir/apps/tilly.json'),
    env,
  )
  assert.equal(manifest.status, 200)
  assert.ok((await manifest.json()).operations.length > 0)
  const refused = await worker.fetch(
    new Request('https://site.example/operations/save_profile', {
      method: 'POST',
      headers: { authorization: 'Bearer user-session' },
      body: '{}',
    }),
    env,
  )
  assert.equal(refused.status, 401)
  for (const path of [
    '/operations/report_content',
    '/operations/set_user_block',
    '/operations/review_content',
    '/operations/evaluate_challenges',
    '/operations/challenge_announcements',
    '/operations/web_checkout',
    '/operations/web_portal',
    '/operations/reconcile_stripe',
    '/operations/setup_status',
    '/inbound/stripe',
  ]) {
    const response = await worker.fetch(
      new Request(`https://site.example${path}`, {
        method: 'POST',
        headers: { authorization: 'Bearer user-session' },
        body: '{}',
      }),
      env,
    )
    assert.equal(
      response.status,
      401,
      `Unsigned billing request refused: ${path}`,
    )
  }

  // Both SDK clients make direct publishable-key reads. Preserve nested CMS content.
  globalThis.fetch = async (request, init) => {
    const url = new URL(
      request instanceof Request ? request.url : String(request),
    )
    assert.ok(
      [apiOrigin, cdnOrigin].includes(
        url.origin,
      ),
    )
    assert.equal(
      new Headers(
        init?.headers ??
          (request instanceof Request ? request.headers : undefined),
      ).get('authorization'),
      null,
    )
    requests++
    return Response.json({
      data: {
        locales: [
          {
            code: 'en-GB',
            displayName: 'English',
            isDefault: true,
            isRtl: false,
          },
          {
            code: 'fr-FR',
            displayName: 'Français',
            isDefault: false,
            isRtl: false,
          },
        ],
        menu: {
          items: [
            {
              label: 'Explore',
              children: [
                { label: 'Nested policy', pageRef: { _naturalKey: 'policy' } },
              ],
            },
          ],
        },
        cookieConsent: null,
        uiCopy: null,
        page: {
          _id: 'example-page',
          _modelKey: 'page',
          title: 'Typed SDK content',
          blocks: {
            entries: [
              {
                __typename: 'Passage',
                _id: 'example-passage',
                kind: 'paragraph',
                spans: [{ text: 'CMS prose remains readable.', marks: [] }],
              },
              {
                __typename: 'Content',
                contentAlign: 'center',
                ctas: [
                  {
                    label: 'Read linked policy',
                    pageRef: { _naturalKey: 'linked-policy' },
                  },
                ],
              },
            ],
          },
        },
      },
    })
  }
  const homepage = await worker.fetch(
    new Request('https://site.example/', { headers: { accept: 'text/html' } }),
    env,
  )
  assert.equal(homepage.status, 200)
  const homeHtml = await homepage.text()
  assert.ok(homeHtml.includes('Catch the cats'))
  assert.ok(homeHtml.includes('tilly-collage'))
  assert.ok(requests > 0)
  assert.ok(homeHtml.includes('Nested policy'))
  assert.ok(homeHtml.includes('href="/policy"'))
  const canonicalLocale = await worker.fetch(
    new Request('https://site.example/fr-FR/', {
      headers: { accept: 'text/html' },
    }),
    env,
  )
  assert.equal(canonicalLocale.status, 307)
  assert.equal(
    new URL(canonicalLocale.headers.get('location'), 'https://site.example')
      .pathname,
    '/fr-FR',
  )
  const localized = await worker.fetch(
    new Request('https://site.example/fr-FR', {
      headers: { accept: 'text/html' },
    }),
    env,
  )
  const localizedHtml = await localized.text()
  assert.equal(localized.status, 200)
  assert.ok(localizedHtml.includes('lang="fr-FR"'))
  assert.ok(localizedHtml.includes('Catch the cats'))
  assert.ok(localizedHtml.includes('href="/fr-FR/feed"'))
  const contentPage = await worker.fetch(
    new Request('https://site.example/policy', {
      headers: { accept: 'text/html' },
    }),
    env,
  )
  assert.equal(contentPage.status, 200)
  const contentHtml = await contentPage.text()
  assert.ok(contentHtml.includes('CMS prose remains readable.'))
  assert.ok(contentHtml.includes('Read linked policy'))
  assert.ok(contentHtml.includes('href="/linked-policy"'))

  const assetDir = new URL('../web/dist/client/assets/', import.meta.url)
  for (const name of await readdir(assetDir)) {
    if (!name.endsWith('.js')) continue
    const clientCode = await readFile(new URL(name, assetDir), 'utf8')
    assert.ok(
      !clientCode.includes('Operation dispatch refused'),
      'Dispatch handlers must remain server-only',
    )
    assert.ok(
      !clientCode.includes('api.openai.com'),
      'Provider calls must remain server-only',
    )
  }
  console.log(
    'Built Worker checks pass: native console route, nonce/CSP, asset links, SDK homepage, nested menus, inline page links/prose, manifest, signed-dispatch gate and server-only handlers.',
  )
} finally {
  globalThis.fetch = originalFetch
}
