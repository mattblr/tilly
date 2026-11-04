/** New install authority was separately reviewed; no provider secret is public. */
const common = ['project:stand', 'appsecrets:read', 'appconfig:read']
const output = {
  type: 'object',
  properties: {
    ok: { type: 'boolean' },
    url: { type: 'string' },
    id: { type: 'string' },
  },
}
const empty = { type: 'object', additionalProperties: false, properties: {} }
/** Native operation setting: reapply after installation updates. */
export const checkoutQuota = {rules:[{points:1,duration:60,scope:'user' as const,failClosed:true,
  message:'Please wait a minute before starting Checkout again.'}]}
export const billingOperations = [
  {
    key: 'reconcile-revenuecat',
    name: 'Reconcile RevenueCat subscriptions',
    endpoint: '/operations/reconcile_revenuecat',
    supports_async: true,
    timeout_ms: 120_000,
    retry_policy: {maxRetries: 3},
    grants: [...common, 'users:read.named',
      'records:read.all:premium-grant', 'records:create:premium-grant',
      'records:write.all:premium-grant', 'records:attribute:premium-grant'],
    input_schema: {
      type: 'object', additionalProperties: false, required: ['actorIds'],
      properties: {actorIds: {type: 'array', minItems: 1, maxItems: 200,
        items: {type: 'string', pattern: '^[a-z0-9]{10,40}$'}}},
    },
    output_schema: {type: 'object', properties: {ok: {type: 'boolean'}}},
  },
  {
    key: 'web-checkout',
    name: 'Subscribe on the web',
    endpoint: '/operations/web_checkout',
    timeout_ms: 120_000,
    grants: [
      ...common,
      'records:read:premium-grant',
      ...['read', 'create', 'write', 'attribute'].map(
        (verb) => `records:${verb}:web-billing-account`,
      ),
    ],
    input_schema: empty,
    output_schema: output,
  },
  {
    key: 'web-portal',
    name: 'Manage web subscription',
    endpoint: '/operations/web_portal',
    grants: [...common, 'records:read:web-billing-account'],
    input_schema: empty,
    output_schema: output,
  },
  {
    key: 'reconcile-stripe',
    name: 'Reconcile Stripe subscription',
    endpoint: '/operations/reconcile_stripe',
    supports_async: true,
    timeout_ms: 120_000,
    retry_policy: { maxRetries: 3 },
    grants: [
      ...common,
      'records:read.all:web-billing-account',
      'records:read.all:premium-grant',
      'records:create:premium-grant',
      'records:write.all:premium-grant',
      'records:attribute:premium-grant',
    ],
    input_schema: {
      type: 'object',
      additionalProperties: false,
      required: ['eventId', 'customerId'],
      properties: {
        eventId: { type: 'string', pattern: '^evt_[A-Za-z0-9_]+$' },
        customerId: { type: 'string', pattern: '^cus_[A-Za-z0-9_]+$' },
      },
    },
    output_schema: { type: 'object', properties: { ok: { type: 'boolean' } } },
  },
]
export const billingSettings = {
  type: 'object',
  properties: {
    revenueCatAppId: {type: 'string', title: 'RevenueCat webhook app ID'},
    revenueCatEnvironment: {type: 'string', enum: ['SANDBOX', 'PRODUCTION'], title: 'RevenueCat webhook environment'},
    stripeMode: {
      type: 'string',
      enum: ['test', 'live'],
      title: 'Stripe mode',
    },
    stripePriceId: { type: 'string', title: 'Stripe recurring price ID' },
    siteOrigin: { type: 'string', title: 'Website HTTPS origin' },
  },
}
