import {test} from 'node:test'
import assert from 'node:assert/strict'
import {clearSession,everyRow,setSession} from '../console/api'
const page=(id:string,next:string|null)=>({page:{edges:[{node:{_id:id}}],pageInfo:{hasNextPage:next!==null,endCursor:next}}})
test('placement pagination stays with one scoped session for all pages',async()=>{
 const calls:(string|undefined)[]=[],session={async request(_query:string,variables?:{after?:string}){calls.push(variables?.after);return page(variables?.after?'second':'first',variables?.after?null:'next')}}
 setSession(session as never)
 try{assert.deepEqual(await everyRow('uiCopies','_id'),[{_id:'first'},{_id:'second'}]);assert.deepEqual(calls,[undefined,'next'])}finally{clearSession(session as never)}
})
test('replacement between pages refuses the old read and never requests replacement records',async()=>{
 let replacementCalls=0,initialCalls=0
 const replacement={async request(){replacementCalls++;return page('foreign-record',null)}}
 const original={async request(){initialCalls++;setSession(replacement as never);return page('initial-record','next')}}
 setSession(original as never)
 try{await assert.rejects(everyRow('uiCopies','_id'),/session changed/);assert.equal(initialCalls,1);assert.equal(replacementCalls,0)}finally{clearSession(replacement as never)}
})
test('placement disposal between pages refuses continuation rather than accepting a partial list',async()=>{
 let calls=0;const session={async request(){calls++;clearSession(session as never);return page('initial-record','next')}}
 setSession(session as never)
 await assert.rejects(everyRow('uiCopies','_id'),/session changed/);assert.equal(calls,1)
 await assert.rejects(everyRow('uiCopies','_id'),/no longer connected/)
})
