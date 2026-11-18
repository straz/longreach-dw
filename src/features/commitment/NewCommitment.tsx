import { useCallback, useId, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { useDismiss } from '../../ui/useDismiss.ts'
import { startBlank } from '../../writes.ts'
import { useClient } from '../shared/client.tsx'
import { useRouteState } from '../shared/routeState.ts'
import { useService } from '../shared/useService.ts'
import { useWriteContext } from '../shared/useWriteContext.ts'
import WriteError from '../shared/WriteError.tsx'
import './NewCommitment.css'

// New commitment: draft one (#/…/draft); in a demo also import a sample document (?new=import), a sheet opened
// through the URL, or start blank (writes a draft and opens it), which are the demo's own routes. test8's third way, an AI proposing it through MCP, is tyapi's /v1/mcp, not ported.

export default function NewCommitment() {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useSearchParams()
  const { go } = useRouteState()
  const { readOnly, why } = useWriteContext()
  const client = useClient()
  const blank = useService(startBlank)
  const ref = useRef<HTMLDivElement>(null)
  const button = useRef<HTMLButtonElement>(null)
  const panelId = useId()
  const close = useCallback(() => setOpen(false), [])
  useDismiss(ref, open, close, button)

  const openSheet = (sheet: 'import') => {
    setOpen(false)
    const next = new URLSearchParams(search)
    next.set('new', sheet)
    setSearch(next)
  }
  // The panel stays open while the draft is written, so its pending state and any failure show where it was asked.
  const startDraft = () =>
    blank.mutate(undefined, {
      onSuccess: (written) => {
        setOpen(false)
        if (written.commitment) go(`/commitment/${written.commitment}`)
      },
    })

  return (
    <div className="newc" ref={ref}>
      <button
        ref={button}
        type="button"
        className="clist-new"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        disabled={readOnly}
        title={readOnly ? why : undefined}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
          <path d="M6 1.5 V10.5 M1.5 6 H10.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        New commitment
      </button>
      {open && (
        <div id={panelId} className="newc-menu">
          <button type="button" onClick={() => (setOpen(false), go('/draft'))}>
            <strong>Draft a commitment</strong>
            <span>Say what you are committing to; the draft asks what it rests on, what could change it, and who owns it.</span>
          </button>
          {client.demo && (
            <>
            <button type="button" onClick={() => openSheet('import')}>
              <strong>Import a document</strong>
              <span>Investment case, budget approval, vendor contract or architecture decision. Fields are extracted for you to verify.</span>
            </button>
            <button type="button" onClick={startDraft} disabled={blank.isPending}>
              <strong>{blank.isPending ? 'Starting…' : 'Start blank'}</strong>
              <span>Write each field yourself.</span>
            </button>
            </>
          )}
          <WriteError error={blank.error} />
        </div>
      )}
    </div>
  )
}
