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
test('billing stays outside anonymous and native ceilings; only a role reads drafts', () => {
  const native = config.apiKeys.find((key) => key.envVar === 'TILLY_APP_KEY')
  const site = config.apiKeys.find(
    (key) => key.envVar === 'VITE_PLATFORM_API_KEY',
  )
  assert.ok(
    !native.grants.some((grant) =>
      /web-checkout|web-portal|reconcile-stripe/.test(grant),
    ),
  )
  assert.ok(
    !site.baselineGrants.some((grant) =>
      /execute|write|create|drafts/.test(grant),
    ),
  )
  assert.ok(!site.allowedModels.includes('web-billing-account'))
  // The website key is the only key; it holds drafts:read for signed-in
  // editors and gives it to nobody else.
  assert.ok(site.grants.includes('drafts:read'))
  assert.ok(!config.apiKeys.some((key) => key !== site && key.grants.includes('drafts:read')))
  const editor = config.userRoles.find(role => role.key === 'preview-editor')
  assert.ok(!editor.isDefault)
  assert.deepEqual(
    [...editor.grants].sort(),
    ['records:read', 'files:read', 'designtokens:read', 'drafts:read'].sort(),
  )
  assert.ok(
    !config.userRoles.some((role) => role !== editor && role.grants.includes('drafts:read')),
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


test('a target without editor preview gives no key drafts:read', async () => {
  const preview = process.env.TILLY_PREVIEW_ORIGIN
  delete process.env.TILLY_PREVIEW_ORIGIN
  try {
    const { default: isolated } = await import('../foir.config.ts?without-preview')
    assert.ok(!isolated.apiKeys.some(key => key.grants.includes('drafts:read')))
    assert.ok(!isolated.authClients.some(client => client.clientId === 'tilly-preview'))
  } finally { process.env.TILLY_PREVIEW_ORIGIN = preview }
})

test('every build can buy and request artwork: the member role holds the paid operations', () => {
  // Artwork is drawn by the artwork-request hook after a capture is finished.
  const role = config.userRoles.find(role => role.key === 'member')
  for (const grant of ['operations:execute:finalize_capture', 'operations:execute:tilly.claim-premium',
    'operations:execute:tilly.web-checkout', 'operations:execute:tilly.web-portal'])
    assert.ok(role.grants.includes(grant), grant)
  const claim = 'operations:execute:tilly.claim-premium'
  assert.ok(config.apiKeys.find(key => key.envVar === 'TILLY_APP_KEY').grants.includes(claim))
  for (const key of config.apiKeys)
    assert.ok(!key.baselineGrants?.includes(claim), 'Anonymous callers cannot claim Premium')
})
