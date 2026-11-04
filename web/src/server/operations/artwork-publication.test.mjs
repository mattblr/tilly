import {test} from 'node:test'
import assert from 'node:assert/strict'
import {narrowArtwork,artworkAudienceSlice} from './artwork-handler.ts'

const job={id:'attemptabcdefgh',ownerId:'ownerabcdefghij',photoKey:'captureabcdefgh',sourceFileId:'sourceabcdefgh',
  artId:'artabcdefghijk',phase:'publishing',revision:'revision-1',outputFileId:'outputabcdefgh',publication:{audience:'public',step:'file'}}
function fixture(count=0) {
  const grants=Array.from({length:count},(_,i)=>`friendabcdefgh${i}`),seen=[]
  let file='PUBLIC',record='PUBLIC',ready=false,shownTo=null
  const audiences=[{_id:'audienceabcdefg',_ownerId:job.ownerId,privacy:'public'}]
  const foir={raw:async(query,variables={})=>{
    seen.push({query,variables})
    if(query.includes('query Audience(')) return{page:{edges:audiences.map(node=>({node}))}}
    // No audience: only the owner reads it.
    if(query.includes('mutation Viewers')) {shownTo=variables.data.viewers.disconnect?'owner':audiences.find(row=>row._id===variables.data.viewers.connect.id).privacy;return{updateCatchArt:{record:{_id:variables.id}}}}
    if(query.includes('query ChosenPrivacy(')) return{profiles:{edges:[{node:{privacy:'public'}}]}}
    if(query.includes('ArtworkPrivateFile')||query.includes('setFileVisibility')) {file=variables.visibility??'PRIVATE';return{setFileVisibility:file}}
    if(query.includes('ArtworkPrivateRecord')) {record=variables.visibility;return{setCatchArtVisibility:record}}
    if(query.includes('ArtworkOldGrants')) return{access:{grants:grants.map(granteeId=>({granteeId}))}}
    if(query.includes('ArtworkRevoke')) {assert.equal(file,'PRIVATE');assert.equal(record,'PRIVATE');grants.splice(grants.indexOf(variables.who),1);return{revokeCatchArtAccess:true}}
    if(query.includes('ArtworkDisplay')) {ready=true;return{updateCatchArt:{record:{_id:job.artId}}}}
    throw Error('Unexpected query')
  }}
  return{foir,grants,seen,state:()=>({file,record,ready}),get shownTo(){return shownTo}}
}
test('real narrowing adapter closes bytes and record before draining exactly one old grant per slice',async()=>{
  const f=fixture(3)
  for(let n=0;n<3;n++) {
    const before=f.seen.length
    assert.equal(await narrowArtwork(f.foir,job),false)
    assert.equal(f.grants.length,2-n)
    assert.equal(f.seen.length-before,5)
  }
  assert.equal(await narrowArtwork(f.foir,job),true)
  assert.deepEqual(f.state(),{file:'PRIVATE',record:'PRIVATE',ready:false})
  // Whoever saw it through its catch no longer does.
  assert.equal(f.shownTo,'owner')
})
test('missing private-file acknowledgement refuses before any record/grant change',async()=>{
  const f=fixture(1),raw=f.foir.raw
  f.foir.raw=async(q,v)=>q.includes('ArtworkPrivateFile')?{setFileVisibility:'PUBLIC'}:raw(q,v)
  await assert.rejects(narrowArtwork(f.foir,job))
  assert.equal(f.grants.length,1);assert.equal(f.state().record,'PUBLIC')
})
test('audience change before widening keeps output private and never marks ready',async()=>{
  const f=fixture()
  await assert.rejects(artworkAudienceSlice(f.foir,job,async()=>false,'public'))
  assert.equal(f.state().file,'PRIVATE');assert.equal(f.state().ready,false)
  assert.equal(f.shownTo,'owner')
})
test('finished art is shown through its owner’s audience and opened only for a public catch',async()=>{
  const f=fixture()
  assert.equal(await artworkAudienceSlice(f.foir,job,async()=>true,'private'),true)
  assert.deepEqual(f.state(),{file:'PRIVATE',record:'PUBLIC',ready:true})
  assert.equal(f.shownTo,'public')
})
