import {
  createContext,
  createElement,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { useRouteContext } from '@tanstack/react-router'
import defaults from '../../../../ios/Tilly/Resources/Copy.json'
import type { AppClient } from './data'
import {collectConnection} from './paging'

const fallback = Object.fromEntries(
  Object.entries(defaults).flatMap(([namespace, entries]) =>
    Object.entries(entries).map(([key, value]) => [
      `${namespace}.${key}`,
      value,
    ]),
  ),
)
export function resolveAppCopy(
  records: readonly {
    _naturalKey: string | null
    entries?:
      readonly ({ key: string | null; value: string | null } | null)[] | null
  }[],
) {
  const words = { ...fallback }
  for (const record of records) {
    if (!record._naturalKey) continue
    for (const entry of record.entries ?? []) {
      if (entry?.key && entry.value)
        words[`${record._naturalKey}.${entry.key}`] = entry.value
    }
  }
  return words
}
export function formatAppCopy(
  words: Record<string, string>,
  key: string,
  values: Record<string, string> = {},
) {
  return (words[key] ?? key).replace(
    /\{([^}]+)\}/g,
    (match, name: string) => values[name] ?? match,
  )
}
const Context = createContext(
  (key: string, values: Record<string, string> = {}) =>
    formatAppCopy(fallback, key, values),
)
/** Shared SDK read for SSR and app surfaces. Callers retain their existing
 * public/preview/session authority; preview never supplies credentials. */
export async function readAppCopyRecords(client: Pick<AppClient,'ui-copy'>, locale: string | undefined, preview = false) {
  return collectConnection(after=>client['ui-copy'].findMany({
    first:100,after,locale,contexts:{preview},pick:['_id','_naturalKey','entries'],
  }))
}
export function AppCopy({
  client,
  children,
}: {
  client: AppClient
  children: ReactNode
}) {
  const { locale } = useRouteContext({ from: '__root__' })
  const [words, setWords] = useState(fallback)
  useEffect(() => {
    let active = true
    // Match iOS AppConfig: native Fóir locale resolution and bounded pagination.
    void (async () => {
      const records = await readAppCopyRecords(client, locale)
      if (active) setWords(resolveAppCopy(records))
    })().catch(() => {}) // The same bundled words remain available offline.
    return () => {
      active = false
    }
  }, [client, locale])
  return (
    <Context.Provider
      value={(key, values = {}) => formatAppCopy(words, key, values)}
    >
      {children}
    </Context.Provider>
  )
}
export const useAppCopy = () => useContext(Context)

/** Placement callers supply copy read with their own scoped session. */
export function CopyProvider({ records, children }: {records: Parameters<typeof resolveAppCopy>[0]; children: ReactNode}) {
  const words = resolveAppCopy(records)
  return createElement(Context.Provider,{value:(key,values={})=>formatAppCopy(words,key,values),children})
}
