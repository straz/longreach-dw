import { type KeyboardEvent, type ReactNode, useEffect, useRef } from 'react'
import './ImportSheet.css'

// The large sheet the New commitment choices open over the Commitment tab:
// a title and line under it, a close button, Escape and a backdrop click to
// close. Being modal, it takes focus while open, keeps Tab inside it, and
// gives focus back to where it was when it closes.

const FOCUSABLE = 'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'

export default function Sheet({ title, sub, label, narrow, onClose, children }: { title: string; sub: string; label: string; narrow?: boolean; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    const before = document.activeElement instanceof HTMLElement ? document.activeElement : null
    heading.current?.focus()
    return () => before?.focus()
  }, [])

  // Tab past the last control comes back to the first, and Shift+Tab before the first goes to the last.
  const keepTab = (e: KeyboardEvent) => {
    if (e.key !== 'Tab' || !ref.current) return
    const items = [...ref.current.querySelectorAll<HTMLElement>(FOCUSABLE)]
    if (!items.length) return
    const first = items[0]
    const last = items[items.length - 1]
    const at = document.activeElement
    if (e.shiftKey && (at === first || at === heading.current)) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && at === last) {
      e.preventDefault()
      first.focus()
    }
  }

  return (
    <div className="isheet-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <section ref={ref} className={`isheet${narrow ? ' is-narrow' : ''}`} role="dialog" aria-modal="true" aria-label={label} onKeyDown={keepTab}>
        <header className="isheet-head">
          <div>
            <h1 ref={heading} className="isheet-title" tabIndex={-1}>
              {title}
            </h1>
            <p className="isheet-sub">{sub}</p>
          </div>
          <button type="button" className="isheet-close" onClick={onClose} aria-label="Close">
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
              <path d="M2 2 L12 12 M12 2 L2 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </header>
        {children}
      </section>
    </div>
  )
}
