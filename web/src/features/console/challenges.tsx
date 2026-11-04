import { useAppCopy } from '~/features/app/copy'
import { useId, useState } from 'react'
import type { PlacementSession } from '@foir/sdk/placement'
import { collectConnection } from '~/features/app/paging'
import { Action, Area, Choice, Empty, LoadState, TextField, useLoad } from './shared'
import { Button } from './components/ui/button'

type Challenge = {
  _id: string; _naturalKey: string; title: string; description: string; icon: string
  enabled: boolean; startsAt: string; endsAt: string; criteriaVersion: string
  criteria: string; highlightKey: string; targetCount: number; modelVersion: string
}
type Draft = Omit<Challenge, '_id' | 'enabled'>
type TypeRef = { kind: string; name: string | null; ofType?: TypeRef | null }
type SchemaField = { name: string; type: TypeRef; args: { name: string; type: TypeRef }[] }
type Capabilities = { create: boolean; publish: boolean; naturalKeyField: 'naturalKey' | '_naturalKey' | null }
const fields = '_id _naturalKey title description icon enabled startsAt endsAt criteriaVersion criteria highlightKey targetCount modelVersion'
const keyPattern = /^[a-z][a-z0-9-]{0,39}$/
const model = 'gpt-6-luna'
const emptyDraft = (): Draft => {
  const naturalKey = `photo-${crypto.randomUUID().replaceAll('-', '')}`
  return { _naturalKey: naturalKey, title: '', description: '', icon: 'camera', startsAt: '', endsAt: '',
    criteriaVersion: `v1-${crypto.randomUUID().slice(0, 12)}`, criteria: '', highlightKey: naturalKey, targetCount: 1, modelVersion: model }
}
const named = (type: TypeRef): string | null => type.name || (type.ofType ? named(type.ofType) : null)

/** Validate before the scoped write; the operation independently validates rules. */
export function validateChallengeDraft(draft: Draft, _legacyHighlights: readonly unknown[] = [], existing: readonly Challenge[] = []) {
  if (!keyPattern.test(draft._naturalKey)) throw new Error('Use a challenge key of up to 40 lowercase letters, numbers and hyphens, starting with a letter.')
  if (existing.some(row => row._naturalKey === draft._naturalKey)) throw new Error('Use a new challenge key. Existing challenge rules cannot be replaced here.')
  if (!/^[a-zA-Z0-9-]{1,80}$/.test(draft.criteriaVersion)) throw new Error('Give these rules a version using letters, numbers and hyphens.')
  if (!draft.title.trim() || draft.title.length > 120 || !draft.description.trim() || draft.description.length > 500)
    throw new Error('Add a title of up to 120 characters and a description of up to 500 characters.')
  if (!draft.criteria.trim() || draft.criteria.length > 1200) throw new Error('Describe the visible qualification criteria in up to 1,200 characters.')
  const start = Date.parse(`${draft.startsAt}Z`), end = Date.parse(`${draft.endsAt}Z`)
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(draft.startsAt) || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(draft.endsAt) ||
    !Number.isFinite(start) || !Number.isFinite(end) || new Date(start).toISOString().slice(0, 16) !== draft.startsAt || new Date(end).toISOString().slice(0, 16) !== draft.endsAt || end <= start || end - start > 31 * 24 * 60 * 60 * 1000)
    throw new Error('Choose a valid UTC start and a later end, no more than 31 days apart.')
  if (!Number.isInteger(draft.targetCount) || draft.targetCount < 1 || draft.targetCount > 30) throw new Error('A badge needs between 1 and 30 distinct qualifying captures.')
  if (draft.modelVersion !== model || !['selfie', 'camera', 'postbox', 'sparkles'].includes(draft.icon)) throw new Error('Choose an approved model and badge icon.')
  if (draft.highlightKey !== draft._naturalKey) throw new Error('This challenge’s highlight must use its generated challenge key.')
  return { _naturalKey: draft._naturalKey, title: draft.title, description: draft.description, icon: draft.icon,
    startsAt: new Date(start).toISOString(), endsAt: new Date(end).toISOString(), criteriaVersion: draft.criteriaVersion,
    criteria: draft.criteria, highlightKey: draft.highlightKey, targetCount: draft.targetCount, modelVersion: draft.modelVersion, enabled: false }
}

async function capabilities(session: PlacementSession): Promise<Capabilities> {
  // Fóir gap (docs/known-gaps.md, "Exact-version publication"): the scoped
  // placement can publish but can't look up versions. Here: publication stays
  // closed and challenges are published in Fóir's native editor. Closes when a
  // placement that can publish also gets the version lookup. Never request
  // global record access or add a proxy for the version ID.
  const schema = await session.request<{
    __schema: { mutationType: { fields: SchemaField[] } | null }
    queryType: { fields: SchemaField[] } | null
    __type: { inputFields: { name: string; type: TypeRef }[] } | null
  }>(`query ChallengeEditorContract {
    __schema { mutationType { fields { name args { name type { kind name ofType { kind name } } } type { kind name ofType { kind name } } } } }
    queryType: __type(name: "Query") { fields { name args { name type { kind name ofType { kind name } } } type { kind name ofType { kind name } } } }
    __type(name: "CreatePhotoChallengeInput") { inputFields { name type { kind name ofType { kind name } } } }
  }`)
  const input = schema.__type?.inputFields ?? []
  const naturalKeyField = input.some(field => field.name === 'naturalKey') ? 'naturalKey'
    : input.some(field => field.name === '_naturalKey') ? '_naturalKey' : null
  const mutation = schema.__schema.mutationType?.fields.find(field => field.name === 'createPhotoChallenge')
  const required = ['title', 'description', 'icon', 'enabled', 'startsAt', 'endsAt', 'criteriaVersion', 'criteria', 'highlightKey', 'targetCount', 'modelVersion']
  const publish = schema.__schema.mutationType?.fields.some(field => field.name === 'publishPhotoChallengeVersion' && field.args.some(arg => arg.name === 'versionId' && named(arg.type) === 'String')) === true &&
    schema.queryType?.fields.some(field => field.name === 'recordVersions' && field.args.some(arg => arg.name === 'parentId' && named(arg.type) === 'String')) === true
  return { naturalKeyField, publish, create: !!naturalKeyField && !!mutation?.args.some(arg => arg.name === 'input' && named(arg.type) === 'CreatePhotoChallengeInput') &&
    required.every(name => input.some(field => field.name === name)) }
}
function matches(candidate: Record<string, unknown> | Challenge, expected: Record<string, unknown>) {
  return Object.entries(expected).every(([key, value]) => {
    const actual = (candidate as Record<string, unknown>)[key]
    if (key === 'startsAt' || key === 'endsAt') return typeof actual === 'string' && Date.parse(actual) === Date.parse(String(value))
    return actual === value
  })
}
async function draftVersion(session: PlacementSession, id: string, values: Record<string, unknown>) {
  const result = await session.request<{
    photoChallenge: Challenge | null
    draft: Challenge | null
    recordVersions: { edges: { node: { id: string; data: unknown } }[]; pageInfo: { hasNextPage: boolean } }
  }>(`query ChallengePublicationReview($id: String!) {
    photoChallenge(id: $id, preview: false) { _id }
    draft: photoChallenge(id: $id, preview: true) { ${fields} }
    recordVersions(parentId: $id, first: 2) { edges { node { id data } } pageInfo { hasNextPage } }
  }`, { id })
  if (result.photoChallenge) throw new Error('This challenge is already published. Reload the catalogue before making a new version.')
  if (!result.draft || !matches(result.draft, values)) throw new Error('The draft changed since review. Reload before publishing.')
  const rows = result.recordVersions?.edges ?? []
  if (result.recordVersions?.pageInfo.hasNextPage || rows.length !== 1) throw new Error('The draft has additional edits. Reload and review its latest version before publishing.')
  const version = rows[0].node
  const data = typeof version.data === 'string' ? JSON.parse(version.data) : version.data
  if (!data || typeof data !== 'object' || !matches(data, values) || typeof version.id !== 'string' || !version.id)
    throw new Error('The exact draft version could not be verified. Review it in Fóir before publishing.')
  return version.id
}
export function Challenges({ session }: { session: PlacementSession }) {
  const t = useAppCopy()
  const state = useLoad(async () => {
    const [challenges, drafts, contract] = await Promise.all([
      collectConnection<Challenge>(async after => (await session.request<{ photoChallenges: {
        edges: { node: Challenge }[]; pageInfo: { hasNextPage: boolean; endCursor: string | null }
      } }>(`query Challenges($after: String) { photoChallenges(first: 100, after: $after) { pageInfo { hasNextPage endCursor } edges { node { ${fields} } } } }`, { after })).photoChallenges),
      collectConnection<Challenge>(async after => (await session.request<{ photoChallenges: {
        edges: { node: Challenge }[]; pageInfo: { hasNextPage: boolean; endCursor: string | null }
      } }>(`query ChallengeDrafts($after: String) { photoChallenges(first: 100, after: $after, preview: true) { pageInfo { hasNextPage endCursor } edges { node { ${fields} } } } }`, { after })).photoChallenges),
      capabilities(session).catch(() => ({ create: false, publish: false, naturalKeyField: null } as Capabilities)),
    ])
    const publishedIds = new Set(challenges.map(row => row._id))
    return { challenges, drafts: drafts.filter(row => !publishedIds.has(row._id)), contract }
  })
  const [draft, setDraft] = useState<Draft | null>(null)
  const [review, setReview] = useState<Challenge | null>(null)
  return <section className="grid gap-6 min-w-0">
    <div className="flex items-start justify-between gap-4 flex-wrap">
      <p className="m-0 max-w-[650px] [color:var(--muted-foreground)]">{t("console.setAPhotoChallengesDatesVisibleCriteriaAndEarned")}</p>
      <Button variant="outline" onClick={() => { setReview(null); setDraft(emptyDraft()) }}>{t("console.newChallenge")}</Button>
    </div>
    <LoadState loading={state.loading && !state.data} error={state.error} retry={state.reload} />
    {state.data && <>
      <div className="grid gap-3">
        <div className="flex items-center justify-between gap-4"><h2>{t("console.challengeCatalogue")}</h2><Button variant="ghost" onClick={() => void state.reload()}>{t("console.reload")}</Button></div>
        {!state.data.challenges.length ? <Empty>{t("console.noPublishedChallengesYetCreateADraftToSet")}</Empty> :
          <ul className="m-0 p-0 list-none">
            {state.data.challenges.map(row => <li key={row._id} className="grid [grid-template-columns:minmax(0,1fr)_auto] gap-4 py-4 [border-bottom:1px_solid_var(--border)] max-[640px]:[grid-template-columns:1fr]">
              <div className="min-w-0"><h3>{row.title}</h3><p className="m-[4px_0]">{row.description}</p>
                <p className="m-0 text-[12px] [color:var(--muted-foreground)]">{row.enabled ? t("console.evaluationEnabled") : t("console.evaluationDisabled")} · {t("console.challengeDatesProgress", {start:row.startsAt,end:row.endsAt,count:String(row.targetCount),unit:t(row.targetCount===1?'console.capture':'console.captures')})}</p>
                <p className="m-[4px_0_0] text-[12px] [color:var(--muted-foreground)]">{t("console.rules")}{row.criteriaVersion}</p></div>
              <div className="flex items-center gap-4 flex-wrap text-[12px]"><Button variant="outline" onClick={() => { setReview(null); setDraft({ ...row, ...emptyDraft(), title: row.title, description: row.description, icon: row.icon, criteria: row.criteria, targetCount: row.targetCount, startsAt: row.startsAt.slice(0, 16), endsAt: row.endsAt.slice(0, 16) }) }}>{t("console.createNewVersion")}</Button></div>
            </li>)}
          </ul>}
      </div>
      {!!state.data.drafts.length && <div className="grid gap-3">
        <h2>{t("console.unpublishedDrafts")}</h2>
        <ul className="m-0 p-0 list-none">{state.data.drafts.map(row => <li key={row._id} className="flex items-start justify-between gap-4 py-4 [border-bottom:1px_solid_var(--border)] flex-wrap">
          <div className="min-w-0"><h3>{row.title}</h3><p className="m-[4px_0]">{row.description}</p><p className="m-0 text-[12px] [color:var(--muted-foreground)]">{t("console.dateRange", {start:row.startsAt,end:row.endsAt})} · {row.enabled ? t("console.readyForScheduledActivationAfterPublication") : t("console.evaluationDisabled")}</p></div>
          <Button variant="outline" onClick={() => { setDraft(null); setReview(row) }}>{t("console.reviewAndPublish")}</Button>
        </li>)}</ul>
      </div>}
      {(draft || review) && <ChallengeEditor key={review?._id ?? draft!._naturalKey} initial={review ?? draft!} existing={review ?? undefined} session={session} catalogue={state.data.challenges} contract={state.data.contract} done={() => { setDraft(null); setReview(null); void state.reload() }} />}
    </>}
  </section>
}

function ChallengeEditor({ initial, existing, session, catalogue, contract, done }: {
  initial: Draft; existing?: Challenge; session: PlacementSession; catalogue: Challenge[]; contract: Capabilities; done: () => void
}) {
  const t = useAppCopy()
  const [draft, setDraft] = useState(initial)
  const [saved, setSaved] = useState<{ id: string; key: string; values: Record<string, unknown> } | null>(() => {
    if (!existing) return null
    const names: (keyof Challenge)[] = ['title', 'description', 'icon', 'enabled', 'startsAt', 'endsAt', 'criteriaVersion', 'criteria', 'highlightKey', 'targetCount', 'modelVersion']
    return { id: existing._id, key: existing._naturalKey, values: Object.fromEntries(names.map(name => [name, existing[name]])) }
  })
  const [published, setPublished] = useState(false)
  const id = useId()
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft(old => ({ ...old, [key]: value }))
  const canCreate = contract.create && session.can('records:create:photo-challenge')
  return <div className="grid [grid-template-columns:240px_minmax(0,1fr)] gap-6 pt-6 [border-top:1px_solid_var(--border)] max-[760px]:[grid-template-columns:1fr]">
    <div><h2>{existing ? t("console.reviewChallengeDraft") : t("console.newChallengeDraft")}</h2><p className="[color:var(--muted-foreground)]">{t("console.aCatMustBeVisibleAndMeetTheCriteria")}</p>
      <p className="[color:var(--muted-foreground)]">{t("console.toChangeAPublishedChallengeCreateANewVersion")}</p></div>
    {saved ? <div role="status" className="grid gap-4 content-start"><h3>{published ? t("console.challengePublished") : t("console.draftSaved")}</h3><p className="m-0">{published ? t("console.theInvitationAppearsDuringItsScheduledDatesCapturesAre") : t("console.reviewTheInvitationAndDatesThenPublishThisChallenge")}</p>
      {saved.values.enabled !== true && <p className="m-0">{t("console.thisDraftHasEvaluationDisabledPublishingPreservesThatSetting")}</p>}<strong>{saved.values.title as string}</strong><p className="m-0">{saved.values.description as string}</p><p className="m-0 text-[12px]">{t("console.dateRangeUtc", {start:String(saved.values.startsAt),end:String(saved.values.endsAt)})}</p>
      {!published && <Action primary disabled={!contract.publish || !session.can('records:publish:photo-challenge')} work={async () => {
        if (existing) validateChallengeDraft({ ...existing, startsAt: existing.startsAt.slice(0, 16), endsAt: existing.endsAt.slice(0, 16) }, [], [])
        // A lost response after publication must recover without republishing.
        const before = await session.request<{ photoChallenge: Challenge | null }>(`query ExistingPublishedChallenge($id: String) { photoChallenge(id: $id, preview: false) { ${fields} } }`, { id: saved.id })
        if (before.photoChallenge) {
          if (!matches(before.photoChallenge, saved.values)) throw new Error('The published challenge differs from this draft. Reload before continuing.')
          setPublished(true)
          return t("console.published")
        }
        const version = await draftVersion(session, saved.id, saved.values)
        const answer = await session.request<{ publishPhotoChallengeVersion: boolean }>('mutation PublishChallenge($versionId: String!) { publishPhotoChallengeVersion(versionId: $versionId) }', { versionId: version })
        if (answer.publishPhotoChallengeVersion !== true) throw new Error('The challenge was not published.')
        const result = await session.request<{ photoChallenge: Challenge | null }>(`query PublishedChallenge($id: String) { photoChallenge(id: $id) { ${fields} } }`, { id: saved.id })
        if (!result.photoChallenge || !matches(result.photoChallenge, saved.values)) throw new Error('Published challenge readback did not match. Reload before continuing.')
        setPublished(true)
        return t("console.published")
      }}>{t("console.publishChallenge")}</Action>}
      {!published && !contract.publish && <p className="m-0">{t("console.thisConnectionCannotSafelyReviewTheDraftVersionFor")}</p>}<Button variant="outline" onClick={done}>{t("console.closeDraft")}</Button></div> :
      <form className="grid gap-4 min-w-0" onSubmit={event => event.preventDefault()}>
        <TextField label={t("console.challengeTitle")} value={draft.title} onChange={value => set('title', value)} required />
        <Area label={t("console.challengeInvitation")} value={draft.description} onChange={value => set('description', value)} />
        <p className="m-0 text-[12px] [color:var(--muted-foreground)]">{t("console.forExamplePhotographACatBesideAHalloweenPumpkin")}</p>
        <div className="grid grid-cols-2 gap-4 max-[640px]:grid-cols-1">
          <TextField label={t("console.startsAtUtcInclusive")} type="datetime-local" value={draft.startsAt} onChange={value => set('startsAt', value)} required />
          <TextField label={t("console.endsAtUtcExclusive")} type="datetime-local" value={draft.endsAt} onChange={value => set('endsAt', value)} required />
        </div>
        <Area label={t("console.aiCheckingCriteria")} value={draft.criteria} onChange={value => set('criteria', value)} />
        <p className="m-0 text-[12px] [color:var(--muted-foreground)]">{t("console.describeWhatMustBeVisibleTogetherInThePhoto")}</p>
        <div className="grid grid-cols-2 gap-4 max-[640px]:grid-cols-1">
          <TextField label={t("console.distinctCapturesForBadge130")} type="number" min={1} value={draft.targetCount} onChange={value => set('targetCount', Number(value))} />
          <Choice label={t("console.badgeIcon")} value={draft.icon} onChange={value => set('icon', value)} options={[{ value: 'camera', label: t("navigation.camera") }, { value: 'selfie', label: t("selfies.badge") }, { value: 'postbox', label: t("console.postbox") }, { value: 'sparkles', label: t("console.sparkles") }]} />
        </div>
        <div className="rounded-[8px] p-4 [background:var(--muted)]" aria-labelledby={`${id}-preview`}><h3 id={`${id}-preview`}>{t("console.userPreview")}</h3><strong>{draft.title || t("console.challengeTitle")}</strong><p className="m-[4px_0]">{draft.description || t("console.whatToPhotograph")}</p><p className="m-0 text-[12px]">{t(draft.targetCount===1?"console.badgeRequirement.one":"console.badgeRequirement.other", {count:String(draft.targetCount)})}</p></div>
        {!canCreate && <p role="status" className="m-0 [color:var(--muted-foreground)]">{t("console.savingDraftsIsUnavailableInThisConnectionAskA")}</p>}
        <div className="flex items-center gap-4 flex-wrap">
          <Action primary disabled={!canCreate} work={async () => {
            const values = validateChallengeDraft(draft, [], catalogue)
            if (!contract.naturalKeyField) throw new Error('Draft creation is unavailable.')
            const { _naturalKey, ...content } = values
            const prepared = { ...content, enabled: true }
            const result = await session.request<{ createPhotoChallenge: { record: { _id: string } | null } }>(`mutation CreateChallenge($input: CreatePhotoChallengeInput!, $key: String) { createPhotoChallenge(input: $input, idempotencyKey: $key) { record { _id } } }`, { input: { ...prepared, [contract.naturalKeyField]: _naturalKey }, key: `challenge-draft:${_naturalKey}` })
            const created = result.createPhotoChallenge?.record?._id
            if (!created) throw new Error('The challenge draft could not be confirmed.')
            setSaved({ id: created, key: _naturalKey, values: prepared })
            return t("console.draftSaved")
          }}>{t("console.saveDraft")}</Action>
          <Button variant="ghost" type="button" onClick={done}>{t("common.cancel")}</Button>
        </div>
      </form>}
  </div>
}
