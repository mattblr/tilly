import { qualityLabel } from './copy'
import { useAppCopy } from '~/features/app/copy'
import { useState } from 'react'
import {
  ask,
  create,
  everyRow,
  remove,
  sets,
  update,
  type Book,
  type App,
  type Grant,
  type Profile,
  type Tag,
} from './api'
import {
  Action,
  Choice,
  Confirm,
  Empty,
  LoadState,
  TextField,
  useLoad,
} from './shared'
import { Button } from '~/features/console/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '~/features/console/components/ui/dialog'

export function Words() {
  const t = useAppCopy()
  const state = useLoad(async () =>
    (
      await everyRow<Book>(
        'uiCopies',
        '_id _naturalKey entries { _id key value }',
      )
    ).sort((a, b) => a._naturalKey.localeCompare(b._naturalKey)),
  )
  const [selected, setSelected] = useState('')
  const [locale, setLocale] = useState('')
  const locales = useLoad(
    async () =>
      (
        await ask<{
          locales: { code: string; displayName: string; isDefault: boolean }[]
        }>('query { locales { code displayName isDefault } }')
      ).locales,
  )

  const book = state.data?.find((b) => b._id === selected) ?? state.data?.[0]
  return (
    <>
      <LoadState
        loading={state.loading && !state.data}
        error={state.error}
        retry={state.reload}
      />
      {state.data && (
        <div
          className={[
            'words-layout grid [grid-template-columns:250px_minmax(0,_580px)] gap-12',
            'max-[760px]:[grid-template-columns:1fr] max-[760px]:gap-5',
          ].join(' ')}
        >
          <div
            className={[
              'section-intro',
              '[&_p]:text-[13px] [&_p]:[color:var(--muted-foreground)] [&_p]:m-[8px_0_24px]',
              'max-[760px]:[&_p]:mb-3.5',
            ].join(' ')}
          >
            <h2>{t("console.appAndWebsiteCopy")}</h2>
            <Choice
              label={t("console.locale")}
              value={locale || '__source'}
              onChange={(value) => setLocale(value === '__source' ? '' : value)}
              options={[
                { value: '__source', label: t("console.sourceLanguage") },
                ...(locales.data ?? [])
                  .filter((item) => !item.isDefault)
                  .map((item) => ({
                    value: item.code,
                    label: item.displayName || item.code,
                  })),
              ]}
            />
            {locales.error && <p role="alert">{locales.error}</p>}
            <p>
              {t("console.copyPlaceholders", {placeholder:'{braces}'})}</p>
            <Choice
              label={t("console.section")}
              value={book?._id ?? ''}
              onChange={setSelected}
              options={state.data.map((b) => ({
                value: b._id,
                label: b._naturalKey,
              }))}
            />
          </div>
          {book ? (
            <CopyEditor
              key={`${book._id}:${locale}`}
              book={book}
              locale={locale}
            />
          ) : (
            <Empty>{t("console.noCopySectionsYet")}</Empty>
          )}
        </div>
      )}
    </>
  )
}

function CopyEditor({ book, locale }: { book: Book; locale: string }) {
  const t = useAppCopy()
  const localized = useLoad(async () => {
    const result = await ask<{ uiCopy: Book }>(
      'query W($id: String, $locale: String) { uiCopy(id: $id, locale: $locale) { entries { _id key value } } }',
      { id: book._id, locale: locale || null },
    )
    return result.uiCopy.entries
  })
  const projectConsole = import.meta.env.VITE_FOIR_CONSOLE_URL?.replace(
    /\/$/,
    '',
  )
  const editorUrl = projectConsole
    ? `${projectConsole}/r/ui-copy/${encodeURIComponent(book._naturalKey || book._id)}${book._naturalKey ? '' : '?by=id'}`
    : ''
  return (
    <div className={'copy-fields grid gap-4.5'}>
      <p
        className={[
          'help [color:var(--muted-foreground)] text-[12px] m-0 leading-[1.6]',
          '[.recipe_>_&]:mt-[-8px]',
        ].join(' ')}
      >
        {t("console.thisPreviewFollowsFIrsLocaleFallbacksOpenThe")}</p>
      {editorUrl ? (
        <Button asChild variant="outline">
          <a href={editorUrl} target="_blank" rel="noopener noreferrer">
            {t("console.editWordsInFIr")}</a>
        </Button>
      ) : (
        <p
          className={[
            'help [color:var(--muted-foreground)] text-[12px] m-0 leading-[1.6]',
            '[.recipe_>_&]:mt-[-8px]',
          ].join(' ')}
        >
          {t("console.setViteFoirConsoleUrlToThisProjectsConsole")}</p>
      )}
      <Action work={localized.reload}>{t("console.reloadWords")}</Action>
      <LoadState
        loading={localized.loading}
        error={localized.error}
        retry={localized.reload}
      />
      {(localized.data ?? []).map((entry) => (
        <TextField
          key={entry.key}
          label={entry.key}
          value={entry.value ?? ''}
          disabled
        />
      ))}
    </div>
  )
}

const settings = [
  ['clusterAt', "console.groupPins", "explore.cat.other"],
  ['nearYouMeters', "console.nearYouRadius", "console.unitMetres"],
  ['nearYouHours', "console.nearYouWindow", "console.unitHours"],
  ['nearMeMeters', "console.nearMeRadius", "console.unitMetres"],
  ['trendingPerCat', "console.trendingPosts", "console.unitPosts"],
] as const

export function Settings() {
  const t = useAppCopy()
  const state = useLoad(
    async () =>
      (
        await ask<{ appSettings: App }>(
          `query { appSettings(naturalKey: "app") { _id ${settings.map(([key]) => key).join(' ')} artModel artQuality } }`,
        )
      ).appSettings,
  )
  return (
    <>
      <LoadState
        loading={!state.data && state.loading}
        error={state.error}
        retry={state.reload}
      />
      {state.data && <AppEditor app={state.data} />}
      {!state.loading && !state.error && !state.data && (
        <Empty>{t("console.appSettingsHaveNotBeenCreated")}</Empty>
      )}
    </>
  )
}

function AppEditor({ app }: { app: App }) {
  const t = useAppCopy()
  const [values, setValues] = useState(
    Object.fromEntries(settings.map(([key]) => [key, String(app[key] ?? '')])),
  )
  const [model, setModel] = useState(app.artModel ?? '')
  const [quality, setQuality] = useState(app.artQuality ?? 'low')
  return (
    <div className="settings-page">
      <div
        className={[
          'setting-section grid [grid-template-columns:250px_minmax(0,_580px)] gap-12 p-[0_0_28px] m-[0_0_28px] [border-bottom:1px_solid_var(--border)]',
          'max-[760px]:[grid-template-columns:1fr] max-[760px]:gap-5',
        ].join(' ')}
      >
        <div
          className={[
            'section-intro',
            '[&_p]:text-[13px] [&_p]:[color:var(--muted-foreground)] [&_p]:m-[8px_0_24px]',
            'max-[760px]:[&_p]:mb-3.5',
          ].join(' ')}
        >
          <h2>{t("console.discovery")}</h2>
          <p>{t("console.howCatchesAreGroupedAndFoundOnTheMap")}</p>
        </div>
        <div
          className={[
            'settings-fields grid [grid-template-columns:repeat(2,_minmax(0,_1fr))] gap-5',
            'max-[420px]:[grid-template-columns:1fr]',
          ].join(' ')}
        >
          {settings.map(([key, label, unit]) => (
            <TextField
              key={key}
              label={t("console.fieldWithUnit", {label:t(label),unit:t(unit)})}
              value={values[key]}
              onChange={(value) =>
                setValues((old) => ({ ...old, [key]: value }))
              }
              type="number"
              min={1}
            />
          ))}
        </div>
      </div>
      <div
        className={[
          'setting-section grid [grid-template-columns:250px_minmax(0,_580px)] gap-12 p-[0_0_28px] m-[0_0_28px] [border-bottom:1px_solid_var(--border)]',
          'max-[760px]:[grid-template-columns:1fr] max-[760px]:gap-5',
        ].join(' ')}
      >
        <div
          className={[
            'section-intro',
            '[&_p]:text-[13px] [&_p]:[color:var(--muted-foreground)] [&_p]:m-[8px_0_24px]',
            'max-[760px]:[&_p]:mb-3.5',
          ].join(' ')}
        >
          <h2>{t("console.art")}</h2>
          <p>{t("console.usedForNewDrawingsExistingArtStaysAsIt")}</p>
        </div>
        <div
          className={[
            'settings-fields grid [grid-template-columns:repeat(2,_minmax(0,_1fr))] gap-5',
            'max-[420px]:[grid-template-columns:1fr]',
          ].join(' ')}
        >
          <TextField label={t("console.model")} value={model} onChange={setModel} />
          <Choice
            label={t("console.quality")}
            value={quality}
            onChange={setQuality}
            options={['low', 'medium', 'high'].map((value) => ({
              value,
              label: qualityLabel(value,t),
            }))}
          />
        </div>
      </div>
      <Action
        primary
        work={async () => {
          if (
            settings.some(
              ([key]) =>
                !Number.isFinite(Number(values[key])) ||
                Number(values[key]) <= 0,
            )
          )
            throw new Error('Use a positive number for each discovery setting.')
          if (!model.trim()) throw new Error('Add an art model.')
          await update(
            'AppSettings',
            app._id,
            sets({
              ...Object.fromEntries(
                settings.map(([key]) => [key, Number(values[key])]),
              ),
              artModel: model.trim(),
              artQuality: quality,
            }),
          )
        }}
      >
        {t("console.saveSettings")}</Action>
    </div>
  )
}

export function Tags() {
  const t = useAppCopy()
  const state = useLoad(async () =>
    (await everyRow<Tag>('noteTags', '_id label position')).sort(
      (a, b) => a.position - b.position,
    ),
  )
  return (
    <>
      <div
        className={[
          'section-toolbar flex items-center justify-between gap-4 min-h-9 mb-4',
          'max-[420px]:[align-items:start]',
        ].join(' ')}
      >
        <p
          className={[
            'help [color:var(--muted-foreground)] text-[12px] m-0 leading-[1.6]',
            '[.recipe_>_&]:mt-[-8px]',
          ].join(' ')}
        >
          {t("console.moodsUsersCanAddToACatchInDisplay")}</p>
        <TagEditor
          position={
            Math.max(0, ...(state.data ?? []).map((t) => t.position)) + 1
          }
          reload={state.reload}
        />
      </div>
      <LoadState
        loading={!state.data && state.loading}
        error={state.error}
        retry={state.reload}
      />
      {state.data && (
        <div className={'tag-list max-w-[760px]'}>
          {state.data.map((tag) => (
            <div
              className={[
                'tag-line flex gap-5 items-center p-[12px_0] [border-bottom:1px_solid_var(--border)]',
                '[&_strong]:font-normal [&_strong]:flex-1',
              ].join(' ')}
              key={tag._id}
            >
              <span
                className={
                  'position [color:var(--muted-foreground)] [font-variant-numeric:tabular-nums] min-w-5.5'
                }
              >
                {tag.position}
              </span>
              <strong>{tag.label}</strong>
              <TagEditor tag={tag} reload={state.reload} />
            </div>
          ))}
        </div>
      )}
      {state.data?.length === 0 && <Empty>{t("console.noMoodTagsYet")}</Empty>}
    </>
  )
}

function TagEditor({
  tag,
  position = 1,
  reload,
}: {
  tag?: Tag
  position?: number
  reload: () => Promise<void>
}) {
  const t = useAppCopy()
  const [open, setOpen] = useState(false)
  const [label, setLabel] = useState(tag?.label ?? '')
  const [order, setOrder] = useState(String(tag?.position ?? position))
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        setOpen(value)
        if (value) {
          setLabel(tag?.label ?? '')
          setOrder(String(tag?.position ?? position))
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant={tag ? 'ghost' : 'outline'} size="sm">
          {tag ? t("console.edit") : t("console.addTag")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {tag ? t("console.editName", {name:tag.label}) : t("console.addAMoodTag")}
          </DialogTitle>
          <DialogDescription>
            {t("console.usersSeeThisOnWhatDidYouNotice")}</DialogDescription>
        </DialogHeader>
        <TextField label={t("console.label")} value={label} onChange={setLabel} />
        <TextField
          label={t("console.position")}
          value={order}
          onChange={setOrder}
          type="number"
          min={0}
        />
        <Action
          primary
          work={async () => {
            if (
              !label.trim() ||
              !Number.isInteger(Number(order)) ||
              Number(order) < 0
            )
              throw new Error('Add a label and a whole-number position.')
            const values = { label: label.trim(), position: Number(order) }
            if (tag) await update('NoteTag', tag._id, sets(values))
            else await create('NoteTag', values)
            setOpen(false)
            await reload()
            return ''
          }}
        >
          {t("console.saveTag")}</Action>
        {tag && (
          <Confirm
            title={t("console.removeTagNamed", {name:tag.label})}
            description={t("console.usersWillNoLongerBeOfferedThisTagOn")}
            work={async () => {
              await remove('NoteTag', tag._id)
              setOpen(false)
              await reload()
            }}
          >
            <Button
              variant="ghost"
              className={
                'destructive-link [color:var(--destructive)] text-[12px] [overflow-wrap:anywhere]'
              }
            >
              {t("console.removeTag")}</Button>
          </Confirm>
        )}
      </DialogContent>
    </Dialog>
  )
}

const dateValue = (value: string) =>
  value ? new Date(value).toISOString().slice(0, 10) : ''
const expiresAt = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value))
    throw new Error('Choose an expiry date.')
  // The displayed "through" date includes that whole UTC day.
  return new Date(`${value}T23:59:59.999Z`).toISOString()
}

type SetupStatus = { webhookUrl: string; missing: string[] }

/** Where providers send webhooks, and which provider keys are set (names only). */
function SetupCheck() {
  const t = useAppCopy()
  const [status, setStatus] = useState<SetupStatus | null>(null)
  return (
    <section className={'setup-check grid gap-3 mb-8 max-w-[720px]'}>
      <h2 className={'text-[14px] font-semibold m-0'}>{t("console.setup")}</h2>
      <p
        className={
          'help [color:var(--muted-foreground)] text-[12px] m-0 leading-[1.6]'
        }
      >
        {t("console.setupHelp")}
      </p>
      <Action
        work={async () => {
          const answer = await ask<{
            executeTillySetupStatus: {
              result: { ok?: boolean | null; webhookUrl?: string | null; missing?: string[] | null } | null
              execution: { status: string; error?: string | null }
            }
          }>(
            'mutation SetupStatus { executeTillySetupStatus { result { ok webhookUrl missing } execution { status error } } }',
          )
          const run = answer.executeTillySetupStatus
          if (!run?.result?.ok)
            throw new Error(run?.execution?.error || t("console.setupFailed"))
          setStatus({
            webhookUrl: run.result.webhookUrl ?? '',
            missing: run.result.missing ?? [],
          })
        }}
      >
        {t("console.checkSetup")}
      </Action>
      {status && (
        <>
          <label className={'grid gap-1 text-[12px]'}>
            {t("console.webhookAddress")}
            <input
              readOnly
              value={status.webhookUrl || t("console.noWebhookAddress")}
              onFocus={(event) => event.currentTarget.select()}
              className={
                'font-mono text-[12px] h-9 px-3 rounded-[6px] [border:1px_solid_var(--border)] [background:var(--muted)]'
              }
            />
          </label>
          <p className={'text-[12px] m-0'}>
            {status.missing.length
              ? `${t("console.missingKeys")} ${status.missing.join(', ')}`
              : t("console.allKeysSet")}
          </p>
        </>
      )}
    </section>
  )
}

export function Premium() {
  const t = useAppCopy()
  const state = useLoad(async () => {
    const grants = await everyRow<Grant>(
      'premiumGrants',
      '_id _ownerId until note',
    )
    const owners = [...new Set(grants.map((g) => g._ownerId).filter(Boolean))]
    const profiles = owners.length
      ? await everyRow<Profile>(
          'profiles',
          '_ownerId username displayName',
          `where: { ownerId: { in: ${JSON.stringify(owners)} } }, `,
        )
      : []
    return {
      grants: grants.sort((a, b) =>
        (b.until ?? '').localeCompare(a.until ?? ''),
      ),
      profiles,
    }
  })
  return (
    <>
      <SetupCheck />
      <div
        className={[
          'section-toolbar flex items-center justify-between gap-4 min-h-9 mb-4',
          'max-[420px]:[align-items:start]',
        ].join(' ')}
      >
        <p
          className={[
            'help [color:var(--muted-foreground)] text-[12px] m-0 leading-[1.6]',
            '[.recipe_>_&]:mt-[-8px]',
          ].join(' ')}
        >
          {t("console.freeGrantsAndSubscriptionAccess")}</p>
        <GrantEditor reload={state.reload} />
      </div>
      <LoadState
        loading={!state.data && state.loading}
        error={state.error}
        retry={state.reload}
      />
      {state.data && (
        <div className={'table-scroll overflow-x-auto'}>
          <table>
            <thead>
              <tr>
                <th>{t("profile.user")}</th>
                <th>{t("console.source")}</th>
                <th>{t("console.throughUtc")}</th>
                <th>{t("console.status")}</th>
                <th>
                  <span className="sr-only">{t("console.actions")}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {state.data.grants.map((grant) => {
                const profile = state.data?.profiles.find(
                  (p) => p._ownerId === grant._ownerId,
                )
                const name =
                  profile?.displayName || profile?.username || grant._ownerId
                const subscription = grant.note === 'Subscription'
                return (
                  <tr key={grant._id}>
                    <td>
                      <strong>{name}</strong>
                      {profile?.username && <small>@{profile.username}</small>}
                    </td>
                    <td>
                      {subscription
                        ? t("console.subscription")
                        : grant.note || t("console.freeGrant")}
                    </td>
                    <td
                      className={
                        'tabular [font-variant-numeric:tabular-nums] whitespace-nowrap'
                      }
                    >
                      {dateValue(grant.until) || '—'}
                    </td>
                    <td>
                      {Date.parse(grant.until) > Date.now()
                        ? t("premium.row.have")
                        : t("console.lapsed")}
                    </td>
                    <td>
                      {subscription ? (
                        <span
                          className={[
                            'help [color:var(--muted-foreground)] text-[12px] m-0 leading-[1.6]',
                            '[.recipe_>_&]:mt-[-8px]',
                          ].join(' ')}
                        >
                          {t("console.managedBySubscription")}</span>
                      ) : (
                        <GrantEditor
                          grant={grant}
                          name={name}
                          reload={state.reload}
                        />
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      {state.data?.grants.length === 0 && <Empty>{t("console.noPremiumGrantsYet")}</Empty>}
    </>
  )
}

function GrantEditor({
  grant,
  name,
  reload,
}: {
  grant?: Grant
  name?: string
  reload: () => Promise<void>
}) {
  const t = useAppCopy()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [owner, setOwner] = useState('')
  const [until, setUntil] = useState(
    dateValue(
      grant?.until ?? new Date(Date.now() + 365 * 86400000).toISOString(),
    ),
  )
  const [note, setNote] = useState(grant?.note ?? '')
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        setOpen(value)
        if (value && grant) {
          setUntil(dateValue(grant.until))
          setNote(grant.note ?? '')
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant={grant ? 'ghost' : 'outline'} size="sm">
          {grant ? t("console.edit") : t("console.givePremium")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {grant ? t("console.premiumFor", {name:name ?? t('profile.user')}) : t("console.giveSomeonePremium")}
          </DialogTitle>
          <DialogDescription>
            {t("console.aFreeGrantEndsAfterTheDateYouChoose")}</DialogDescription>
        </DialogHeader>
        {!grant && (
          <>
            <TextField
              label={t("console.usernameStartsWith")}
              value={search}
              onChange={(value) => {
                setSearch(value)
                setProfiles([])
                setOwner('')
              }}
            />
            <Action
              disabled={!search.trim()}
              work={async () => {
                const found = await everyRow<Profile>(
                  'profiles',
                  '_ownerId username displayName',
                  `where: { username: { startsWith: ${JSON.stringify(search.trim().toLowerCase())} } }, `,
                )
                setProfiles(found)
                setOwner(found[0]?._ownerId ?? '')
                return found.length
                  ? t("console.usersFound", {count:String(found.length)})
                  : t("console.noMatchingUsers")
              }}
            >
              {t("console.findUser")}</Action>
            <Choice
              label={t("profile.user")}
              value={owner}
              onChange={setOwner}
              disabled={!profiles.length}
              options={profiles.map((p) => ({
                value: p._ownerId,
                label: `${p.displayName ?? p.username} (@${p.username})`,
              }))}
            />
          </>
        )}
        <TextField
          label={t("console.throughUtc")}
          type="date"
          value={until}
          onChange={setUntil}
        />
        <TextField label={t("safety.reason")} value={note} onChange={setNote} />
        <Action
          primary
          disabled={!grant && !owner}
          work={async () => {
            if (note.trim() === 'Subscription')
              throw new Error(
                'Choose a reason other than “Subscription”; that is reserved for purchases.',
              )
            const values = {
              until:
                grant && dateValue(grant.until) === until
                  ? grant.until
                  : expiresAt(until),
              note: note.trim(),
            }
            if (grant) await update('PremiumGrant', grant._id, sets(values))
            else await create('PremiumGrant', values, owner)
            setOpen(false)
            await reload()
            return ''
          }}
        >
          {grant ? t("console.saveGrant") : t("console.givePremium")}
        </Action>
        {grant && (
          <Confirm
            title={t("console.removePremiumNamed", {name:name ?? t('profile.user')})}
            description={t("console.thisRemovesTheFreeGrantASeparateSubscriptionIf")}
            work={async () => {
              await remove('PremiumGrant', grant._id)
              setOpen(false)
              await reload()
            }}
          >
            <Button
              variant="ghost"
              className={
                'destructive-link [color:var(--destructive)] text-[12px] [overflow-wrap:anywhere]'
              }
            >
              {t("console.removeGrant")}</Button>
          </Confirm>
        )}
      </DialogContent>
    </Dialog>
  )
}
