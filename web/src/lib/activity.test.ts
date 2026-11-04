import { test } from 'node:test'
import assert from 'node:assert/strict'
import { worldCellOf, worldCellCenter } from './location'
import { readWorldActivity, type AppClient } from '../features/app/data'
import { designTokenStyle } from './design-tokens'
import { resolveAppCopy, formatAppCopy } from '../features/app/copy'

test('world regions never accept a neighbourhood geohash or invalid coordinates', () => {
  assert.equal(worldCellOf({lat: 37.7749, lng: -122.4194}), '9q8')
  const center = worldCellCenter('9q8')!
  assert.ok(Math.abs(center.lat - 37.7749) < 1.5)
  assert.ok(Math.abs(center.lng + 122.4194) < 1.5)
  for (const cell of ['9q8yy', '', 'zzz0', '<b>', null]) assert.equal(worldCellCenter(cell), null)
  for (const point of [{lat: NaN,lng: 0}, {lat:91,lng:0}, {lat:0,lng:181}]) assert.equal(worldCellOf(point), null)
})

test('world activity counts originals and requests only coarse locations and the latest photo', async () => {
  const queries: [string, Record<string, unknown>][] = []
  const foir = {
    cat: {findMany: async (input: Record<string, unknown>) => { queries.push(['cat',input]); return {totalCount:7,edges: input.first === 1 ? [] : [{node:{_id:'cat',name:'Cat',cell3:'9q8'}}]} }},
    'capture-post': {findMany: async (input: Record<string, unknown>) => { queries.push(['capture-post',input]); return {totalCount:12,edges:[{node:{_id:'post',catKey:'cat',photoKey:'photo',worldCell:null,postedAt:'2026-01-01T00:00:00Z'}}]} }},
    'capture-photo': {findMany: async (input: Record<string, unknown>) => { queries.push(['capture-photo',input]); return {edges:[{node:{_id:'photo',photo:{url:'https://example.invalid/cat.webp'}}}]} }},
  } as unknown as AppClient
  const result = await readWorldActivity(foir)
  assert.equal(result.catches,12)
  assert.equal(result.cats,7)
  assert.equal(result.recent[0].cell,'9q8')
  assert.equal(result.latestPhoto?.url,'https://example.invalid/cat.webp')
  const post = queries.find(([key]) => key === 'capture-post')![1]
  assert.deepEqual(post.where,{audience:{eq:'public'},reshareOf:{isNull:true}})
  assert.ok(!(post.pick as string[]).some(field => ['area','_ownerId','note'].includes(field)))
  assert.deepEqual(queries.find(([key]) => key === 'capture-photo')![1].where,{id:{eq:'photo'},state:{eq:'ready'}})
})

test('published tokens retune both themes but cannot escape the CSS value allowlist', () => {
  const css = designTokenStyle({colors:[{name:'lightSignal',value:'#123456'},{name:'darkSignal',value:'red;}body{display:none'}],spacings:[{name:'pageGutter',value:'24px'},{name:'gapMd',value:'url(https://example.invalid)'}],radii:[]})
  assert.ok(css.includes('html.light{'))
  assert.ok(css.includes('--color-tilly-accent:#123456'))
  assert.ok(css.includes('--page-gutter:24px'))
  assert.ok(!css.includes('display:none'))
  assert.ok(!css.includes('url('))
})

test('web resolves the native app namespaces with saved Fóir words over the exact iOS defaults', () => {
  const words = resolveAppCopy([{_naturalKey:'feed', entries:[{key:'post.caught',value:'Met {name} · {when}'}]}])
  assert.equal(formatAppCopy(words,'feed.post.caught',{name:'Cat {when}',when:'today'}),'Met Cat {when} · today')
  assert.equal(formatAppCopy(words,'art.flip'),'Flip to the art')
  assert.equal(formatAppCopy(words,'profile.cats.emptyTitle'),'No cats yet')
})


test('map pins collapse historical catches to the latest sighting of each cat', async () => {
  const { latestSightings } = await import('../features/app/map-data')
  const row = { catId:'cat', area:{lat:51,lng:0}, postedAt:'2026-10-30T10:00:00Z' } as import('../features/app/data').Encounter
  const newer = {...row,id:'new',area:{lat:52,lng:1},postedAt:'2026-10-30T11:00:00Z'}
  const result = latestSightings([{...row,id:'old'},newer,{...row,id:'without-location',catId:'missing',area:null}])
  assert.equal(result.length,1)
  assert.equal(result[0].id,'new')
  assert.deepEqual(result[0].area,{lat:52,lng:1})
})


test('SDK image data keeps placeholders and size variants for ProgressiveMedia', async () => {
  const { appImage } = await import('../features/app/media')
  const image = {url:'https://example.invalid/full.webp',width:1200,height:1500,blurhash:'example-hash',dominantColor:'#123456',variants:{thumbnail:{url:'https://example.invalid/thumb.webp'},small:{url:'https://example.invalid/small.webp'},medium:{url:'https://example.invalid/medium.webp'},large:null}} as import('@foir/sdk/data').Image
  const source = appImage(image)!
  assert.equal(source.blurhash,'example-hash')
  assert.equal(source.dominantColor,'#123456')
  assert.equal(source.thumbnailUrl,'https://example.invalid/thumb.webp')
  assert.equal(source.variants?.medium,'https://example.invalid/medium.webp')
  assert.equal(source.width,1200)
  assert.equal(appImage(null),null)
})
