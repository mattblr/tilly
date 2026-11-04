import {test} from 'node:test'
import assert from 'node:assert/strict'
import {createFoirSessionClient} from '@foir/sdk/auth/session'
import {enableWebPush} from '@foir/sdk/push'
import {endHostedSession} from './session-exit'
import type {AppClient} from './data'

function browser(){
 const saved=new Map(['window','navigator','Notification'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]))
 const events:string[]=[];let subscription:ReturnType<typeof make>|null=null,serial=0
 function make(){const token=`fixture-push-${++serial}`;return {toJSON:()=>({endpoint:`https://push.example.test/${token}`,keys:{p256dh:'fixture',auth:'fixture'}}),unsubscribe:async()=>{events.push('unsubscribe');subscription=null;return true}}}
 const registration={pushManager:{getSubscription:async()=>subscription,subscribe:async()=>subscription=make()}}
 for(const [key,value]of Object.entries({window:{PushManager:class{},Notification:{}},navigator:{serviceWorker:{register:async()=>registration,ready:Promise.resolve(registration),getRegistration:async()=>registration}},Notification:{requestPermission:async()=>'granted'}}))Object.defineProperty(globalThis,key,{configurable:true,value})
 return {events,restore(){for(const[key,descriptor]of saved)if(descriptor)Object.defineProperty(globalThis,key,descriptor);else Reflect.deleteProperty(globalThis,key)}}
}
test('SDK push moves from outgoing A to an explicitly enabled B using their own scoped clients',async()=>{
 const env=browser();let current='A'
 const client=(owner:string)=>({raw:async(q:string)=>{
  assert.equal(current,owner)
  if(q.includes('WebPushConfig'))return {webPushConfig:{vapidPublicKey:'AQID'}}
  if(q.includes('UnregisterDeviceToken')){env.events.push(`unregister:${owner}`);return {unregisterDeviceToken:true}}
  env.events.push(`register:${owner}`);return {registerDeviceToken:true}
 }}) as unknown as AppClient
 try{
  assert.equal((await enableWebPush({client:client('A')})).ok,true)
  await endHostedSession(client('A'),{signOut:async()=>{env.events.push('logout:A');current='B'}})
  assert.equal((await enableWebPush({client:client('B')})).ok,true)
  assert.deepEqual(env.events,['register:A','unregister:A','unsubscribe','logout:A','register:B'])
 }finally{env.restore()}
})
test('offline unregister still unsubscribes locally and terminal hosted logout cannot be revived',async()=>{
 const env=browser(),original=globalThis.fetch
 try{
  let offline=false
  globalThis.fetch=async url=>{if(offline)throw Error('offline');return Response.json({access_token:'fixture-access',user_id:'fixture-A',email:'fixture@example.invalid',expires_in:900})}
  const session=createFoirSessionClient({loginOrigin:'https://login.example.test'})
  assert.equal((await session.getUser())?.userId,'fixture-A')
  const client={raw:async(q:string)=>{
   if(q.includes('WebPushConfig'))return {webPushConfig:{vapidPublicKey:'AQID'}}
   if(q.includes('UnregisterDeviceToken')){env.events.push('unregister:A');throw Error('offline')}
   return {registerDeviceToken:true}
  }} as unknown as AppClient
  await enableWebPush({client});offline=true
  await assert.doesNotReject(endHostedSession(client,session))
  assert.deepEqual(env.events,['unregister:A','unsubscribe'])
  assert.equal(await session.getUser(),null);assert.equal(await session.getToken(),null)
  session.destroy()
 }finally{globalThis.fetch=original;env.restore()}
})
