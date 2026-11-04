import { useEffect } from 'react'

/** Preview navigations return to the editor gate and SSR's private SDK client. */
export function PreviewNavigation({ enabled }: { enabled: boolean }) {
  useEffect(() => {
    if (!enabled) return
    const navigate = (event: MouseEvent) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      const anchor = event.target instanceof Element ? event.target.closest('a[href]') : null
      if (!(anchor instanceof HTMLAnchorElement) || anchor.target || anchor.hasAttribute('download')) return
      const url = new URL(anchor.href)
      if (url.origin !== window.location.origin ||
        (url.pathname === window.location.pathname && url.search === window.location.search && url.hash)) return
      event.preventDefault()
      event.stopImmediatePropagation()
      window.location.assign(url.href)
    }
    document.addEventListener('click', navigate, true)
    return () => document.removeEventListener('click', navigate, true)
  }, [enabled])
  return null
}
