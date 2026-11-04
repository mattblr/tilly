import { defineModel } from '@foir/cli/configs'
/** Customer identifiers stay private and are reached only by installed operations. */
export const webBillingAccount = defineModel({
  key: 'web-billing-account',
  name: 'Web billing account',
  pluralName: 'Web billing accounts',
  fields: [
    {
      key: 'customerId',
      type: 'text',
      label: 'Stripe customer',
      required: true,
    },
  ],
  access: { ownerPlane: 'user', defaultVisibility: 'private' },
  config: { publishing: false, versioning: false },
})
export const webBillingExecutionGrants = [
  'operations:execute:tilly.web-checkout',
  'operations:execute:tilly.web-portal',
]
