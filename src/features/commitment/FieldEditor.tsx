import { type FormEvent, useState } from 'react'
import { formatMoney } from '../../domain/format.ts'
import type { Field } from '../../domain/fields.ts'
import type { FieldProposal } from '../../gateway/documents.ts'
import type { Names } from './fieldText.tsx'

// The owner's own value for a field, replacing what was extracted or filling
// what is missing. Each field gets the control its value needs.

type Props = {
  field: Field
  initial?: FieldProposal
  names: Names
  /** The commitment being edited, left out of its own dependency choices. */
  self: string
  user: string
  at: string
  onSave: (value: FieldProposal) => void
  onCancel: () => void
}

/** The mandates a decision can be made under: any held by a person or a body, never an agent's (agents only
 *  propose and monitor, tyapi docs/10-ty-core.md). */
const authorizing = (names: Names) => names.mandates.filter((m) => names.mandate(m.mandate)?.holderKind !== 'agent')

export default function FieldEditor({ field, initial, names, self, user, at, onSave, onCancel }: Props) {
  const init = initial?.field === field ? initial : undefined
  const choices = authorizing(names)
  // A new rationale starts under one of the persona's own mandates, else the first that can authorize it.
  const ownMandate = (choices.find((m) => m.holder === user && m.power !== 'monitor') ?? choices[0])?.mandate ?? ''
  const [title, setTitle] = useState(init?.field === 'promise' ? init.title : '')
  const [text, setText] = useState(init && 'text' in init && init.field !== 'capital' && init.field !== 'owner' ? init.text : '')
  const [amount, setAmount] = useState(init?.field === 'capital' ? String(init.amount) : '')
  const [until, setUntil] = useState(init?.field === 'capital' ? (init.until ?? '') : init?.field === 'success_criteria' ? (init.target_at ?? '') : '')
  const [party, setParty] = useState(init?.field === 'owner' ? init.party : user)
  const [mandate, setMandate] = useState(init?.field === 'rationale' ? init.decision.under : ownMandate)
  const [decision, setDecision] = useState(init?.field === 'rationale' ? init.decision.statement : '')
  const [beliefs, setBeliefs] = useState(new Map((init?.field === 'assumptions' ? init.beliefs : []).map((b) => [b.belief, b.necessary])))
  const [deps, setDeps] = useState(new Set((init?.field === 'dependencies' ? init.on : []).map((d) => d.commitment)))

  const value = (): FieldProposal | undefined => {
    switch (field) {
      case 'promise':
        return title.trim() && text.trim() ? { field, title: title.trim(), text: text.trim() } : undefined
      case 'capital': {
        const n = Number(amount)
        return n > 0 ? { field, amount: n, until: until || undefined, text: `${formatMoney(n)}${until ? `, avoidable until ${until}` : ''}` } : undefined
      }
      case 'owner':
        return party ? { field, party, text: names.party(party) } : undefined
      case 'rationale': {
        const holder = names.mandate(mandate)?.holder ?? user
        return text.trim() && decision.trim() ? { field, text: text.trim(), decision: { statement: decision.trim(), decided_at: at, by: holder, under: mandate } } : undefined
      }
      case 'assumptions': {
        const list = [...beliefs].map(([belief, necessary]) => ({ belief, necessary }))
        return { field, beliefs: list, text: list.length ? list.map((b) => names.belief(b.belief)).join('; ') : 'None' }
      }
      case 'success_criteria':
        return text.trim() ? { field, text: text.trim(), target_at: until || undefined } : undefined
      case 'dependencies': {
        const on = [...deps].map((commitment) => ({ commitment, kind: 'requires' as const }))
        return { field, on, text: on.length ? on.map((d) => names.commitment(d.commitment)).join('; ') : 'None' }
      }
    }
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const v = value()
    if (v) onSave(v)
  }

  return (
    <form className="feditor" onSubmit={submit}>
      {field === 'promise' && (
        <>
          <label className="feditor-label">
            Title
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="A short name for the commitment" autoFocus />
          </label>
          <label className="feditor-label">
            What is promised
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} />
          </label>
        </>
      )}
      {field === 'capital' && (
        <div className="feditor-row">
          <label className="feditor-label">
            Amount ($M)
            <input type="number" min="0" step="0.1" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
          </label>
          <label className="feditor-label">
            Avoidable until
            <input type="date" value={until} onChange={(e) => setUntil(e.target.value)} />
          </label>
        </div>
      )}
      {field === 'owner' && (
        <label className="feditor-label">
          Owner
          <select value={party} onChange={(e) => setParty(e.target.value)} autoFocus>
            {names.parties
              .filter((p) => p.kind === 'person')
              .map((p) => (
                <option key={p.party} value={p.party}>
                  {p.name}
                </option>
              ))}
          </select>
        </label>
      )}
      {field === 'rationale' && (
        <>
          <label className="feditor-label">
            Decision
            <input value={decision} onChange={(e) => setDecision(e.target.value)} placeholder="What was decided" autoFocus />
          </label>
          <label className="feditor-label">
            Why
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} />
          </label>
          <label className="feditor-label">
            Authorized under
            <select value={mandate} onChange={(e) => setMandate(e.target.value)}>
              {choices.map((m) => (
                <option key={m.mandate} value={m.mandate}>
                  {m.mandate}: {m.holder_name}
                  {m.limit_amount ? `, up to ${formatMoney(m.limit_amount)}` : ''}
                </option>
              ))}
            </select>
          </label>
        </>
      )}
      {field === 'assumptions' && (
        <fieldset className="feditor-choices">
          <legend>Assumptions from the shared library</legend>
          {names.beliefs.map((b) => {
            const on = beliefs.has(b.belief)
            return (
              <div key={b.belief} className={`feditor-choice${on ? ' is-on' : ''}`}>
                <label>
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => {
                      const next = new Map(beliefs)
                      if (on) next.delete(b.belief)
                      else next.set(b.belief, false)
                      setBeliefs(next)
                    }}
                  />
                  {b.statement}
                </label>
                {on && (
                  <label className="feditor-necessary">
                    <input type="checkbox" checked={beliefs.get(b.belief)} onChange={(e) => setBeliefs(new Map(beliefs).set(b.belief, e.target.checked))} />
                    Necessary
                  </label>
                )}
              </div>
            )
          })}
        </fieldset>
      )}
      {field === 'success_criteria' && (
        <>
          <label className="feditor-label">
            Success looks like
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} autoFocus />
          </label>
          <label className="feditor-label">
            By
            <input type="date" value={until} onChange={(e) => setUntil(e.target.value)} />
          </label>
        </>
      )}
      {field === 'dependencies' && (
        <fieldset className="feditor-choices">
          <legend>Commitments this one requires</legend>
          {names.commitments
            .filter((c) => c.state === 'active' && c.commitment !== self)
            .map((c) => (
              <div key={c.commitment} className={`feditor-choice${deps.has(c.commitment) ? ' is-on' : ''}`}>
                <label>
                  <input
                    type="checkbox"
                    checked={deps.has(c.commitment)}
                    onChange={() => {
                      const next = new Set(deps)
                      if (!next.delete(c.commitment)) next.add(c.commitment)
                      setDeps(next)
                    }}
                  />
                  {c.title}
                </label>
              </div>
            ))}
        </fieldset>
      )}
      <div className="feditor-actions">
        <button type="submit" className="btn-action" disabled={!value()}>
          Save as verified
        </button>
        <button type="button" className="btn-quiet" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  )
}
