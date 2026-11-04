import { useEffect, useState } from 'react'
import { Trophy } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '~/components/ui/dialog'
import { usePages } from './use-pages'
import { cursorSource } from './paging'
import { useAppSession } from './session'
import { useAppCopy } from './copy'
import { useResource } from './use-resource'
import { readChallenges, challengeIsActive } from './challenges'

function useChallengeTime(catalog: readonly {startsAt: string | null; endsAt: string | null}[] | null) {
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    const time = Date.now()
    const boundary = (catalog ?? []).flatMap(row => [Date.parse(row.startsAt ?? ''), Date.parse(row.endsAt ?? '')]).filter(value => value > time).sort((a,b) => a-b)[0]
    const timer = window.setTimeout(() => setNow(Date.now()), Math.max(1, Math.min(60_000, boundary ? boundary - time : 60_000)))
    return () => window.clearTimeout(timer)
  }, [catalog, now])
  return now
}

type ChallengeRow = Awaited<ReturnType<typeof readChallenges>>['catalog'][number]
type AwardRow = Awaited<ReturnType<typeof readChallenges>>['awards'][number]
const awardFor = (awards: readonly AwardRow[], challenge: Pick<ChallengeRow, '_naturalKey' | 'criteriaVersion'>) =>
  awards.find(row => row.challengeKey === challenge._naturalKey && row.challengeVersion === challenge.criteriaVersion)
const earned = (award?: AwardRow) => award?.active === true && !!award.earnedAt && award.progress !== null &&
  award.targetCount !== null && award.targetCount > 0 && award.progress >= award.targetCount

/** Photo challenges won, beside the user's name on their own page. The
 * trophy pulses while a challenge is running; it opens the running challenge
 * and past ones. */
export function ChallengeTrophy() {
  const {client, user, revision} = useAppSession(), t = useAppCopy()
  const rows = useResource(() => user ? readChallenges(client) : Promise.resolve(null), [client, user?.id, revision])
  const now = useChallengeTime(rows.data?.catalog ?? null)
  const [open, setOpen] = useState(false)
  if (!user || !rows.data) return null
  const won = rows.data.awards.filter(earned).length
  const running = rows.data.catalog.filter(row => challengeIsActive(row, now))
  return <>
    <button type="button" onClick={() => setOpen(true)}
      aria-label={t(won === 1 ? 'challenges.wonCount.one' : 'challenges.wonCount.other', {count: String(won)})}
      title={running.length ? t('challenges.liveHint') : undefined}
      className="inline-flex min-h-11 items-center gap-2 rounded-full bg-tilly-surface px-3 py-2 text-sm font-semibold tabular-nums">
      <Trophy aria-hidden="true" size={20} className={[won || running.length ? 'text-tilly-accent' : 'text-tilly-text-secondary',
        running.length ? 'motion-safe:animate-[trophy-pulse_1.6s_ease-in-out_infinite]' : ''].join(' ')} />
      <span aria-hidden="true">{won}</span>
    </button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[90dvh] w-[calc(100%_-_2rem)] overflow-y-auto font-sans">
        <DialogTitle>{t('challenges.title')}</DialogTitle>
        {running.length > 0 && <section className="grid gap-1">
          <h3 className="font-medium">{t('challenges.running')}</h3>
          {running.map(challenge => <ChallengeEntry key={challenge._id} challenge={challenge} award={awardFor(rows.data!.awards, challenge)}
            when={t('challenges.ends', {date: new Date(challenge.endsAt ?? '').toLocaleDateString()})} />)}
        </section>}
        {open && <PastChallenges awards={rows.data.awards} />}
      </DialogContent>
    </Dialog>
  </>
}

function ChallengeEntry({challenge, award, when}: {challenge: Pick<ChallengeRow, 'title' | 'description' | 'targetCount'>; award?: AwardRow; when: string}) {
  const t = useAppCopy()
  return <div className="grid gap-1 border-b border-[var(--color-tilly-border)] py-3">
    <p className="font-medium">{challenge.title}</p>
    <p className="text-sm text-tilly-text-secondary">{challenge.description}</p>
    {earned(award)
      ? <p className="inline-flex items-center gap-1 text-sm font-semibold text-tilly-accent"><Trophy aria-hidden="true" size={16} />{t('challenges.won')}</p>
      : <p className="text-sm tabular-nums">{t('challenges.progress', {count: String(award?.progress ?? 0), target: String(challenge.targetCount ?? 0)})}</p>}
    <p className="text-sm text-tilly-text-secondary">{when}</p>
  </div>
}

/** Challenges that have ended, newest first, a page at a time. */
function PastChallenges({awards}: {awards: readonly AwardRow[]}) {
  const {client} = useAppSession(), t = useAppCopy()
  const pages = usePages(() => {
    const now = new Date().toISOString()
    return cursorSource(async after => {
      const page = await client['photo-challenge'].findMany({first: 20, after, orderBy: [{createdAt: 'DESC'}],
        where: {endsAt: {lt: now}, enabled: {eq: true}}})
      return {rows: page.edges.map(edge => ({...edge.node, id: edge.node._id})), next: page.pageInfo.hasNextPage ? page.pageInfo.endCursor ?? null : null}
    })
  }, [client])
  return <section className="grid gap-1">
    <h3 className="font-medium">{t('challenges.past')}</h3>
    {!pages.busy && !pages.error && !pages.rows.length && <p className="text-sm text-tilly-text-secondary">{t('challenges.pastEmpty')}</p>}
    {pages.rows.map(challenge => <ChallengeEntry key={challenge.id} challenge={challenge} award={awardFor(awards, challenge)}
      when={t('challenges.ended', {date: new Date(challenge.endsAt ?? '').toLocaleDateString()})} />)}
    {pages.error && <p role="alert" className="text-sm">{pages.error}</p>}
    {pages.next && <button type="button" className="min-h-11 justify-self-start underline" disabled={pages.busy} onClick={() => void pages.more()}>{t('inbox.more')}</button>}
  </section>
}
