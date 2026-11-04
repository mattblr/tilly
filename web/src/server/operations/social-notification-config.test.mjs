import test from 'node:test'
import assert from 'node:assert/strict'
import { socialNotificationOperations, socialNotificationHooks } from '../../../foir/social-notifications.ts'
import { appOperationDefinitions } from './operation-definitions.ts'

process.env.TILLY_SITE_URL = 'https://site.example'
const {default: config} = await import('../../../../foir.config.ts')

test('native social hooks cover only persisted likes, follows and posts, never private cat follows', () => {
  assert.deepEqual(socialNotificationHooks.map(hook => hook.filter), [
    {modelKey: 'capture-like'}, {modelKey: 'follow-request'}, {modelKey: 'capture-post'},
  ])
  assert.ok(socialNotificationHooks.every(hook => hook.event === 'RECORD_CREATED' && hook.operationKey === 'social_notification'))
})
test('only the hook operation has named send authority and bounded native retries', () => {
  const [op] = socialNotificationOperations('https://site.example')
  assert.ok(op.grants.includes('notifications:write.named'))
  assert.equal(op.mode, 'async'); assert.equal(op.retryPolicy.maxRetries, 3)
  assert.ok(!op.grants.some(grant => /appsecrets|records:(create|write|delete)/.test(grant)))
  for (const action of appOperationDefinitions('https://site.example').filter(op => ['like_capture','follow_user','share_capture'].includes(op.key))) {
    assert.ok(!action.grants.includes('notifications:write.named'))
  }
})
test('normal user roles and publishable keys cannot execute the lifecycle notification operation', () => {
  for (const surface of [...config.apiKeys, ...config.userRoles]) {
    assert.ok(!surface.grants.includes('operations:execute:social_notification'))
  }
})
