import { friendlyError } from '~/lib/failures'
import { Popover } from 'radix-ui'
import { MessageCircle } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useAppSession } from './session'
import { useAppCopy } from './copy'
import { useResource } from './use-resource'
import { collectPages } from './feed-sources'
import { runAppOperation } from './operations'
import { ToggleGroup, ToggleGroupItem } from '~/components/ui/toggle-group'
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetTitle,
} from '~/components/ui/sheet'

export function FieldNoteForm({
  photoKey,
  onSaved,
}: {
  photoKey: string
  onSaved?: () => void
}) {
  const { client, locale, user } = useAppSession(),
    t = useAppCopy()
  const [open, setOpen] = useState(false),
    [text, setText] = useState(''),
    [tags, setTags] = useState<string[]>([])
  const [mobile, setMobile] = useState(false)
  useEffect(() => {
    const query = window.matchMedia('(max-width: 640px)')
    const update = () => setMobile(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [saved, setSaved] = useState(false)
  const pending = useRef(false),
    attempt = useRef<{ input: string; key: string } | null>(null)
  const offered = useResource(
    async () =>
      open
        ? collectPages(async (after) => {
            const page = await client['note-tag'].findMany({
              first: 100,
              locale,
              after,
              orderBy: [{ position: 'ASC' }],
              pick: ['_id', 'label'],
            })
            return {
              rows: page.edges
                .map((e) => e.node.label)
                .filter((label): label is string => !!label),
              next: page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null,
            }
          })
        : [],
    [client, open, locale],
  )
  const existing = useResource(
    async () =>
      open && user
        ? ((
            await client['field-note'].findMany({
              first: 1,
              where: { ownerId: { eq: user.id }, photoKey: { eq: photoKey } },
              orderBy: [{ createdAt: 'DESC' }],
              pick: ['_id', 'text', 'tags'],
            })
          ).edges[0]?.node ?? null)
        : null,
    [client, user?.id, photoKey, open],
  )
  useEffect(() => {
    if (existing.data) {
      setText(existing.data.text ?? '')
      setTags(
        Array.isArray(existing.data.tags)
          ? existing.data.tags.filter(
              (tag): tag is string => typeof tag === 'string',
            )
          : [],
      )
    }
  }, [existing.data])
  const save = async () => {
    if (pending.current) return
    pending.current = true
    setBusy(true)
    setError('')
    setSaved(false)
    try {
      const input = { photoKey, text: text.trim(), tags },
        serialized = JSON.stringify(input)
      if (attempt.current?.input !== serialized)
        attempt.current = { input: serialized, key: crypto.randomUUID() }
      await runAppOperation(client, 'execute.tilly.add-field-note', input, {
        idempotencyKey: attempt.current.key,
      })
      attempt.current = null
      setText('')
      setTags([])
      setOpen(false)
      setSaved(true)
      onSaved?.()
    } catch (failure) {
      setError(
        friendlyError(failure, t),
      )
    } finally {
      pending.current = false
      setBusy(false)
    }
  }
  const trigger = (
    <button
      type="button"
      className={
        'catch-action-icon inline-flex items-center justify-center gap-2 min-w-11 min-h-11'
      }
      aria-label={t('observe.editComment')}
    >
      <MessageCircle size={20} aria-hidden="true" />
    </button>
  )
  const form = (
    <form
      className={[
        'catch-comment-form flex flex-col gap-4',
        '[&_fieldset]:[border:0] [&_fieldset]:p-0 [&_fieldset]:m-0 [&_fieldset]:min-w-0',
        '[&_legend]:mb-3',
        '[&_textarea]:w-full [&_textarea]:min-h-28 [&_textarea]:[border:1px_solid_var(--color-tilly-border)] [&_textarea]:rounded-[12px] [&_textarea]:p-3 [&_textarea]:[background:var(--color-tilly-surface)] [&_textarea]:[color:inherit] [&_textarea]:[font:inherit]',
      ].join(' ')}
      onSubmit={(event) => {
        event.preventDefault()
        void save()
      }}
    >
      <fieldset disabled={busy || existing.busy}>
        <legend>{t('observe.prompt')}</legend>
        <ToggleGroup
          type="multiple"
          value={tags}
          onValueChange={setTags}
          disabled={busy || existing.busy}
          aria-label={t('observe.prompt')}
        >
          {offered.data?.map((label) => (
            <ToggleGroupItem key={label} value={label}>
              {label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </fieldset>
      {offered.error && (
        <p role="alert">
          {offered.error}{' '}
          <button type="button" onClick={offered.reload}>
            {t("common.retry")}</button>
        </p>
      )}
      <label htmlFor={`note-${photoKey}`}>{t('observe.noteLabel')}</label>
      <textarea
        id={`note-${photoKey}`}
        maxLength={280}
        value={text}
        disabled={busy}
        placeholder={t('observe.notePlaceholder')}
        onChange={(event) => setText(event.target.value)}
      />
      {existing.error && (
        <p role="alert">
          {existing.error}{' '}
          <button type="button" onClick={existing.reload}>
            {t("common.retry")}</button>
        </p>
      )}
      {error && <p role="alert">{error}</p>}
      <div
        className={[
          'catch-comment-actions flex flex-wrap justify-end gap-3 pt-2',
          '[&_button]:min-h-11 [&_button]:p-[10px_20px]',
        ].join(' ')}
      >
        <button
          type="button"
          className={[
            'app-secondary min-h-11 p-[10px_18px] rounded-full [background:var(--color-tilly-surface)] inline-flex gap-2 items-center justify-center text-[14px]',
            'max-[700px]:[.profile-biography_>_&]:ml-[auto]',
          ].join(' ')}
          onClick={() => setOpen(false)}
        >
          {t("common.cancel")}</button>
        <button
          type="submit"
          className={
            'app-primary min-h-11.5 mt-3 rounded-[6px] [background:var(--color-tilly-accent)] [color:var(--color-tilly-on-signal)] inline-flex place-items-center p-[10px_20px] text-[14px] items-center justify-center gap-2'
          }
          disabled={
            busy ||
            existing.busy ||
            !!existing.error ||
            (!text.trim() && !tags.length)
          }
        >
          {busy ? t("common.saving") : t('observe.save')}
        </button>
      </div>
    </form>
  )
  return (
    <>
      {saved && (
        <span className="sr-only" role="status">
          {t("web-app.commentSaved")}</span>
      )}
      {mobile ? (
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>{trigger}</SheetTrigger>
          <SheetContent
            className="catch-comment-sheet"
            aria-describedby={undefined}
          >
            <SheetTitle className="pr-11 text-xl font-semibold">
              {t("social.comment")}</SheetTitle>
            {form}
          </SheetContent>
        </Sheet>
      ) : (
        <Popover.Root open={open} onOpenChange={setOpen}>
          <Popover.Trigger asChild>{trigger}</Popover.Trigger>
          <Popover.Portal>
            <Popover.Content
              className={[
                'catch-comment-bubble z-60 w-[min(360px,_calc(100vw_-_32px))] p-5 [border:1px_solid_var(--color-tilly-border)] rounded-[var(--radius-photo,_12px)] [background:var(--color-tilly-bg)] [color:var(--color-tilly-text)] [box-shadow:0_8px_28px_#0003] font-sans text-[14px] leading-[1.5]',
                '[&_form]:grid [&_form]:gap-3',
                '[&_fieldset]:flex [&_fieldset]:flex-wrap [&_fieldset]:gap-2.5',
                '[&_textarea]:min-h-25 [&_textarea]:[border:1px_solid_var(--color-tilly-border)] [&_textarea]:rounded-[6px] [&_textarea]:p-3 [&_textarea]:w-full',
              ].join(' ')}
              sideOffset={8}
              align="start"
              aria-label={t('social.comment')}
            >
              {form}
              <Popover.Arrow />
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      )}
    </>
  )
}
