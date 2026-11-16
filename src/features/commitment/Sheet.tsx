import { type ReactNode, useEffect } from 'react'
import './ImportSheet.css'

// The large sheet the New commitment choices open over the Commitment tab:
// a title and line under it, a close button, Escape and a backdrop click to
// close.

export default function Sheet({ title, sub, label, narrow, onClose, children }: { title: string; sub: string; label: string; narrow?: boolean; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="isheet-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <section className={`isheet${narrow ? ' is-narrow' : ''}`} role="dialog" aria-modal="true" aria-label={label}>
        <header className="isheet-head">
          <div>
            <h1 className="isheet-title">{title}</h1>
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
