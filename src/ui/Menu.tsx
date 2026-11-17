import { type ReactNode, useCallback, useId, useRef, useState } from 'react'
import { useDismiss } from './useDismiss.ts'
import './menu.css'

// Disclosures in the navbar (the user menu, the update control, the as-of date): a button that shows a panel,
// closed by Escape, which returns focus to the button, or by a press outside.

/** A disclosure's state, and the refs its root and button need. */
export function useDisclosure() {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const button = useRef<HTMLButtonElement>(null)
  const close = useCallback(() => setOpen(false), [])
  useDismiss(root, open, close, button)
  return { open, toggle: () => setOpen((o) => !o), close, root, button }
}

/** The caret a disclosure's button ends with. */
export function Caret({ className }: { className?: string }) {
  return (
    <svg className={className} width="10" height="6" viewBox="0 0 10 6" aria-hidden="true">
      <path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

/** A menu of plain items; children get close, for an item that acts. */
export function Menu({ face, label, children }: { face: ReactNode; label: string; children: (close: () => void) => ReactNode }) {
  const { open, toggle, close, root, button } = useDisclosure()
  const panel = useId()
  return (
    <div className="menu" ref={root}>
      <button ref={button} type="button" className="menu-button" aria-expanded={open} aria-controls={panel} onClick={toggle}>
        {face}
        <Caret />
      </button>
      {open && (
        <div id={panel} className="menu-panel" role="group" aria-label={label}>
          {children(close)}
        </div>
      )}
    </div>
  )
}
