import { type FormEvent, useState } from 'react'
import { type Brief, PATH_KEYS, PATH_LABEL, type PathKey, isAvailable } from '../../domain/briefs.ts'
import type { Approval } from '../../writes.ts'
import { useRouteState } from '../shared/routeState.ts'
import WriteError from '../shared/WriteError.tsx'
import { useDecisionWrite } from './useDecisionWrite.ts'
import { useDirectory } from '../shared/useDirectory.ts'

// Recording the decision (docs/PLAN.md §2.6, step 5): pick a path, say why,
// state conditions and, for Delay, when to revisit. A path under another
// holder's mandate is recorded with their agreement, or sent to them.

export default function RecordForm({ brief }: { brief: Brief }) {
  const { asOf } = useRouteState()
  const { mandate } = useDirectory()
  const write = useDecisionWrite(brief)
  const available = PATH_KEYS.filter((k) => isAvailable(brief.spec.paths?.[k]))
  const [path, setPath] = useState<PathKey | undefined>()
  const [rationale, setRationale] = useState('')
  const [conditions, setConditions] = useState('')
  const [revisit, setRevisit] = useState('')
  const [agreed, setAgreed] = useState<'agreed' | 'request'>('agreed')

  const spec = path ? brief.spec.paths?.[path] : undefined
  const chosen = isAvailable(spec) ? spec : undefined
  const m = chosen && mandate(chosen.mandate)
  // A team or the board cannot agree on the spot; its approval is requested.
  const canAgree = !!m && !m.mine && m.holderKind === 'person'
  const approval: Approval = !m || m.mine ? 'own' : canAgree ? agreed : 'request'
  const revisitDefault = chosen?.effects?.revisit_at

  if (write.readOnly) return <p className="record-off">{write.why}.</p>

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!path || !m) return
    void write.record({ path, rationale, conditions, revisitAt: path === 'delay' ? revisit || revisitDefault : undefined, approval })
  }

  return (
    <form className="bsection record" onSubmit={submit}>
      <h2 className="caps-label">Record the decision</h2>
      <fieldset className="record-paths">
        <legend className="sr-only">Path</legend>
        {available.map((k) => (
          <label key={k} className={`record-path${path === k ? ' is-on' : ''}`}>
            <input type="radio" name="path" value={k} checked={path === k} onChange={() => setPath(k)} />
            {PATH_LABEL[k]}
          </label>
        ))}
      </fieldset>
      <label className="record-field">
        <span>Rationale</span>
        <textarea rows={3} value={rationale} onChange={(e) => setRationale(e.target.value)} placeholder="Why this path, in a sentence or two" required />
      </label>
      <label className="record-field">
        <span>Conditions</span>
        <input type="text" value={conditions} onChange={(e) => setConditions(e.target.value)} placeholder="What must hold, or happen, for this to stand" />
      </label>
      {path === 'delay' && (
        <label className="record-field is-short">
          <span>Revisit on</span>
          <input type="date" value={revisit || revisitDefault || ''} min={asOf} onChange={(e) => setRevisit(e.target.value)} required />
        </label>
      )}
      {m && (
        <div className="record-auth">
          {m.mine ? (
            <p>
              Under your <strong>{m.mandate}</strong> mandate.
            </p>
          ) : canAgree ? (
            <fieldset>
              <legend>
                Needs <strong>{m.mandate}</strong>, held by {m.holder_name}.
              </legend>
              <label>
                <input type="radio" name="approval" checked={agreed === 'agreed'} onChange={() => setAgreed('agreed')} /> Recorded with {m.holder_name}'s agreement
              </label>
              <label>
                <input type="radio" name="approval" checked={agreed === 'request'} onChange={() => setAgreed('request')} /> Send to {m.holder_name} for approval
              </label>
            </fieldset>
          ) : (
            <p>
              Needs <strong>{m.mandate}</strong>, held by {m.holder_name}. It is sent to them for approval; nothing changes until they approve.
            </p>
          )}
        </div>
      )}
      <WriteError error={write.error} />
      <div className="record-foot">
        <button type="submit" className="btn-action" disabled={!path || !rationale.trim() || write.pending}>
          {write.pending ? 'Recording…' : approval === 'request' ? 'Send for approval' : 'Record decision'}
        </button>
      </div>
    </form>
  )
}
