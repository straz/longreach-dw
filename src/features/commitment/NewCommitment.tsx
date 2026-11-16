import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { startBlank } from '../../writes.ts'
import { useRouteState } from '../shared/routeState.ts'
import { useService } from '../shared/useService.ts'
import { useWriteContext } from '../shared/useWriteContext.ts'
import './NewCommitment.css'

// New commitment: import a document (?new=import), a sheet opened through the URL; or start blank (writes a
// draft and opens it). test8's third way, an AI proposing it through MCP, is tyapi's /v1/mcp, not ported.

export default function NewCommitment() {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useSearchParams()
  const { go } = useRouteState()
  const { readOnly, why } = useWriteContext()
  const blank = useService(startBlank)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [open])

  const openSheet = (sheet: 'import') => {
    setOpen(false)
    const next = new URLSearchParams(search)
    next.set('new', sheet)
    setSearch(next)
  }
  const startDraft = () => {
    setOpen(false)
    blank.mutate(undefined, { onSuccess: (written) => written.commitment && go(`/commitment/${written.commitment}`) })
  }

  return (
    <div className="newc" ref={ref}>
      <button type="button" className="clist-new" aria-expanded={open} onClick={() => setOpen((o) => !o)} disabled={readOnly} title={readOnly ? why : undefined}>
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
          <path d="M6 1.5 V10.5 M1.5 6 H10.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        New commitment
      </button>
      {open && (
        <div className="newc-menu" role="menu">
          <button type="button" role="menuitem" onClick={() => openSheet('import')}>
            <strong>Import a document</strong>
            <span>Investment case, budget approval, vendor contract or architecture decision. Fields are extracted for you to verify.</span>
          </button>
          <button type="button" role="menuitem" onClick={startDraft}>
            <strong>Start blank</strong>
            <span>Write each field yourself.</span>
          </button>
        </div>
      )}
    </div>
  )
}
