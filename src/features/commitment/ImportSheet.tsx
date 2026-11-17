import { useEffect, useState } from 'react'
import { formatDate } from '../../domain/format.ts'
import { FIELD_LABEL } from '../../domain/fields.ts'
import type { SampleDocument } from '../../gateway/documents.ts'
import { useDocuments } from '../shared/client.tsx'
import { importDocument } from '../../writes.ts'
import { useRouteState } from '../shared/routeState.ts'
import { usePortfolio } from '../shared/usePortfolio.ts'
import { useService } from '../shared/useService.ts'
import { useWriteContext } from '../shared/useWriteContext.ts'
import WriteError from '../shared/WriteError.tsx'
import DocumentView from './DocumentView.tsx'
import Sheet from './Sheet.tsx'
import { FieldValue, useNames } from './fieldText.tsx'

// Import a document (docs/PLAN.md §4.2): pick one of the four kinds the brief
// names, watch the fields come out of it with their passages marked, then
// create the commitment and verify it field by field.

const STEP_MS = 380

export default function ImportSheet({ onClose }: { onClose: () => void }) {
  const docs = useDocuments()
  const [chosen, setChosen] = useState<SampleDocument>()
  return (
    <Sheet
      label="Import a document"
      title={chosen ? chosen.title : 'Import a document'}
      sub={chosen ? `${chosen.label} · ${chosen.filename} · read by the Longreach extraction agent` : 'Longreach reads the document and proposes each field of the commitment, quoting where it found it. You verify every field before it becomes active.'}
      onClose={onClose}
    >
      {chosen ? <Reading doc={chosen} onBack={() => setChosen(undefined)} onDone={onClose} /> : <Picker docs={docs} onPick={setChosen} />}
    </Sheet>
  )
}

function Picker({ docs, onPick }: { docs: SampleDocument[]; onPick: (d: SampleDocument) => void }) {
  const { portfolio } = usePortfolio()
  const { go } = useRouteState()
  return (
    <div className="isheet-body">
      <ul className="doc-cards">
        {docs
          .filter((d) => d.sample)
          .map((d) => {
            const existing = portfolio?.commitments.find((c) => c.commitment === d.commitment.slug)
            return (
              <li key={d.slug}>
                <button type="button" className="doc-card" onClick={() => (existing ? go(`/commitment/${existing.commitment}`) : onPick(d))}>
                  <span className="doc-kind">{d.label}</span>
                  <span className="doc-title">{d.title}</span>
                  <span className="doc-file">
                    {d.filename} · {formatDate(d.occurred_at)}
                  </span>
                  {existing && <span className="doc-imported">Imported · open it</span>}
                </button>
              </li>
            )
          })}
      </ul>
      <p className="isheet-note">Sample documents, written for this demonstration. Importing one records it in your copy of the demo.</p>
    </div>
  )
}

function Reading({ doc, onBack, onDone }: { doc: SampleDocument; onBack: () => void; onDone: () => void }) {
  const names = useNames()
  const { go } = useRouteState()
  const { readOnly, why } = useWriteContext()
  const mutation = useService(importDocument)
  const [count, setCount] = useState(0)
  const done = count >= doc.fields.length

  useEffect(() => {
    if (done) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const t = setTimeout(() => setCount((n) => (reduce ? doc.fields.length : n + 1)), count === 0 ? 450 : STEP_MS)
    return () => clearTimeout(t)
  }, [count, done, doc.fields.length])

  const shown = new Set(doc.fields.slice(0, count).flatMap((f) => (f.span ? [f.span] : [])))
  const focus = doc.fields[count - 1]?.span

  const create = () =>
    mutation.mutate(
      doc.slug,
      {
        onSuccess: (written) => {
          onDone()
          go(`/commitment/${written.commitment ?? doc.commitment.slug}`)
        },
      },
    )

  return (
    <>
      <div className="isheet-body isheet-split">
        <div className="isheet-doc">
          <DocumentView text={doc.text} shown={shown} focus={focus} />
        </div>
        <ol className="isheet-fields" aria-live="polite">
          {doc.fields.map((f, i) => (
            <li key={f.field} className={`ifield${i < count ? ' is-shown' : ''}`}>
              <span className="ifield-label">{FIELD_LABEL[f.field]}</span>
              {i < count ? (
                <span className="ifield-value">
                  <FieldValue value={f} names={names} />
                  {!f.span && <span className="ifield-inferred">Not stated in the document; proposed by the agent</span>}
                </span>
              ) : (
                <span className="ifield-wait">{i === count ? 'Reading…' : ''}</span>
              )}
            </li>
          ))}
        </ol>
      </div>
      <footer className="isheet-foot">
        <button type="button" className="btn-quiet" onClick={onBack}>
          Choose another document
        </button>
        <span className="isheet-foot-note">{done ? `${doc.fields.length} fields proposed, none verified yet.` : 'Extracting fields…'}</span>
        <button type="button" className="btn-action" disabled={!done || mutation.isPending || readOnly} onClick={create} title={readOnly ? why : undefined}>
          {mutation.isPending ? 'Creating…' : 'Create and verify'}
        </button>
      </footer>
      <WriteError error={mutation.error} />
    </>
  )
}
