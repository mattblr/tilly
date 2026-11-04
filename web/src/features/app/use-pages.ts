import { friendlyError } from '~/lib/failures'
import { useAppCopy } from './copy'
import { useEffect, useRef, useState } from 'react'
import { appendUnique, type PageSource } from './paging'

/** Every route/session/reload owns its source; obsolete pages never enter a new list. */
export function usePages<T extends { id: string }>(
  create: () => Promise<PageSource<T>> | PageSource<T>,
  dependencies: readonly unknown[],
) {
  const t = useAppCopy()
  const epoch = useRef(0),
    pending = useRef(false),
    source = useRef<PageSource<T> | null>(null)
  const [rows, setRows] = useState<T[]>([]),
    [next, setNext] = useState<string | null>(null)
  const [busy, setBusy] = useState(true),
    [error, setError] = useState(''),
    [revision, setRevision] = useState(0)
  useEffect(() => {
    const generation = ++epoch.current
    pending.current = true
    source.current = null
    setRows([])
    setNext(null)
    setBusy(true)
    setError('')
    void (async () => {
      const candidate = await create(),
        page = await candidate.next()
      if (epoch.current !== generation) return
      source.current = candidate
      setRows(appendUnique([], page.rows))
      setNext(page.next)
    })()
      .catch((failure) => {
        if (epoch.current === generation)
          setError(
            friendlyError(failure, t),
          )
      })
      .finally(() => {
        if (epoch.current === generation) {
          pending.current = false
          setBusy(false)
        }
      })
    return () => {
      epoch.current++
    }
  }, [...dependencies, revision])
  const more = async () => {
    if (pending.current || !source.current || !next) return
    const generation = epoch.current
    pending.current = true
    setBusy(true)
    setError('')
    try {
      const page = await source.current.next()
      if (epoch.current !== generation) return
      setRows((current) => appendUnique(current, page.rows))
      setNext(page.next)
    } catch (failure) {
      if (epoch.current === generation)
        setError(
          friendlyError(failure, t),
        )
    } finally {
      if (epoch.current === generation) {
        pending.current = false
        setBusy(false)
      }
    }
  }
  return {
    rows,
    next,
    busy,
    error,
    more,
    reload: () => {
      epoch.current++
      setRevision((value) => value + 1)
    },
  }
}
