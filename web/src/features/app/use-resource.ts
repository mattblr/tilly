import { friendlyError } from '~/lib/failures'
import { useAppCopy } from './copy'
import { useEffect, useState } from 'react'
/** Request generations prevent a previous route or user session replacing current data. */
export function useResource<T>(load: () => Promise<T>, dependencies: readonly unknown[]) {
  const t = useAppCopy()
  const [data,setData] = useState<T | null>(null), [error,setError] = useState<string | null>(null), [busy,setBusy] = useState(true), [revision,setRevision] = useState(0)
  useEffect(() => {
    let active = true
    setData(null); setBusy(true); setError(null)
    void load().then(value => { if (active) setData(value) }).catch(failure => { if (active) setError(friendlyError(failure, t)) }).finally(() => { if (active) setBusy(false) })
    return () => { active = false }
  }, [...dependencies,revision])
  return {data,error,busy,reload: () => setRevision(value => value + 1)}
}
