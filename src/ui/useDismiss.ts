import { type RefObject, useEffect } from 'react'

/** Closes a popover while it is open: on a press outside `ref`, or on Escape, which also returns focus to
 *  `returnTo` (the control that opened it), as a disclosure should. */
export function useDismiss(ref: RefObject<HTMLElement | null>, open: boolean, close: () => void, returnTo?: RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!open) return
    const outside = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) close()
    }
    const key = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      close()
      returnTo?.current?.focus()
    }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', key)
    return () => {
      document.removeEventListener('pointerdown', outside)
      document.removeEventListener('keydown', key)
    }
  }, [open, close, ref, returnTo])
}
