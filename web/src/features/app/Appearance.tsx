import {useEffect,useRef,useState} from 'react'
import {useAppSession} from './session'
import {useAppCopy} from './copy'
import {useResource} from './use-resource'
import {runAppOperation} from './operations'
import {friendlyError} from '~/lib/failures'
import {appearanceConsentVersion} from '../../server/operations/appearance-contract'
import {evidenceFromGroups,evidenceShares} from '~/lib/appearance-evidence'
const primaryAction='min-h-11 rounded-full bg-tilly-accent px-5 py-3 text-sm text-tilly-on-signal disabled:opacity-60'
const secondaryAction='min-h-11 rounded-full border border-tilly-border px-5 py-3 text-sm disabled:opacity-60'

export function AppearancePreferences() {
  const {client,user}=useAppSession(),t=useAppCopy(),pending=useRef(false)
  const [consent,setConsent]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState('')
  const state=useResource(async()=>{
    const answer=await client.raw<{appSettings:{appearanceEligibility:string|null}|null;myAppearanceAccount:{enabled:boolean|null;consentVersion:string|null}|null;myPremiumGrants:{totalCount:number}}>(
      'query AppearanceOptions($now: DateTime) { appSettings(naturalKey: "app") { appearanceEligibility } myAppearanceAccount { enabled consentVersion } myPremiumGrants(first: 1, where: {until: {gt: $now}}) { totalCount } }',{now:new Date().toISOString()})
    return {available:['regular','premium'].includes(answer.appSettings?.appearanceEligibility??''),
      eligible:answer.appSettings?.appearanceEligibility==='regular'||answer.myPremiumGrants.totalCount>0,
      enabled:answer.myAppearanceAccount?.enabled===true&&answer.myAppearanceAccount.consentVersion===appearanceConsentVersion}
  },[client,user?.id])
  async function save(enabled:boolean) {
    if(pending.current) return
    pending.current=true;setBusy(true);setMessage('')
    try {
      await runAppOperation(client,'execute.save_appearance_preferences',{enabled,...(enabled?{consentVersion:appearanceConsentVersion}:{})})
      state.reload();setConsent(false);setMessage(t('appearance.settings.saved'))
    } catch(error){setMessage(friendlyError(error,t))}
    finally{pending.current=false;setBusy(false)}
  }
  return <section className="mt-12 max-w-[480px]" aria-labelledby="appearance-settings-title">
    <h2 id="appearance-settings-title" className="mb-3 text-xl font-semibold">{t('appearance.action')}</h2>
    <p className="mb-3 text-sm">{t('appearance.consent.body',{provider:'OpenAI'})}</p>
    <p className="mb-4 text-sm text-tilly-text-secondary">{t('appearance.consent.note')}</p>
    {state.error?<p role="alert">{state.error} <button onClick={state.reload}>{t('errors.retry')}</button></p>:!state.data?<p role="status">{t('appearance.settings.loading')}</p>:
      state.data.enabled?<button disabled={busy} className={secondaryAction} onClick={()=>void save(false)}>{t('appearance.settings.off')}</button>:
      state.data.available&&state.data.eligible?<>
        {!consent?<button disabled={busy} className={secondaryAction} onClick={()=>setConsent(true)}>{t('appearance.action')}</button>:
          <fieldset disabled={busy} className="grid gap-3 rounded-xl border border-tilly-border p-4">
            <legend>{t('appearance.consent.title')}</legend>
            <p className="text-sm">{t('appearance.consent.body',{provider:'OpenAI'})}</p>
            <p className="text-sm">{t('appearance.consent.note')}</p>
            <button className={primaryAction} onClick={()=>void save(true)}>{t('appearance.consent.send')}</button>
            <button className={secondaryAction} onClick={()=>setConsent(false)}>{t('appearance.consent.cancel')}</button>
          </fieldset>}
      </>:<p className="text-sm text-tilly-text-secondary">{t(state.data.available?'appearance.premium':'appearance.settings.unavailable')}</p>}
    {message&&<p className="mt-3 text-sm" role="status">{message}</p>}
  </section>
}

/** Asked once at the end of first-time setup. Suggestions send a photo to a
 * provider, so they stay off until the user says yes; settings can change it. */
export function AppearanceChoice({onDone}:{onDone:()=>void}) {
  const {client,user}=useAppSession(),t=useAppCopy(),pending=useRef(false)
  const [busy,setBusy]=useState(false),[message,setMessage]=useState('')
  const state=useResource(async()=>{
    const answer=await client.raw<{appSettings:{appearanceEligibility:string|null}|null;myAppearanceAccount:{enabled:boolean|null;consentVersion:string|null}|null;myPremiumGrants:{totalCount:number}}>(
      'query AppearanceOptions($now: DateTime) { appSettings(naturalKey: "app") { appearanceEligibility } myAppearanceAccount { enabled consentVersion } myPremiumGrants(first: 1, where: {until: {gt: $now}}) { totalCount } }',{now:new Date().toISOString()})
    const available=['regular','premium'].includes(answer.appSettings?.appearanceEligibility??'')
    const eligible=answer.appSettings?.appearanceEligibility==='regular'||answer.myPremiumGrants.totalCount>0
    const enabled=answer.myAppearanceAccount?.enabled===true&&answer.myAppearanceAccount.consentVersion===appearanceConsentVersion
    return available&&eligible&&!enabled
  },[client,user?.id])
  useEffect(()=>{ if(state.data===false||state.error) onDone() },[state.data,state.error,onDone])
  async function enable() {
    if(pending.current) return
    pending.current=true;setBusy(true);setMessage('')
    try { await runAppOperation(client,'execute.save_appearance_preferences',{enabled:true,consentVersion:appearanceConsentVersion}); onDone() }
    catch(error){setMessage(friendlyError(error,t))}
    finally{pending.current=false;setBusy(false)}
  }
  if(!state.data) return <p role="status">{t('appearance.settings.loading')}</p>
  return <fieldset disabled={busy} className="grid gap-3 rounded-xl border border-tilly-border p-4">
    <legend className="text-lg font-semibold">{t('appearance.consent.title')}</legend>
    <p className="text-sm">{t('appearance.consent.body',{provider:'OpenAI'})}</p>
    <p className="text-sm text-tilly-text-secondary">{t('appearance.consent.note')}</p>
    <button type="button" className={primaryAction} onClick={()=>void enable()}>{t('appearance.consent.send')}</button>
    <button type="button" className={secondaryAction} onClick={onDone}>{t('appearance.consent.cancel')}</button>
    {message&&<p className="text-sm" role="alert">{message}</p>}
  </fieldset>
}

export function AppearanceSuggestion({catId}:{catId:string}) {
  const {client,revision}=useAppSession(),t=useAppCopy()
  const state=useResource(async()=>{
    const answer=await client.raw<{appearanceVoteAggregate:{truncated:boolean;groups:{key:unknown;count:number}[]}}>('query PublicCatAppearance($id: String) { appearanceVoteAggregate(where: {catKey: {eq: $id}}, groupBy: DIMENSION, limit: 258) { truncated groups { key count } } }',{id:catId})
    return evidenceFromGroups(answer.appearanceVoteAggregate.groups,answer.appearanceVoteAggregate.truncated)
  },[client,catId,revision])
  const evidence=state.data
  if(!evidence)return null
  const breeds=evidenceShares(evidence.breeds),patterns=evidenceShares(evidence.patterns)
  return <aside className="my-4 grid gap-3" aria-label={t('appearance.title')}>
    {breeds[0]&&<span className="w-fit rounded-full bg-tilly-accent/15 px-3 py-1.5 text-sm font-semibold">{t('appearance.looksLike',{breed:breeds[0].label})}</span>}
    {[breeds,patterns].map((rows,index)=>rows.length>0&&<div key={index} className="grid max-w-sm gap-2">
      {index===1&&<p className="text-xs text-tilly-text-secondary">{t('appearance.pattern')}</p>}
      {rows.map(row=><div key={row.label} className="grid gap-1 text-xs">
        <div className="flex justify-between gap-4"><span>{index===1?t(`appearance.pattern.${row.label}`):row.label} ×{row.count}</span><span>{row.percent}%</span></div>
        <div role="meter" aria-label={row.label} aria-valuenow={row.percent} aria-valuemin={0} aria-valuemax={100} className="h-1.5 overflow-hidden rounded-full bg-tilly-border"><div className="h-full rounded-full bg-tilly-accent" style={{width:`${row.percent}%`}} /></div>
      </div>)}
    </div>)}
    <p className="text-xs text-tilly-text-secondary">{t(evidence.samples===1?'appearance.evidence.one':'appearance.evidence.other',{count:String(evidence.samples)})}</p>
  </aside>
}
