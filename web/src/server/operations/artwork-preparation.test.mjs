import {test} from 'node:test'
import assert from 'node:assert/strict'
import {prepareArtworkSlice} from './artwork-preparation.ts'

const now='2026-11-02T12:00:00Z',owner='ownerabcdefghij',photo='captureabcdefgh'
function fixture(histories={},maxDays=10) {
  const seen=[]
  const foir={raw:async(query,variables={})=>{
    seen.push({query,variables})
    if(query.includes('HighestArtTier')) return{streakTiers:{edges:[{node:{days:maxDays}}]}}
    if(query.includes('ArtStreakPage')) {
      const field='myCapturePhotos'
      const pages=histories[field]??[[]],index=variables.after?Number(variables.after):0,items=pages[index]??[]
      return{page:{edges:items.map(_createdAt=>({node:{_createdAt}})),pageInfo:{hasNextPage:index+1<pages.length,endCursor:String(index+1)}}}
    }
    if(query.includes('ChosenArtTier')) return{streakTiers:{edges:[{node:{days:variables.days,name:'Watercolour',stylePrompt:'Paint softly.'}}]}}
    if(query.includes('ArtworkFinalizedNote')) return{fieldNotes:{edges:[{node:{text:'Sleepy in the sun',tags:['calm']}}]}}
    if(query.includes('PreparedArtSettings')) return{appSettings:{artModel:'fixture-model',artQuality:'medium'}}
    throw Error('Unexpected query')
  }}
  const slice=previous=>prepareArtworkSlice(foir,owner,photo,now,'Europe/London',previous)
  const finish=async()=>{let result=await slice();for(let n=0;'cursor'in result&&n<30;n++) result=await slice(result.cursor);assert.ok('prepared'in result);return result.prepared}
  return{foir,seen,slice,finish}
}
test('bounded history walk counts local days once across pages and stops at a gap',async()=>{
  const f=fixture({myCapturePhotos:[['2026-11-02T10:00:00Z','2026-11-01T09:00:00Z','2026-11-01T08:00:00Z'],['2026-10-31T08:00:00Z','2026-10-30T08:00:00Z','2026-10-28T09:00:00Z']]})
  const prepared=await f.finish()
  assert.equal(prepared.tierDays,4)
  assert.match(prepared.prompt,/Sleepy in the sun/)
  assert.equal(prepared.modelVersion,'fixture-model')
  const note=f.seen.find(row=>row.query.includes('ArtworkFinalizedNote'))
  assert.equal(note.variables.now,now)
  assert.equal(note.variables.owner,owner)
  assert.equal(note.variables.photo,photo)
  assert.ok(f.seen.filter(row=>row.query.includes('ArtStreakPage')).every(row=>row.query.includes('first: 100')))
})
test('local calendar merge crosses the autumn DST boundary and caps work at the highest tier',async()=>{
  const f=fixture({myCapturePhotos:[['2026-11-02T10:00:00Z','2026-11-01T10:00:00Z','2026-10-31T10:00:00Z','2026-10-30T10:00:00Z',
    '2026-10-29T10:00:00Z','2026-10-28T10:00:00Z','2026-10-27T10:00:00Z','2026-10-26T10:00:00Z','2026-10-25T23:30:00Z','2026-10-24T23:30:00Z']]})
  // 24 October 23:30Z is already 25 October in London (BST): one local day.
  assert.equal((await f.finish()).tierDays,9)
  const capped=fixture({myCapturePhotos:[['2026-11-02T10:00:00Z'],['2026-11-01T10:00:00Z']]},1)
  assert.equal((await capped.finish()).tierDays,1)
  assert.equal(capped.seen.filter(row=>row.query.includes('page: myCapturePhotos')).length,1)
})
test('future, unordered, stalled and empty continuing history pages refuse instead of inventing a tier',async()=>{
  for(const dates of [['2026-11-03T10:00:00Z'],['2026-11-01T10:00:00Z','2026-11-02T10:00:00Z']]) {
    const f=fixture({myCapturePhotos:[dates]});const first=await f.slice();await assert.rejects(f.slice(first.cursor))
  }
  const f=fixture({myCapturePhotos:[[],['2026-11-01T10:00:00Z']]});const first=await f.slice();await assert.rejects(f.slice(first.cursor))
  const stalled=fixture();const original=stalled.foir.raw
  stalled.foir.raw=async(query,vars)=>query.includes('ArtStreakPage')?{page:{edges:[{node:{_createdAt:now}}],pageInfo:{hasNextPage:true,endCursor:null}}}:original(query,vars)
  const state=await stalled.slice();await assert.rejects(stalled.slice(state.cursor))
})
