import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { MoreHorizontal } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '~/components/ui/dialog'
import { collectConnection } from './paging'
import { useAppSession } from './session'
import { useAppCopy } from './copy'
import { useResource } from './use-resource'
import { ProfileAvatar } from './ProfileAvatar'
import { FollowButton } from './Actions'
import { appImage } from './media'
import { answerFollower, profileCounts, readCircle, theirPeople } from './follows'
import { friendlyError } from '~/lib/failures'

type People = 'followers' | 'following'
const chunks = <T,>(values: T[]) => Array.from({ length: Math.ceil(values.length / 100) }, (_, i) => values.slice(i * 100, i * 100 + 100))

/** A user's counts: followers, following, cats met and catches, and the
 * lists behind the first two. Fóir gap (docs/known-gaps.md, "Other users' rows
 * in an operation"): a run can't count a private user's records for anyone
 * else, so for now these show only to someone who sees the user's catches.
 * Closes when an operation's declared grants decide what it reads. The
 * signed-in user's own page also shows who is asking to follow them. */
export function ProfileStats({ ownerId }: { ownerId: string }) {
  const { client, revision, user } = useAppSession(), t = useAppCopy()
  const mine = user?.id === ownerId
  const [people, setPeople] = useState<People | null>(null)
  const stats = useResource(async () => {
    const [counts, circle] = await Promise.all([profileCounts(client, ownerId), mine ? readCircle(client, ownerId) : Promise.resolve(null)])
    // My own lists are exact; someone else's counts come from Fóir.
    return circle
      ? { ...counts, followers: circle.followers.size, following: circle.following.size, circle }
      : { ...counts, circle: null }
  }, [client, ownerId, revision, mine])
  const lists = useResource(async () => {
    if (!people) return null
    if (stats.data?.circle) return [...stats.data.circle[people === 'followers' ? 'followers' : 'following']]
    return theirPeople(client, ownerId, people)
  }, [client, ownerId, people, stats.data])
  const count = (value: number | undefined, key: string, label: string, open?: People) => {
    const n = value ?? 0, word = t(`${key}.${n === 1 ? 'one' : 'other'}`, { count: String(n) })
    const body = <>
      <span className="block text-base font-semibold tabular-nums">{value === undefined ? '–' : n}</span>
      <span className="block text-sm text-tilly-text-secondary">{word}</span>
    </>
    const aria = t(`${label}.${n === 1 ? 'one' : 'other'}`, { count: String(n) })
    return open
      ? <button type="button" className="min-h-11 flex-1 text-center" aria-label={aria} onClick={() => setPeople(open)}>{body}</button>
      : <div className="min-h-11 flex-1 text-center" aria-label={aria} role="group">{body}</div>
  }
  return <>
    {stats.data?.circle && stats.data.circle.requests.length > 0 &&
      <Requests ids={stats.data.circle.requests} onChanged={stats.reload} />}
    <div className="mb-8 flex max-w-md">
      {count(stats.data?.followers, 'profile.stat.followers', 'profile.followerCount', 'followers')}
      {count(stats.data?.following, 'profile.stat.following', 'profile.followingCount', 'following')}
      {count(stats.data?.cats, 'profile.stat.cats', 'profile.cats.count')}
      {count(stats.data?.catches, 'profile.stat.catches', 'profile.catchCount')}
    </div>
    {stats.error && <p role="alert" className="mb-5 text-sm">{stats.error} <button type="button" className="underline" onClick={stats.reload}>{t('common.retry')}</button></p>}
    <Dialog open={people !== null} onOpenChange={open => { if (!open) setPeople(null) }}>
      <DialogContent className="max-h-[90dvh] w-[calc(100%_-_2rem)] overflow-y-auto font-sans">
        <DialogTitle>{t(people === 'followers' ? 'profile.followers' : 'profile.following')}</DialogTitle>
        {people && (lists.data
          ? <PeopleList ids={lists.data} removable={mine && people === 'followers'}
              empty={t(people === 'followers' ? 'profile.followersEmpty' : 'profile.followingEmpty')} onOpen={() => setPeople(null)} onChanged={stats.reload} />
          : lists.error ? <p role="alert" className="text-sm">{lists.error}</p> : <p className="text-sm text-tilly-text-secondary">…</p>)}
      </DialogContent>
    </Dialog>
  </>
}

function useProfiles(ids: string[]) {
  const { client } = useAppSession()
  return useResource(async () => (await Promise.all(chunks(ids).map(chunk => collectConnection(after => client.profile.findMany({ first: 100, after, where: { ownerId: { in: chunk } }, pick: ['_id', '_ownerId', 'displayName', 'username', 'photo'] })))))
    .flat(), [client, ids.join(',')])
}

/** People asking to follow the signed-in user, to accept or decline. */
function Requests({ ids, onChanged }: { ids: string[]; onChanged: () => void }) {
  const { client, followsChanged } = useAppSession(), t = useAppCopy()
  const profiles = useProfiles(ids)
  const [busy, setBusy] = useState<string | null>(null), [error, setError] = useState('')
  const reply = async (userId: string, answer: 'accept' | 'decline') => {
    setBusy(userId); setError('')
    try { await answerFollower(client, userId, answer); onChanged(); followsChanged() }
    catch (failure) { setError(friendlyError(failure, t)) }
    finally { setBusy(null) }
  }
  return <section className="mb-6 max-w-md rounded-2xl bg-tilly-surface p-4" aria-labelledby="follow-requests">
    <h2 id="follow-requests" className="mb-2 font-semibold">{t('profile.requests')}</h2>
    <ul className="grid gap-1">
      {(profiles.data ?? []).map(person => person._ownerId && <li key={person._id} className="flex flex-wrap items-center gap-3 py-1">
        <Link to="/people/$userId" params={{ userId: person._ownerId }} className="flex min-h-11 min-w-0 flex-1 items-center gap-3">
          <ProfileAvatar photo={appImage(person.photo)} seed={person._ownerId} size={34} />
          <span className="truncate font-medium">{person.displayName || person.username}</span>
        </Link>
        <button type="button" className="app-primary min-h-11 rounded-full px-4 text-sm" disabled={busy !== null}
          aria-label={t('profile.acceptLabel', { name: person.displayName || person.username || '' })} onClick={() => void reply(person._ownerId!, 'accept')}>{t('profile.accept')}</button>
        <button type="button" className="app-secondary min-h-11 rounded-full px-4 text-sm" disabled={busy !== null}
          aria-label={t('profile.declineLabel', { name: person.displayName || person.username || '' })} onClick={() => void reply(person._ownerId!, 'decline')}>{t('profile.decline')}</button>
      </li>)}
    </ul>
    {error && <p role="alert" className="mt-2 text-sm">{error}</p>}
  </section>
}

function PeopleList({ ids, empty, removable, onOpen, onChanged }: { ids: string[]; empty: string; removable: boolean; onOpen: () => void; onChanged: () => void }) {
  const { client, user } = useAppSession(), t = useAppCopy()
  const profiles = useProfiles(ids)
  const [error, setError] = useState('')
  if (!ids.length) return <p className="text-sm text-tilly-text-secondary">{empty}</p>
  const remove = async (userId: string) => {
    setError('')
    try { await answerFollower(client, userId, 'remove'); onChanged() }
    catch (failure) { setError(friendlyError(failure, t)) }
  }
  return <>
    <ul className="grid">
      {(profiles.data ?? []).map(person => person._ownerId && <li key={person._id} className="flex items-center gap-3 border-b border-[var(--color-tilly-border)] py-2">
        <Link to="/people/$userId" params={{ userId: person._ownerId }} onClick={onOpen} className="flex min-h-11 flex-1 items-center gap-3">
          <ProfileAvatar photo={appImage(person.photo)} seed={person._ownerId} size={34} />
          <span className="grid"><span className="font-medium">{person.displayName || person.username}</span>
            {person.username && <span className="text-sm text-tilly-text-secondary">@{person.username}</span>}</span>
        </Link>
        {person._ownerId !== user?.id && <FollowButton userId={person._ownerId} onChanged={onChanged} />}
        {removable && <details className="relative">
          <summary className="grid size-11 cursor-pointer list-none place-items-center rounded-full"
            aria-label={t('profile.removeFollowerLabel', { name: person.displayName || person.username || '' })}><MoreHorizontal size={18} aria-hidden="true" /></summary>
          <button type="button" className="absolute right-0 z-10 mt-1 min-h-11 whitespace-nowrap rounded-xl bg-tilly-surface px-4 text-sm shadow"
            onClick={() => void remove(person._ownerId!)}>{t('profile.removeFollower')}</button>
        </details>}
      </li>)}
    </ul>
    {error && <p role="alert" className="mt-2 text-sm">{error}</p>}
  </>
}
