import assert from 'node:assert/strict'
import test from 'node:test'
import { runAppOperation } from './operations'
import type { AppClient } from './data'
const client = (reply: unknown) =>
  ({
    ns: { operations: { 'execute.tilly.save-profile': async () => reply } },
  }) as unknown as AppClient

test('social saves require an explicit successful result', async () => {
  for (const reply of [
    {},
    { execution: { status: 'queued' } },
    { execution: { status: 'completed' } },
    { result: { ok: false } },
    { result: { ok: true }, execution: { status: 'failed' } },
  ]) {
    await assert.rejects(
      runAppOperation(client(reply), 'execute.tilly.save-profile', {}),
    )
  }
  assert.equal(
    (
      await runAppOperation(
        client({
          result: { ok: true, id: 'record' },
          execution: { status: 'completed' },
        }),
        'execute.tilly.save-profile',
        {},
      )
    ).result.id,
    'record',
  )
})
test('operation errors propagate and identity keys reach the SDK', async () => {
  await assert.rejects(
    runAppOperation(
      client({ result: { error: 'Permission denied' } }),
      'execute.tilly.save-profile',
      {},
    ),
    /Permission denied/,
  )
  let received: unknown
  const stub = {
    ns: {
      operations: {
        'execute.tilly.save-profile': async (input: unknown) => {
          received = input
          return { result: { ok: true } }
        },
      },
    },
  } as unknown as AppClient
  await runAppOperation(
    stub,
    'execute.tilly.save-profile',
    { username: 'cat' },
    { idempotencyKey: 'retry-key' },
  )
  assert.deepEqual(received, {
    input: { username: 'cat' },
    idempotencyKey: 'retry-key',
    mode: 'ASYNC',
  })
})

test('async profile save observes its own run to a successful terminal result', async () => {
  let polls = 0
  const stub = { ns: { operations: {
    'execute.tilly.save-profile': async () => ({execution:{id:'own-run',status:'RUNNING'}}),
    operationExecution: async ({id}: {id:string}) => { assert.equal(id,'own-run'); polls++; return {id,operationKey:'tilly.save-profile',status:'COMPLETED',result:{ok:true,id:'profile'}} },
  } } } as unknown as AppClient
  assert.equal((await runAppOperation(stub,'execute.tilly.save-profile',{})).result.id,'profile')
  assert.equal(polls,1)
})
test('failed or foreign operation observations never report a saved profile', async () => {
  for(const observed of [
    {id:'other-run',operationKey:'tilly.save-profile',status:'COMPLETED',result:{ok:true}},
    {id:'own-run',operationKey:'tilly.save-catch',status:'COMPLETED',result:{ok:true}},
    {id:'own-run',operationKey:'tilly.save-profile',status:'TIMED_OUT'},
  ]) {
    const stub={ns:{operations:{'execute.tilly.save-profile':async()=>({execution:{id:'own-run',status:'RUNNING'}}),operationExecution:async()=>observed}}} as unknown as AppClient
    await assert.rejects(runAppOperation(stub,'execute.tilly.save-profile',{}))
  }
})
test('account changes stop polling before another account can supply credentials', async () => {
  const {setOperationIdentity}=await import('./operations')
  let polls=0
  const stub={ns:{operations:{'execute.tilly.save-profile':async()=>{
    setOperationIdentity(stub,'another-account')
    return {execution:{id:'own-run',status:'RUNNING'}}
  },operationExecution:async()=>{polls++;throw Error('must not poll')}}}} as unknown as AppClient
  setOperationIdentity(stub,'original-account')
  await assert.rejects(runAppOperation(stub,'execute.tilly.save-profile',{}))
  assert.equal(polls,0)
})
test('A to B to A replacement cannot revive a pending challenge execution', async () => {
  const {setOperationIdentity}=await import('./operations')
  let polls=0
  const stub={ns:{operations:{'execute.tilly.evaluate-challenges':async(args: {mode:string})=>{
    assert.equal(args.mode,'ASYNC')
    setOperationIdentity(stub,'B');setOperationIdentity(stub,'A')
    return {execution:{id:'old-run',status:'RUNNING'}}
  },operationExecution:async()=>{polls++;throw Error('must not poll')}}}} as unknown as AppClient
  setOperationIdentity(stub,'A')
  await assert.rejects(runAppOperation(stub,'execute.tilly.evaluate-challenges',{captureId:'owned-photo',revision:'v1'}))
  assert.equal(polls,0)
})
test('retrying a pending save keeps its execution identity until completion', async () => {
  const keys: string[] = []
  let completed = false
  const stub={ns:{operations:{'execute.tilly.save-profile':async(args: {idempotencyKey:string})=>{
    keys.push(args.idempotencyKey)
    return completed ? {result:{ok:true},execution:{status:'COMPLETED'}} : {execution:{id:'pending-run',status:'RUNNING'}}
  },operationExecution:async()=>({id:'unreadable-run'})}}} as unknown as AppClient
  await assert.rejects(runAppOperation(stub,'execute.tilly.save-profile',{username:'cat'}))
  completed=true
  await runAppOperation(stub,'execute.tilly.save-profile',{username:'cat'})
  assert.equal(keys[0],keys[1])
  await runAppOperation(stub,'execute.tilly.save-profile',{username:'cat'})
  assert.notEqual(keys[1],keys[2])
})

test('a terminal failed catch save permits a fresh execution while canonical input stays unchanged', async () => {
  const keys: string[] = [], inputs: unknown[] = []
  const stub = {ns:{operations:{
    'execute.tilly.save-catch': async (request: {idempotencyKey:string; input:unknown; mode:string}) => {
      assert.equal(request.mode,'ASYNC'); keys.push(request.idempotencyKey); inputs.push(request.input)
      return keys.length === 1 ? {execution:{id:'failed-run',status:'FAILED'}}
        : {execution:{id:'completed-run',status:'COMPLETED'},result:{ok:true,captureId:'capture',revision:'source-key',catId:'cat',photo:{_id:'capture'},cats:[{}]}}
    },
  }}} as unknown as AppClient
  const input = {captureKey:'source-key',photoFileId:'same-upload'}
  await assert.rejects(runAppOperation(stub,'execute.tilly.save-catch',input),/couldn’t complete/)
  assert.equal((await runAppOperation(stub,'execute.tilly.save-catch',input)).result.captureId,'capture')
  assert.notEqual(keys[0],keys[1]); assert.deepEqual(inputs,[input,input])
})
