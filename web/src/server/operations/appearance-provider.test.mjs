import { test } from 'node:test'
import assert from 'node:assert/strict'
import { suggestAppearance, appearanceModel } from './appearance-provider.ts'
import {framedJpeg} from './appearance-photo.fixture.mjs'
const cat = { index: 0, status: 'unknown', possibilities: [], coatLength: 'unknown', pattern: 'unknown' }
const input = { apiKey: 'fixture-provider-value', image: framedJpeg(), tags: [{ key: 'private-tag-key', catId: 'private-cat-id' }] }
const completed = (answer = { cats: [cat] }) => ({ status: 'completed', output: [{ type: 'message', role: 'assistant', content: [{ type: 'output_text', text: JSON.stringify(answer) }] }] })
test('the actual adapter makes one bounded structured-image request and keeps private identifiers out of provider input', async () => {
  const original = globalThis.fetch; let calls = 0
  try {
    globalThis.fetch = async (url, options) => {
      calls++; assert.equal(url, 'https://api.openai.com/v1/responses'); assert.equal(options.redirect, 'manual')
      const body = JSON.parse(options.body)
      assert.equal(body.model, appearanceModel); assert.equal(body.store, false)
      assert.equal(body.reasoning.effort, 'none'); assert.equal(body.max_output_tokens, 1200)
      assert.equal(body.text.format.strict, true); assert.equal(body.text.format.type, 'json_schema')
      assert.equal(body.input[0].content[1].detail, 'low')
      assert.equal(options.body.includes('private-tag-key'), false); assert.equal(options.body.includes('private-cat-id'), false)
      assert.equal(Object.hasOwn(body, 'tools'), false)
      return Response.json(completed())
    }
    assert.deepEqual(await suggestAppearance(input), { cats: [cat] }); assert.equal(calls, 1)
  } finally { globalThis.fetch = original }
})
test('refused, partial, malformed, extra-cat and transport responses never retry or become results', async () => {
  const original = globalThis.fetch
  try {
    for (const make of [() => new Response('provider private details', { status: 429 }), () => Response.json({ ...completed(), status: 'incomplete' }),
      () => Response.json({ status: 'completed', output: [{ type: 'message', role: 'assistant', content: [{ type: 'refusal', refusal: 'private refusal' }] }] }),
      () => Response.json(completed({ cats: [cat, cat] })), () => Response.json({}), () => { throw Error('transport private details') }]) {
      let calls = 0
      globalThis.fetch = async () => { calls++; return make() }
      await assert.rejects(suggestAppearance(input)); assert.equal(calls, 1)
    }
  } finally { globalThis.fetch = original }
})
