import assert from 'node:assert/strict'
import test from 'node:test'
import {finishSavedCapture,type SavedCaptureCompletion} from './capture-finalize'
import type {AppClient} from './data'

function fixture() {
  const calls:{name:string;input:unknown;key:string}[]=[]
  let fail=false,terminal=false,current=true
  const client={ns:{operations:Object.fromEntries(['add_field_note','finalize_capture'].map(name=>[`execute.${name==='add_field_note'?'tilly.add-field-note':name}`,async(args:{input:unknown;idempotencyKey:string})=>{
    calls.push({name,input:args.input,key:args.idempotencyKey})
    if(name==='finalize_capture'&&fail) {if(terminal)return{execution:{status:'FAILED'}};throw Error('Response lost')}
    return{result:{ok:true},execution:{status:'COMPLETED'}}
  }]))}} as unknown as AppClient
  const attempt:SavedCaptureCompletion={photoKey:'capture00000001',captureId:'capture00000001',note:{text:'A quiet cat'}}
  return{calls,attempt,finish:()=>finishSavedCapture(client,attempt,()=>current),fail:(value:boolean,isTerminal=false)=>{fail=value;terminal=isTerminal},leave:()=>{current=false}}
}
test('client note boundary finishes before native finalization and successful retries create no extra writes',async()=>{
  const f=fixture();await f.finish();await f.finish()
  assert.deepEqual(f.calls.map(call=>call.name),['add_field_note','finalize_capture'])
  assert.equal(f.attempt.note?.saved,true);assert.equal(f.attempt.finished,true)
})
test('ambiguous finalization retains its key and never resaves a successful note',async()=>{
  const f=fixture();f.fail(true);await assert.rejects(f.finish());const key=f.attempt.finalizeKey
  f.fail(false);await f.finish()
  assert.deepEqual(f.calls.map(call=>call.name),['add_field_note','finalize_capture','finalize_capture'])
  assert.equal(f.calls[1].key,key);assert.equal(f.calls[2].key,key)
})
test('confirmed terminal failure permits a new finalizer run while retaining the saved note',async()=>{
  const f=fixture();f.fail(true,true);await assert.rejects(f.finish());assert.equal(f.attempt.finalizeKey,undefined)
  const failed=f.calls.at(-1)!.key;f.fail(false);await f.finish()
  assert.notEqual(f.calls.at(-1)!.key,failed);assert.equal(f.calls.filter(call=>call.name==='add_field_note').length,1)
})
test('session/route departure refuses follow-up work; legacy catches do not invoke a canonical finalizer',async()=>{
  const f=fixture();f.leave();await assert.rejects(f.finish());assert.equal(f.calls.length,0)
  const legacy=fixture();delete legacy.attempt.captureId;await legacy.finish();assert.deepEqual(legacy.calls.map(call=>call.name),['add_field_note'])
})
