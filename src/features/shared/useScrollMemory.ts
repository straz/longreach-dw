import { useEffect, useRef } from 'react'
import { useLocation, useNavigationType } from 'react-router'

// Back and Forward return to where the page was scrolled (docs/PLAN.md §3,
// principle 7). The page scrolls as a whole; its position is remembered per
// history entry. Opening another page starts at its top; a change of query
// only (a Watch row opened, the as-of date moved) leaves scrolling alone.

const positions = new Map<string, number>()

export function useScrollMemory() {
  const { key, pathname } = useLocation()
  const navigation = useNavigationType()
  const lastPath = useRef(pathname)

  useEffect(() => {
    const save = () => positions.set(key, window.scrollY)
    window.addEventListener('scroll', save, { passive: true })
    let frame = 0
    if (navigation === 'POP') {
      const target = positions.get(key)
      if (target !== undefined) {
        let tries = 0
        const step = () => {
          window.scrollTo(0, target)
          // The page may still be loading; try again until it is tall enough, for about a second.
          if (Math.abs(window.scrollY - target) > 1 && tries++ < 60) frame = requestAnimationFrame(step)
        }
        step()
      }
    } else if (pathname !== lastPath.current) window.scrollTo(0, 0)
    lastPath.current = pathname
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', save)
    }
  }, [key, pathname, navigation])
}
