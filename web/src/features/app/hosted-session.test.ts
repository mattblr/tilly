import test from 'node:test'
import assert from 'node:assert/strict'
import { createFoirSessionClient } from '@foir/sdk/auth/session'

test('late SDK exchange cannot return credentials or emit a user after logout or disposal', async () => {
  const original = globalThis.fetch
  try {
    for (const action of ['logout', 'dispose']) {
      let release!: (response: Response) => void
      const held = new Promise<Response>(resolve => { release = resolve })
      const requests: string[] = [], events: unknown[] = []
      globalThis.fetch = async url => {
        requests.push(String(url))
        return String(url).includes('/session/logout') ? Response.json({ ok: true }) : held
      }
      const session = createFoirSessionClient({ loginOrigin: 'https://login.example.test' })
      session.subscribe(user => events.push(user))
      const user = session.getUser(), token = session.getToken()
      if (action === 'logout') await session.signOut()
      else session.destroy()
      release(Response.json({ access_token: 'fixture-access', user_id: 'fixture-user', email: 'fixture@example.invalid', expires_in: 900 }))
      assert.equal(await user, null)
      assert.equal(await token, null)
      assert.equal(await session.getUser(), null)
      assert.equal(await session.getToken(), null)
      assert.ok(events.every(user => user === null))
      assert.equal(requests.length, action === 'logout' ? 2 : 1)
      session.destroy()
    }
  } finally { globalThis.fetch = original }
})

test('a fresh hosted client still reads normal credentials and repeated logout shares one request', async () => {
  const original = globalThis.fetch
  let logouts = 0
  try {
    globalThis.fetch = async url => {
      if (String(url).includes('/session/logout')) { logouts++; return Response.json({ ok: true }) }
      return Response.json({ access_token: 'fixture-access', user_id: 'fixture-user', email: 'fixture@example.invalid', expires_in: 900 })
    }
    const session = createFoirSessionClient({ loginOrigin: 'https://login.example.test' })
    assert.equal((await session.getUser())?.userId, 'fixture-user')
    assert.equal(await session.getToken(), 'fixture-access')
    await Promise.all([session.signOut(), session.signOut()])
    assert.equal(logouts, 1)
    assert.equal(await session.getUser(), null)
    session.destroy()
  } finally { globalThis.fetch = original }
})

test('held outgoing exchange cannot replace a fresh account after hosted logout', async () => {
  const original=globalThis.fetch
  let release!: (value:Response)=>void,first=true
  const held=new Promise<Response>(resolve=>{release=resolve})
  try {
    globalThis.fetch=async url=>{
      if(String(url).includes('/session/logout'))return Response.json({ok:true})
      if(first){first=false;return held}
      return Response.json({access_token:'fixture-B',user_id:'account-B',email:'b@example.invalid',expires_in:900})
    }
    const outgoing=createFoirSessionClient({loginOrigin:'https://login.example.test'})
    const stale=outgoing.getUser()
    await outgoing.signOut()
    const replacement=createFoirSessionClient({loginOrigin:'https://login.example.test'})
    assert.equal((await replacement.getUser())?.userId,'account-B')
    release(Response.json({access_token:'fixture-A',user_id:'account-A',email:'a@example.invalid',expires_in:900}))
    assert.equal(await stale,null);assert.equal(await outgoing.getToken(),null)
    assert.equal((await replacement.getUser())?.userId,'account-B')
    outgoing.destroy();replacement.destroy()
  }finally{globalThis.fetch=original}
})
