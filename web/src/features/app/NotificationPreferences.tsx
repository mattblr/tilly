import { friendlyError } from '~/lib/failures'
import { useState } from 'react'
import { Switch } from '~/components/ui/switch'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '~/components/ui/select'
import { useAppSession } from './session'
import { useAppCopy } from './copy'
import { useResource } from './use-resource'
import { enableWebPush, disableWebPush } from '@foir/sdk/push'

type Settings = { timeZone: string; reminderHour: number; artReady: boolean; streakReminders: boolean; communityUpdates: boolean }
type Preference = { category: string; enabled: boolean; channels: (string | null)[] | null }
const categories = { artReady: 'art_ready', streakReminders: 'streak_reminder', communityUpdates: 'community_updates' } as const
export function NotificationPreferences() {
  const { client, user } = useAppSession(), t = useAppCopy()
  const [values, setValues] = useState<Settings | null>(null), [busy, setBusy] = useState(false), [message, setMessage] = useState('')
  const state = useResource(async () => {
    const result = await client.raw<{ notificationSettingsList: { edges: { node: Settings }[] }; notificationPreferences: Preference[] }>(`query {
      notificationSettingsList: notificationSettingss(first: 1) { edges { node { timeZone reminderHour artReady streakReminders communityUpdates } } }
      notificationPreferences { category enabled channels }
    }`)
    const stored = result.notificationSettingsList.edges[0]?.node
    const next: Settings = stored ?? { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone, reminderHour: 18, artReady: false, streakReminders: false, communityUpdates: false }
    for (const key of Object.keys(categories) as (keyof typeof categories)[]) {
      const preference = result.notificationPreferences.find(p => p.category === categories[key])
      if (preference && (!preference.enabled || !preference.channels?.includes('push'))) next[key] = false
    }
    return next
  }, [client, user?.id])
  const current = values ?? state.data
  async function save() {
    if (!current || busy) return
    setBusy(true); setMessage('')
    try {
      // Revoke delivery before narrowing recipient selection. No recipient id
      // is accepted by this self-service platform mutation.
      const keys = (Object.keys(categories) as (keyof typeof categories)[]).sort((a, b) => Number(current![a]) - Number(current![b]))
      for (const key of keys) for (const channel of ['push', 'in_app']) {
        const changed = await client.raw<{ updateNotificationPreference: boolean }>(`mutation P($input: UpdateNotificationPreferenceInput!) {
          updateNotificationPreference(input: $input)
        }`, { input: { category: categories[key], channel, enabled: current[key] } })
        if (!changed.updateNotificationPreference) throw new Error(t('notifications.failed'))
      }
      const saved = await client.raw<{ executeSaveNotificationSettings: { result: { ok?: boolean } | null } }>(`mutation S($input: SaveNotificationSettingsInput!) {
        executeSaveNotificationSettings(input: $input) { result { ok } }
      }`, { input: current })
      if (saved.executeSaveNotificationSettings.result?.ok !== true) throw new Error(t('notifications.failed'))
      setValues(null); state.reload(); setMessage(t('notifications.saved'))
    } catch (error) { setMessage(friendlyError(error, t)) }
    finally { setBusy(false) }
  }
  return <section className="mt-12 max-w-[480px]" aria-labelledby="notification-title">
    <h2 id="notification-title" className="mb-3 text-xl font-semibold">{t('notifications.title')}</h2>
    <p className="mb-5 text-sm text-tilly-text-secondary">{t('notifications.hint')}</p>
    {state.error ? <p role="alert">{t('notifications.loadFailed')} <button onClick={state.reload}>{t('notifications.retry')}</button></p> : !current ? <p role="status">{t('notifications.loading')}</p> : <fieldset disabled={busy} className="grid gap-5">
      {(Object.keys(categories) as (keyof typeof categories)[]).map(key => <div key={key} className="flex min-h-11 items-center justify-between gap-5">
        <label htmlFor={`notification-${key}`} className="cursor-pointer text-sm">{t(`notifications.${key}`)}</label>
        <Switch id={`notification-${key}`} checked={current[key]} onCheckedChange={checked => { setValues({ ...current, [key]: checked }); setMessage('') }} />
      </div>)}
      <div className="grid gap-2"><label htmlFor="notification-hour" className="text-sm">{t('notifications.time')}</label>
        <Select value={String(current.reminderHour)} onValueChange={hour => setValues({ ...current, reminderHour: Number(hour) })}>
          <SelectTrigger id="notification-hour"><SelectValue /></SelectTrigger>
          <SelectContent>{Array.from({ length: 24 }, (_, hour) => <SelectItem key={hour} value={String(hour)}>{`${String(hour).padStart(2, '0')}:00`}</SelectItem>)}</SelectContent>
        </Select>
        <p className="text-sm text-tilly-text-secondary">{current.timeZone}</p>
        <button type="button" className="min-h-11 text-left text-sm text-tilly-accent" onClick={() => setValues({ ...current, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone })}>{t('notifications.useZone')}</button>
      </div>
      <button className="min-h-11 rounded-full bg-tilly-accent px-5 py-3 text-sm text-tilly-on-signal" onClick={() => void save()}>{t(busy ? 'notifications.saving' : 'notifications.save')}</button>
    </fieldset>}
    {message && <p className="mt-3 text-sm" role="status">{message}</p>}
    <button type="button" disabled={busy} className="mt-4 min-h-11 text-sm text-tilly-accent" onClick={() => {
      setBusy(true)
      void enableWebPush({client,swPath:"/foir-sw.js",scope:"/",deviceName:t('notifications.webDeviceName')}).then(result => setMessage(t(`notifications.${result.ok ? 'pushEnabled' : !result.ok && result.reason === 'unsupported' ? 'pushUnsupported' : !result.ok && result.reason === 'denied' ? 'pushDenied' : 'pushNoConfig'}`)))
        .catch(() => setMessage(t('notifications.failed'))).finally(() => setBusy(false))
    }}>{t('notifications.enablePush')}</button>
    <button type="button" disabled={busy} className="mt-2 block min-h-11 text-sm text-tilly-text-secondary" onClick={() => {
      setBusy(true)
      void disableWebPush({client}).then(() => setMessage(t('notifications.pushDisabled'))).catch(() => setMessage(t('notifications.failed'))).finally(() => setBusy(false))
    }}>{t('notifications.disablePush')}</button>
  </section>
}
