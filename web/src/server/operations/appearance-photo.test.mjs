import test from 'node:test'
import assert from 'node:assert/strict'
import {analysisJpeg,readAppearancePhoto} from './appearance-photo.ts'
import {framedJpeg,segment} from './appearance-photo.fixture.mjs'
const text = [...new TextEncoder().encode('private GPS owner metadata')]
test('analysis JPEG removes APP and comment metadata without changing scan bytes or dimensions',()=>{
  const original=framedJpeg([...segment(224,text),...segment(226,text),...segment(237,text),...segment(254,text)])
  const clean=analysisJpeg(original)
  assert.deepEqual(clean.bytes,framedJpeg());assert.equal(clean.width,3);assert.equal(clean.height,2)
  assert.equal(new TextDecoder().decode(clean.bytes).includes('private'),false)
})
test('metadata between progressive scans is stripped; trailing payloads and excessive dimensions refuse',()=>{
  const original=framedJpeg(), split=original.length-2
  const multi=new Uint8Array([...original.subarray(0,split),...segment(254,text),...segment(218,[1,1,0,1,63,0]),4,5,255,217])
  assert.equal(new TextDecoder().decode(analysisJpeg(multi).bytes).includes('private'),false)
  for(const bad of [new Uint8Array([1,2,3]),original.subarray(0,original.length-1),new Uint8Array([...original,1]),framedJpeg([],1025),new Uint8Array(3*1024*1024+1)])
    assert.throws(()=>analysisJpeg(bad),/upright photo/)
})
test('a non-upright EXIF image is refused before its crop coordinates could be sent incorrectly',()=>{
  const exif=orientation=>[69,120,105,102,0,0,73,73,42,0,8,0,0,0,1,0,18,1,3,0,1,0,0,0,orientation,0,0,0,0,0,0,0]
  assert.deepEqual(analysisJpeg(framedJpeg(segment(225,exif(1)))).bytes,framedJpeg())
  assert.throws(()=>analysisJpeg(framedJpeg(segment(225,exif(6)))),/upright photo/)
})
test('the adapter uses only the served small JPEG variant and refuses foreign source/redirect/oversize responses',async()=>{
  const old=globalThis.fetch;let calls=0
  const foir={raw:async(query)=>{assert.match(query,/variants\(format: JPEG\).*small/);return{capturePhoto:{photo:{variants:{small:{url:'https://cdn.example.test/sourcefile00001?transform=opaque',width:3,height:2}}}}}}}
  try{
    globalThis.fetch=async(url,options)=>{calls++;assert.equal(url.searchParams.get('transform'),'opaque');assert.equal(options.redirect,'manual');return new Response(framedJpeg(segment(254,text)),{headers:{'content-type':'image/jpeg'}})}
    assert.deepEqual(await readAppearancePhoto(foir,'capture','sourcefile00001','https://cdn.example.test'),framedJpeg())
    await assert.rejects(readAppearancePhoto(foir,'capture','differentfile00','https://cdn.example.test'))
    assert.equal(calls,1)
    for(const make of [()=>new Response(null,{status:302}),()=>new Response(framedJpeg(),{headers:{'content-type':'image/png'}}),()=>new Response(framedJpeg(),{headers:{'content-type':'image/jpeg','content-length':'4000000'}})]){
      globalThis.fetch=async()=>make();await assert.rejects(readAppearancePhoto(foir,'capture','sourcefile00001','https://cdn.example.test'))
    }
  }finally{globalThis.fetch=old}
})
