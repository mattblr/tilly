import { Flame } from 'lucide-react'
import { streakAt } from '~/lib/streak-calendar'
import { collectConnection } from './paging'
import { useAppSession } from './session'
import { useAppCopy } from './copy'
import { useResource } from './use-resource'

/** Personal progress belongs to the signed-in owner, never a public profile. */
export function OwnerStreak({ ownerId }: { ownerId: string }) {
  const { user } = useAppSession()
  return user?.id === ownerId ? <Streak key={ownerId} ownerId={ownerId} /> : null
}

function Streak({ ownerId }: { ownerId: string }) {
  const { client, revision } = useAppSession(), t = useAppCopy()
  const stats = useResource(async () => {
    const captures = await collectConnection(after => client['capture-photo'].findMany({
      first: 100, after, where: { ownerId: { eq: ownerId }, state: { eq: 'ready' } }, pick: ['_createdAt'],
    }))
    return streakAt(captures.map(row => row._createdAt), new Date(), Intl.DateTimeFormat().resolvedOptions().timeZone)
  }, [client, ownerId, revision])
  if (stats.error) return <p role="alert" className="mb-5 text-sm text-tilly-text-secondary">{stats.error} <button type="button" onClick={stats.reload}>{t('errors.retry')}</button></p>
  if (stats.busy || !stats.data) return null
  const label = t(stats.data.current === 1 ? 'streak.days.one' : 'streak.days.other', { count: String(stats.data.current) })
  return <span className="inline-flex min-h-11 items-center gap-2 rounded-full bg-tilly-surface px-3 py-2 text-sm font-semibold tabular-nums" aria-label={label} title={t('streak.best', { count: String(stats.data.best) })}>
    <Flame aria-hidden="true" size={20} className={stats.data.current ? 'text-tilly-accent' : 'text-tilly-text-secondary'} />
    <span aria-hidden="true">{stats.data.current}</span>
  </span>
}
