import type { AppClient } from './data'

/** Bind each SDK credential lookup to the account that opened confirmation.
 * Tokens stay in memory and are obtained through the hosted-session SDK.
 */
export function deletionSessionForUser(session: {
  getUser: () => Promise<{ userId: string } | null>
  getToken: () => Promise<string | null>
}, expectedUserId: string) {
  const assertCurrent = async () => {
    if ((await session.getUser())?.userId !== expectedUserId)
      throw new Error('The signed-in account changed.')
  }
  const assertNotReplaced = async () => {
    const current = await session.getUser()
    // A successful deletion may already have invalidated the hosted cookie.
    // Signed out is safe to clean up; another account is not.
    if (current && current.userId !== expectedUserId)
      throw new Error('The signed-in account changed.')
  }
  const getToken = async () => {
    await assertCurrent()
    const token = await session.getToken()
    await assertCurrent()
    if (!token) throw new Error('Sign in again before deleting your account.')
    return token
  }
  return { getToken, refreshToken: getToken, assertCurrent, assertNotReplaced }
}

/** Fóir authenticates the caller and queues owned-data removal. A successful
 * response closes the account; it does not prove that background erasure ended.
 * Do not use an admin operation, caller-supplied user ID or broader credential.
 */
export async function deleteOwnAccount(client: Pick<AppClient, 'raw'>, forgetAcceptedAccount: () => Promise<void>, assertNotReplaced = async () => {}) {
  const response = await client.raw<{ deleteMyAccount: { success: boolean; recordsDeleted: number; filesDeleted: number } | null }>(
    'mutation DeleteOwnAccount { deleteMyAccount(confirm: true) { success recordsDeleted filesDeleted } }',
  )
  if (response.deleteMyAccount?.success !== true) throw new Error('Account deletion was not accepted.')
  await assertNotReplaced()
  await forgetAcceptedAccount()
  return response.deleteMyAccount
}
