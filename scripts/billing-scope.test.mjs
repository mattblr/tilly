import test from 'node:test'
import assert from 'node:assert/strict'
process.env.TILLY_SITE_URL = 'https://site.example'
process.env.TILLY_LOGIN_ORIGIN = 'https://login.site.example'
process.env.TILLY_PREVIEW_ORIGIN = 'https://preview.site.example'
const { default: config } = await import('../foir.config.ts')
const { default: manifest } =
  await import('../web/src/server/operations/manifest.ts')
test('the private appearance deduplication ledger is server-only after ownership migration',()=>{
  const appearance=manifest('https://site.example').operations.find(op=>op.key==='suggest-cat-appearance')
  assert.ok(appearance.grants.includes('records:read.all:appearance-observation'))
  assert.ok(!config.operations.some(op=>['save_catch','save_profile','suggest_cat_appearance'].includes(op.key)))
  for(const key of config.apiKeys){
    assert.ok(!key.allowedModels?.includes('appearance-observation'))
    assert.ok(!key.grants.some(grant=>/appearance-observation|appsecrets:/.test(grant)))
  }
})
test('billing stays outside anonymous and native ceilings; preview cannot reach user models', () => {
  const native = config.apiKeys.find((key) => key.envVar === 'TILLY_APP_KEY')
  const site = config.apiKeys.find(
    (key) => key.envVar === 'VITE_PLATFORM_API_KEY',
  )
  const preview = config.apiKeys.find(
    (key) => key.envVar === 'FOIR_PREVIEW_API_KEY',
  )
  for (const key of [native, preview])
    assert.ok(
      !key.grants.some((grant) =>
        /web-checkout|web-portal|reconcile-stripe/.test(grant),
      ),
    )
  assert.ok(
    !site.baselineGrants.some((grant) =>
      /execute|write|create|drafts/.test(grant),
    ),
  )
  assert.ok(!site.allowedModels.includes('web-billing-account'))
  assert.equal(preview.kind, 'server')
  assert.ok(!config.userRoles.find(role => role.key === 'preview-editor').isDefault)
  assert.ok(
    !preview.allowedModels.some((model) =>
      [
        'profile',
        'sighting',
        'cat',
        'premium-grant',
        'web-billing-account',
      ].includes(model),
    ),
  )
  assert.deepEqual(
    [...preview.grants].sort(),
    ['records:read', 'files:read', 'designtokens:read', 'drafts:read'].sort(),
  )
  assert.ok(site.grants.includes('operations:execute:tilly.web-checkout'))
  assert.ok(!site.grants.some((grant) => grant.includes('reconcile-stripe')))
  const model = config.models.find(
    (model) => model.key === 'web-billing-account',
  )
  assert.equal(model.access.ownerPlane, 'user')
  assert.equal(model.access.defaultVisibility, 'private')
})
test('manifest retains art credentials and async billing uses provider-specific limited authority', () => {
  const app = manifest('https://site.example')
  assert.deepEqual(app.credentials.schema.required, ['openai'])
  const checkout = app.operations.find(
    (operation) => operation.key === 'web-checkout',
  )
  const reconcile = app.operations.find(
    (operation) => operation.key === 'reconcile-stripe',
  )
  assert.equal(checkout.timeout_ms, 120_000)
  assert.equal(reconcile.supports_async, true)
  assert.ok(
    !checkout.grants.some((grant) =>
      /read\.all|write\.all|premium-grant.*write/.test(grant),
    ),
  )
  assert.ok(
    !reconcile.grants.some((grant) => /delete|files:|users:/.test(grant)),
  )
  assert.equal(app.inbound.webhook.path, '/inbound/stripe')
})

test('hosted Apple stays hidden while the native provider remains intact', () => {
  assert.deepEqual(config.authClients[0].loginMethods.disabledProviders, [
    'apple',
  ])
  const apple = config.authProviders.find(
    (provider) => provider.key === 'apple',
  )
  assert.equal(apple.enabled, true)
  assert.equal(apple.config.client_id, 'ink.tilly')
})


test('a target without editor preview does not mint an unused draft credential', async () => {
  const preview = process.env.TILLY_PREVIEW_ORIGIN
  delete process.env.TILLY_PREVIEW_ORIGIN
  try {
    const { default: isolated } = await import('../foir.config.ts?without-preview')
    assert.ok(!isolated.apiKeys.some(key => key.envVar === 'FOIR_PREVIEW_API_KEY'))
    assert.ok(!isolated.authClients.some(client => client.clientId === 'tilly-preview'))
  } finally { process.env.TILLY_PREVIEW_ORIGIN = preview }
})

test('isolated development denies charging actions while preserving signed entitlement verification', async () => {
  const previous = process.env.TILLY_PAID_FEATURES_ENABLED
  process.env.TILLY_PAID_FEATURES_ENABLED = 'false'
  try {
    const { default: isolated } = await import('../foir.config.ts?without-paid-features')
    for (const entry of [...isolated.userRoles, ...isolated.authClients, ...isolated.apiKeys])
      assert.ok(!entry.grants?.some(grant => /operations:execute:tilly\.(make-catch-art|web-checkout|web-portal)$/.test(grant)))
    const claim = 'operations:execute:tilly.claim-premium'
    assert.ok(isolated.userRoles.find(role => role.key === 'member').grants.includes(claim))
    assert.ok(isolated.apiKeys.find(key => key.envVar === 'TILLY_APP_KEY').grants.includes(claim))
    for (const key of isolated.apiKeys)
      assert.ok(!key.baselineGrants?.includes(claim), 'Anonymous callers cannot claim Premium')
    for (const key of isolated.apiKeys.filter(key => key.kind === 'publishable'))
      assert.ok(key.grants.includes('operations:execute:tilly.update-capture-tags'))
  } finally {
    if (previous === undefined) delete process.env.TILLY_PAID_FEATURES_ENABLED
    else process.env.TILLY_PAID_FEATURES_ENABLED = previous
  }
})
