import { useAppCopy } from './copy'
import { friendlyError } from '~/lib/failures'
import { SignInLink } from './SignIn'
import { useRef, useState } from 'react'
import { Heart, UserRoundPlus, Check, Repeat2, Clock } from 'lucide-react'
import { useAppSession } from './session'
import { useResource } from './use-resource'
import { CompletedOperationFailure, runAppOperation } from './operations'
import type { Encounter } from './data'
import { useCatchLikes } from './Likes'
import { relationTo, setFollow, type FollowState } from './follows'
import { FieldNoteForm } from './Notes'
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetTitle,
} from '~/components/ui/sheet'

export function FollowButton({
  catId,
  userId,
  onChanged,
}: {
  catId?: string
  userId?: string
  onChanged?: () => void
}) {
  const t = useAppCopy()
  const { client, user, revision } = useAppSession()
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('')
  const pending = useRef(false)
  // A user is followed at once, or asked first when their profile is private.
  const follows = useResource<FollowState>(async () => {
    if (!user) return 'none'
    if (!catId) return userId ? relationTo(client, user.id, userId) : 'none'
    const page = await client['cat-follow'].findMany({
      first: 1,
      where: { ownerId: { eq: user.id }, catKey: { eq: catId } },
      pick: ['_id'],
    })
    return page.totalCount > 0 ? 'following' : 'none'
  }, [client, user?.id, revision, catId, userId])
  const state = follows.data ?? 'none'
  if (userId && userId === user?.id) return null
  if (!user)
    return (
      <SignInLink
        className={[
          'app-secondary min-h-11 p-[10px_18px] rounded-full [background:var(--color-tilly-surface)] inline-flex gap-2 items-center justify-center text-[14px]',
          'whitespace-nowrap',
        ].join(' ')}
      >
        {t('social.signInFollow')}
      </SignInLink>
    )
  const toggle = async () => {
    if (pending.current || follows.busy || follows.error) return
    pending.current = true
    setBusy(true)
    setError('')
    try {
      if (catId)
        await runAppOperation(client, 'execute.follow_cat', { catId, following: state === 'none' }, { concurrencyKey: `follow:${catId}` })
      else if (userId) await setFollow(client, userId, state === 'none')
      follows.reload()
      onChanged?.()
    } catch (failure) {
      setError(
        friendlyError(failure, t),
      )
    } finally {
      pending.current = false
      setBusy(false)
    }
  }
  return (
    <div>
      <button
        className={[
          'app-secondary min-h-11 p-[10px_18px] rounded-full [background:var(--color-tilly-surface)] inline-flex gap-2 items-center justify-center text-[14px]',
          'max-[700px]:[.profile-biography_>_&]:ml-[auto]',
        ].join(' ')}
        aria-pressed={state !== 'none'}
        aria-description={state === 'requested' ? t('profile.cancelRequest') : undefined}
        disabled={busy || follows.busy || !!follows.error}
        onClick={() => {
          void toggle()
        }}
      >
        {state === 'following' ? <Check size={16} /> : state === 'requested' ? <Clock size={16} /> : <UserRoundPlus size={16} />}
        {state === 'following' ? t('profile.following') : state === 'requested' ? t('profile.requested') : catId ? t('cat.follow') : t('profile.follow')}
      </button>
      {(error || follows.error) && (
        <p
          role="alert"
          className={
            'app-inline-error [color:var(--color-tilly-text-secondary)] text-[13px]'
          }
        >
          {error || follows.error}{' '}
          {follows.error && <button onClick={follows.reload}>{t('common.retry')}</button>}
        </p>
      )}
    </div>
  )
}
export function CatchActions({
  row,
  onChanged,
}: {
  row: Encounter
  onChanged?: () => void
}) {
  const t = useAppCopy()
  const { client, user } = useAppSession()
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [sharing, setSharing] = useState(false),
    [comment, setComment] = useState('')
  const key = row.photoKey
  const attempt = useRef<{ input: string; key: string } | null>(null)
  const pending = useRef(false)
  const likes = useCatchLikes(key)
  const act = async (action: 'like' | 'share' | 'unshare') => {
    if (!user || !key || pending.current) return
    pending.current = true
    setBusy(true)
    setError('')
    try {
      if (action === 'like') {
        await runAppOperation(
          client,
          'execute.like_capture',
          { photoKey: key, liked: !likes.mine },
          { concurrencyKey: `like:${key}` },
        )
        likes.reload()
      } else {
        const input = {
          photoKey: key,
          reshareOf: row.originalPostId ?? row.id,
          comment,
          reposted: action !== 'unshare',
        }
        const serialized = JSON.stringify(input)
        if (attempt.current?.input !== serialized)
          attempt.current = { input: serialized, key: crypto.randomUUID() }
        await runAppOperation(client, 'execute.tilly.share-capture', input, {
          idempotencyKey: attempt.current.key,
        })
        attempt.current = null
        setSharing(false)
        setComment('')
        likes.reload()
        onChanged?.()
      }
    } catch (failure) {
      if(failure instanceof CompletedOperationFailure)attempt.current=null
      setError(
        friendlyError(failure, t),
      )
    } finally {
      pending.current = false
      setBusy(false)
    }
  }
  if (!key) return null
  return (
    <Sheet open={sharing} onOpenChange={setSharing}>
      <div
        className={[
          'catch-actions flex gap-4.5 items-center flex-wrap text-[13px] mt-2.5',
          '[&_>_button]:inline-flex [&_>_button]:gap-2 [&_>_button]:items-center [&_>_button]:min-h-11 [&_>_button]:justify-center [&_>_button]:min-w-11',
          '[&_>_a]:inline-flex [&_>_a]:gap-2 [&_>_a]:items-center [&_>_a]:min-h-11',
          "[&_[aria-pressed='true']]:[color:var(--color-tilly-accent)]",
          '[&_form]:[flex-basis:100%] [&_form]:grid [&_form]:gap-2.5',
          '[&_textarea]:min-h-20 [&_textarea]:p-3 [&_textarea]:[background:var(--color-tilly-surface)] [&_textarea]:rounded-[8px]',
        ].join(' ')}
      >
        {user ? (
          <>
            <button
              aria-label={t(likes.mine ? 'social.unlike' : 'social.like')}
              aria-pressed={!!likes.mine}
              disabled={busy || likes.busy || !!likes.error}
              onClick={() => {
                void act('like')
              }}
            >
              <Heart size={17} fill={likes.mine ? 'currentColor' : 'none'} />
              {likes.count ?? '—'}
            </button>
            {user.id === row.authorId && !row.reshare && (
              <FieldNoteForm photoKey={key} onSaved={onChanged} />
            )}
            {user.id !== row.authorId &&
              (row.audience === 'public' || likes.reposted) &&
              (likes.reposted ? (
                <button
                  aria-label={t('social.undoRepost')}
                  aria-pressed="true"
                  disabled={busy || likes.busy || !!likes.error}
                  onClick={() => void act('unshare')}
                >
                  <Repeat2 size={20} aria-hidden="true" />
                </button>
              ) : (
                <SheetTrigger asChild>
                  <button
                    aria-label={t('social.repostCatch')}
                    aria-pressed="false"
                    disabled={busy || likes.busy || !!likes.error}
                  >
                    <Repeat2 size={20} aria-hidden="true" />
                  </button>
                </SheetTrigger>
              ))}
          </>
        ) : (
          <>
            <SignInLink
              className={
                'catch-action-icon inline-flex items-center justify-center gap-2 min-w-11 min-h-11'
              }
            >
              <Heart size={20} aria-hidden="true" />
              <span className="sr-only">{t('social.like')}</span>
              {likes.count ?? ''}
            </SignInLink>
            <SignInLink
              className={
                'catch-action-icon inline-flex items-center justify-center gap-2 min-w-11 min-h-11'
              }
            >
              <Repeat2 size={20} aria-hidden="true" />
              <span className="sr-only">{t('social.repostCatch')}</span>
            </SignInLink>
          </>
        )}
        <SheetContent
          showClose={false}
          aria-describedby={undefined}
          className="sm:inset-x-auto sm:left-1/2 sm:top-1/2 sm:bottom-auto sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl"
        >
          <SheetTitle className="text-xl font-semibold">
            {t('social.repostCatch')}
          </SheetTitle>
          <form
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault()
              void act('share')
            }}
          >
            <label htmlFor={`share-${row.id}`}>{t('social.addComment')}</label>
            <textarea
              id={`share-${row.id}`}
              maxLength={280}
              disabled={busy}
              value={comment}
              className="min-h-28 w-full rounded-xl border border-[var(--color-tilly-border)] bg-tilly-surface p-3 font-sans"
              onChange={(event) => setComment(event.target.value)}
            />
            {/* A reshare follows the user's profile setting. */}
            <p className="text-sm text-tilly-text-secondary">
              {t(likes.privacy === 'public' ? 'social.seenBy.public' : 'social.seenBy.private')}
            </p>
            {error && <p role="alert">{error}</p>}
            <button
              type="submit"
              className="min-h-12 w-full rounded-xl bg-tilly-accent px-5 py-3 font-medium text-tilly-on-signal"
              disabled={busy}
            >
              {t('social.repostAction')}
            </button>
          </form>
        </SheetContent>
        {(error || likes.error) && (
          <p
            role="alert"
            className={
              'app-inline-error [color:var(--color-tilly-text-secondary)] text-[13px]'
            }
          >
            {error || likes.error}{' '}
            {likes.error && <button onClick={likes.reload}>{t('common.retry')}</button>}
          </p>
        )}
      </div>
    </Sheet>
  )
}
