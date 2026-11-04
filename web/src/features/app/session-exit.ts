import {disableWebPush} from '@foir/sdk/push'
import type {FoirSessionClient} from '@foir/sdk/auth/session'
import type {AppClient} from './data'

/** Unregister with the outgoing identity before closing its hosted session.
 * The SDK unsubscribes locally even offline. A push refusal must not keep the
 * account signed in; the SDK owns terminal sign-out and late-exchange guards.
 */
export async function endHostedSession(client:AppClient,session:Pick<FoirSessionClient,'signOut'>){
  try {await disableWebPush({client})}
  catch { /* Local unsubscription already ran; still end the hosted session. */ }
  finally {await session.signOut()}
}
