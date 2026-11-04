import test from 'node:test'
import assert from 'node:assert/strict'
import { inboxPage, readNotification, notificationPath, notificationImage, inboxSession } from './notification-inbox'

test('notification attachments accept platform media and refuse tracking hosts or insecure URLs', () => {
  for (const host of ['cdn.foir.dev', 'cdn-dev.foir.dev']) assert.ok(notificationImage(`https://${host}/photo.png?token=example`))
  for (const value of [null, '', 'https://evil.test/photo.png', 'http://cdn.foir.dev/x', 'https://cdn.foir.dev.evil.test/x', 'https://user@cdn.foir.dev/x', 'https://cdn.foir.dev:444/x', 'file:///tmp/photo.png']) assert.equal(notificationImage(value), null)
})

test('notification links accept only known product routes and validated IDs', () => {
  const origin = 'https://example.test'
  for (const [value, expected] of [['/feed','/feed'], ['/catch','/catch'], ['tilly://capture','/catch'], ['tilly://account','/account'], ['tilly://cat/abcdefghij','/cats/abcdefghij'], ['tilly://person/abcdefghij','/people/abcdefghij'], ['https://example.test/people/abcdefghij','/people/abcdefghij']]) assert.equal(notificationPath(value,origin),expected)
  for (const value of ['https://evil.test/feed','//evil.test/feed','javascript:alert(1)','/feed?next=evil','/cats/../account','/cats/short','tilly://cat/short','tilly://feed/extra','/cats/%61bcdefghij','/feed#x','/\\evil.test/feed','https://user@example.test/feed','/sign-in','feed']) assert.equal(notificationPath(value,origin),null,value)
})
test('inbox follows native cursor, requests a bounded page and refuses missing/nonadvancing cursor', async () => {
  let args: unknown, query = ''
  const page = {edges:[{node:{id:'first', title:'Hello', body:null,actionUrl:null,isRead:false,createdAt:'2026-11-02T12:00:00Z'}}],pageInfo:{hasNextPage:true,endCursor:'second'}}
  const client = {raw: async <T>(q: string,a?: unknown) => {query=q;args=a;return {myNotifications:page,myUnreadCount:23} as T}}
  const result=await inboxPage(client,'first');assert.deepEqual(args,{after:'first'});assert.match(query,/first: 20/);assert.match(query,/myUnreadCount/);assert.equal(result.after,'second');assert.equal(result.unread,23);assert.equal(result.items[0].id,'first')
  page.pageInfo.endCursor='first';await assert.rejects(inboxPage(client,'first'),/did not advance/)
  page.pageInfo.endCursor=null as unknown as string;await assert.rejects(inboxPage(client,'first'),/did not advance/)
  page.pageInfo.hasNextPage=false;assert.equal((await inboxPage(client)).after,null)
})
test('read mutation uses notification identity only and refuses false or failed writes', async () => {
  let args: unknown
  const client={raw:async <T>(q:string,a?:unknown)=>{assert.match(q,/markNotificationRead\(id: \$id\)/);args=a;return {markNotificationRead:true}as T}}
  await readNotification(client,'own-notification');assert.deepEqual(args,{id:'own-notification'})
  await assert.rejects(readNotification({raw:async <T>()=>({markNotificationRead:false}as T)},'foreign'),/not marked read/)
  await assert.rejects(readNotification({raw:async()=>{throw Error('offline')}},'own'),/offline/)
})
test('account-bound inbox credentials refuse A→B, delayed replacement and A→B→A reuse', async () => {
  let userId='A',current=true,reads=0
  const bound=inboxSession({getUser:async()=>({userId}),getToken:async()=>{reads++;return 'token-A'}},'A',()=>current)
  assert.equal(await bound.getToken(),'token-A');userId='B';await assert.rejects(bound.getToken(),/account changed/);assert.equal(reads,1)
  userId='A';current=false;await assert.rejects(bound.refreshToken(),/account changed/);assert.equal(reads,1)
  current=true
  const delayed=inboxSession({getUser:async()=>({userId}),getToken:async()=>{userId='B';return 'token-B'}},'A',()=>current)
  await assert.rejects(delayed.getToken(),/account changed/)
})

import { NotificationInboxStore, type InboxItem } from './notification-inbox'
const item = (id: string): InboxItem => ({ id, title: id, body: null, actionUrl: null, isRead: false, createdAt: '2026-11-02T12:00:00Z' })
const response = (items: InboxItem[], after: string | null = null) => ({ myNotifications: { edges: items.map(node => ({node})), pageInfo: {hasNextPage: !!after, endCursor: after} }, myUnreadCount: items.filter(row => !row.isRead).length })
const tick = () => new Promise(resolve => setImmediate(resolve))

test('account replacement clears rows and rejects delayed lists and reads from the outgoing account', async () => {
  let complete: (value: unknown) => void = () => {}
  const old = new NotificationInboxStore({ raw: async <T>() => new Promise<T>(resolve => {complete = resolve as typeof complete}) })
  old.start();assert.equal(old.snapshot().busy,true);old.dispose()
  const replacement = new NotificationInboxStore({ raw: async <T>() => response([item('B')]) as T })
  replacement.start();await tick();complete(response([item('A')]));await tick()
  assert.deepEqual(old.snapshot().items,[]);assert.equal(old.snapshot().unread,0);assert.deepEqual(replacement.snapshot().items.map(row=>row.id),['B'])
  let finishRead: (value: unknown) => void = () => {}
  const store=new NotificationInboxStore({raw:async <T>(query: string)=>query.startsWith('mutation') ? new Promise<T>(resolve=>{finishRead=resolve as typeof finishRead}) : response([item('A')]) as T})
  store.start();await tick();const reading=store.markRead(item('A'));store.dispose();finishRead({markNotificationRead:true});await reading
  assert.deepEqual(store.snapshot().items,[]);assert.equal(store.snapshot().unread,0);assert.equal(store.snapshot().reading,null)
})
test('effect restart rejects prior replies while pagination deduplicates and retains read state', async () => {
  let complete: (value: unknown) => void=()=>{},calls=0
  const store=new NotificationInboxStore({raw:async <T>()=>{calls++;return calls===1?new Promise<T>(resolve=>{complete=resolve as typeof complete}): response(calls===2?[item('new')]:[item('new'),item('next')],calls===2?'next':null)as T}})
  store.start();store.dispose();store.start();await tick();complete(response([item('stale')]));await tick()
  assert.deepEqual(store.snapshot().items.map(row=>row.id),['new']);assert.equal(store.snapshot().unread,1)
  await store.load(true);assert.deepEqual(store.snapshot().items.map(row=>row.id),['new','next']);assert.equal(store.snapshot().after,null);assert.equal(store.snapshot().error,false)
})
test('read refusal keeps unread indicators, retries succeed, and refresh reconciles persisted read state', async () => {
  let accepted=false,read=false
  const store=new NotificationInboxStore({raw:async <T>(query:string)=>{if(query.startsWith('mutation')){read=accepted;return {markNotificationRead:accepted}as T}return response([{...item('own'),isRead:read}])as T}})
  store.start();await tick();await store.markRead(item('own'));assert.equal(store.snapshot().error,true);assert.equal(store.snapshot().unread,1);assert.equal(store.snapshot().items[0].isRead,false)
  accepted=true;await store.markRead(item('own'));assert.equal(store.snapshot().unread,0);assert.equal(store.snapshot().items[0].isRead,true)
  await store.load();assert.equal(store.snapshot().unread,0);assert.equal(store.snapshot().items[0].isRead,true)
})

import { notificationSwipe } from './notification-inbox'
test('swipe menu follows the trailing edge without consuming taps or vertical scrolls', () => {
  const start={x:100,y:100}
  assert.equal(notificationSwipe(start,{x:20,y:105}),true)
  assert.equal(notificationSwipe(start,{x:180,y:105},true),true)
  for(const end of [{x:100,y:100},{x:70,y:100},{x:20,y:180},{x:180,y:100}]) assert.equal(notificationSwipe(start,end),false)
  assert.equal(notificationSwipe(start,{x:20,y:100},true),false)
})
test('signed-out inbox starts empty and disposal rejects a delayed request failure', async () => {
  const signedOut=new NotificationInboxStore(null);signedOut.start();assert.deepEqual(signedOut.snapshot().items,[]);assert.equal(signedOut.snapshot().busy,false);assert.equal(signedOut.snapshot().unread,0)
  let reject: (failure: Error)=>void=()=>{}
  const store=new NotificationInboxStore({raw:async()=>new Promise((_,failure)=>{reject=failure})})
  store.start();store.dispose();reject(Error('old offline response'));await tick();assert.equal(store.snapshot().error,false);assert.equal(store.snapshot().busy,false)
})

test('retry repeats a failed refresh at the head and an older-page failure at its cursor', async () => {
  const cursors: unknown[] = []; let failed = false
  const store = new NotificationInboxStore({raw: async <T>(_query: string, args?: Record<string, unknown>) => {
    cursors.push(args?.after)
    if (failed) throw Error('offline')
    return response([item('one')], args?.after ? null : 'older') as T
  }})
  store.start(); await tick()
  failed = true; await store.load(); failed = false; await store.retry()
  assert.deepEqual(cursors, [null, null, null])
  failed = true; await store.load(true); failed = false; await store.retry()
  assert.deepEqual(cursors, [null, null, null, 'older', 'older'])
  const count = cursors.length; await store.retry(); assert.equal(cursors.length, count)
})


test('every owned row opens for reading immediately, independent of links and failed read persistence', async () => {
  const body = 'Full notification body. '.repeat(80)
  const noLink = { ...item('no-link'), body }
  const invalidLink = { ...item('invalid-link'), actionUrl: 'https://evil.test/private' }
  const store = new NotificationInboxStore({ raw: async <T>(query: string) => {
    if (query.startsWith('mutation')) throw Error('offline')
    return response([noLink, invalidLink]) as T
  }})
  store.start(); await tick()
  store.open(noLink)
  assert.equal(store.snapshot().opened?.body, body)
  assert.equal(store.snapshot().opened?.actionUrl, null)
  await tick()
  assert.equal(store.snapshot().error, true)
  assert.equal(store.snapshot().opened?.id, 'no-link')
  assert.equal(store.snapshot().items[0].isRead, false)
  store.close(); assert.equal(store.snapshot().opened, null)
  store.open(invalidLink)
  assert.equal(store.snapshot().opened?.id, 'invalid-link')
  assert.equal(notificationPath(store.snapshot().opened!.actionUrl, 'https://tilly.ink'), null)
  store.dispose()
  assert.equal(store.snapshot().opened, null)
  store.open(noLink)
  assert.equal(store.snapshot().opened, null)
})

test('unknown rows and delayed mark-read replies cannot reopen a disposed account', async () => {
  let finishRead: (value: unknown) => void = () => {}
  const own = item('own')
  const store = new NotificationInboxStore({ raw: async <T>(query: string) => query.startsWith('mutation')
    ? new Promise<T>(resolve => { finishRead = resolve as typeof finishRead }) : response([own]) as T })
  store.start(); await tick()
  store.open(item('foreign')); assert.equal(store.snapshot().opened, null)
  store.open(own); assert.equal(store.snapshot().opened?.id, 'own')
  store.dispose(); finishRead({ markNotificationRead: true }); await tick()
  assert.equal(store.snapshot().opened, null)
  assert.deepEqual(store.snapshot().items, [])
})
