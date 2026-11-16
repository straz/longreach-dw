import { useEffect, useState } from 'react'

/**
 * The rendered width of an element, kept current. A callback ref, because the
 * element first appears after the data loads, not on the first render.
 */
export function useWidth<T extends HTMLElement>() {
  const [el, setEl] = useState<T | null>(null)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    if (!el) return
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [el])
  return [setEl, width] as const
}
