import { useEffect, useRef, useState } from 'react'
import { useRouterState } from '@tanstack/react-router'

/** Keep navigation available on upward scroll, keyboard focus and every route change. */
export function useScrollHeader() {
  const ref = useRef<HTMLElement>(null)
  const [hidden, setHidden] = useState(false)
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  useEffect(() => {
    setHidden(false)
    let previous = window.scrollY,
      frame = 0
    const scroll = () => {
      if (frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        const current = Math.max(0, window.scrollY)
        if (
          current < 8 ||
          ref.current?.querySelector(':focus-visible, [data-state="open"]')
        )
          setHidden(false)
        else if (Math.abs(current - previous) > 4) setHidden(current > previous)
        if (Math.abs(current - previous) > 4) previous = current
      })
    }
    window.addEventListener('scroll', scroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', scroll)
      cancelAnimationFrame(frame)
    }
  }, [pathname])
  return { ref, 'data-hidden': hidden, onFocusCapture: () => setHidden(false) }
}
