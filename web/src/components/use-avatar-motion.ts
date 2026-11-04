import { useEffect, useState, type RefObject } from 'react'

/** SSR starts still. CSS animation runs only while this avatar can be seen. */
export function useAvatarMotion(ref: RefObject<SVGSVGElement | null>, enabled: boolean) {
  const [active, setActive] = useState(false)
  useEffect(() => {
    if (!enabled) { setActive(false); return }
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    let inView = typeof IntersectionObserver === 'undefined'
    const update = () => setActive(inView && !document.hidden && !preference.matches)
    const observer = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(entries => {
      inView = entries.some(entry => entry.isIntersecting)
      update()
    })
    if (ref.current) observer?.observe(ref.current)
    preference.addEventListener('change', update)
    document.addEventListener('visibilitychange', update)
    update()
    return () => {
      observer?.disconnect()
      preference.removeEventListener('change', update)
      document.removeEventListener('visibilitychange', update)
    }
  }, [enabled, ref])
  return enabled && active
}
