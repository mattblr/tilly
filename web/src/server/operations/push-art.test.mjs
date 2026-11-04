import assert from 'node:assert/strict'
import test from 'node:test'
import { tell } from './art.ts'

const details = { name: 'Biscuit', style: 'First paw', catKey: 'cat123', artId: 'art123' }

for (const variant of ['signed', 'missing', 'refused']) {
  test(`art notification preserves its text and deep link with a ${variant} image`, async () => {
    let sent
    const signed = 'https://cdn-dev.foir.dev/files/art123?at=example-signed-token'
    const foir = {
      raw: async (query, variables) => {
        if (query.includes('notificationSettingss')) return { notificationSettingss: { edges: [{ node: { artReady: true } }] } }
        if (query.includes('uiCopy'))
          return { uiCopy: { entries: [{ key: 'ready.title', value: '{name} in {style}' }] } }
        if (query.includes('catchArt(')) {
          assert.deepEqual(variables, { id: 'art123' })
          if (variant === 'refused') throw new Error('image read refused')
          return { catchArt: variant === 'signed' ? { art: { url: signed } } : null }
        }
        assert.match(query, /sendNotification/)
        sent = variables.input
        return { sendNotification: true }
      },
    }
    await tell(foir, 'user123', details)
    assert.equal(sent.userId, 'user123')
    assert.equal(sent.category, 'art_ready')
    assert.equal(sent.idempotencyKey, 'art-ready:art123:user123')
    assert.equal(sent.title, 'Biscuit in First paw')
    assert.equal(sent.message, 'Flip your catch of Biscuit to see it.')
    assert.equal(sent.actionUrl, 'tilly://cat/cat123?art=art123')
    assert.equal(sent.imageUrl, variant === 'signed' ? signed : undefined)
  })
}

for (const mode of ['off', 'missing', 'refused']) test(`art notification is suppressed when preference is ${mode}`, async () => {
  let calls = 0
  await tell({ raw: async query => {
    calls++
    assert.match(query, /notificationSettingss/)
    if (mode === 'refused') throw new Error('preference read refused')
    return { notificationSettingss: { edges: mode === 'missing' ? [] : [{ node: { artReady: false } }] } }
  } }, 'user123', details)
  assert.equal(calls, 1)
})
