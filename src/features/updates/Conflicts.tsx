import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { ApiError } from '../../api.ts'
import { formatValue } from '../../domain/format.ts'
import { textOf } from '../../domain/record.ts'
import { useGateway } from '../../gateway/react.tsx'
import { keys } from '../../queryKeys.ts'
import { type Conflict, type Resolution, changeId, resolveConflicts } from '../../updates.ts'
import { useAction } from '../shared/useAction.ts'

// Resolving conflicts with main (tyapi docs/20, Phase 4): take main's version, then edit. For each record both
// sides changed, the fields each side changed, with main's version and the user's changes laid over it proposed
// for them to confirm or edit; a field both changed is theirs to choose. A record one side deleted is the user's to
// keep or let go. Nothing is written until they resolve them all; letting a record go that has links added on the
// update asks first, naming them.

type Choice = Record<string, unknown> | null | undefined

/** What was typed, as the field's own type: a number stays a number, an empty field is no value. */
export function typed(text: string, like: unknown): unknown {
  if (text.trim() === '') return null
  if (typeof like === 'number') return Number.isNaN(Number(text)) ? text : Number(text)
  if (typeof like === 'boolean') return text === 'true'
  return text
}

/** The first choice for each conflict: the proposal where there is one; nothing yet where a side deleted it. */
const firstChoices = (conflicts: Conflict[]) => Object.fromEntries(conflicts.map((c) => [changeId(c), c.proposed ?? undefined])) as Record<string, Choice>

export default function Conflicts({ conflicts, mine }: { conflicts: Conflict[]; mine: boolean }) {
  const gateway = useGateway()
  const queryClient = useQueryClient()
  const [choices, setChoices] = useState(() => firstChoices(conflicts))
  const { busy, problem, run } = useAction()
  const [confirming, setConfirming] = useState<string | null>(null)
  const choose = (c: Conflict, record: Choice) => setChoices((all) => ({ ...all, [changeId(c)]: record }))
  const decided = conflicts.every((c) => choices[changeId(c)] !== undefined)

  const resolve = (confirm = false) =>
    run(async () => {
      const records: Resolution[] = conflicts.map((c) => ({ kind: c.kind, type: c.type, id: c.id, record: choices[changeId(c)] ?? null }))
      try {
        await resolveConflicts(gateway, gateway.branch, records, confirm)
      } catch (e) {
        // Letting a record go that has links added on the update asks first, naming them.
        if (e instanceof ApiError && e.code === 'confirm') return setConfirming(e.message)
        throw e
      }
      setConfirming(null)
      await queryClient.invalidateQueries({ queryKey: keys.graph(gateway.graph) })
    })

  return (
    <div className="conflicts">
      <p className="update-lede">
        {conflicts.length === 1 ? 'A record was' : `${conflicts.length} records were`} changed on main since this update began. Take main’s version, then
        your changes: check each below, then resolve them together.
      </p>
      {conflicts.map((c) => (
        <ConflictCard key={changeId(c)} conflict={c} choice={choices[changeId(c)]} onChoose={(r) => choose(c, r)} disabled={!mine || busy !== null} />
      ))}
      {mine ? (
        <div className="merge-actions">
          <button type="button" className="btn-action" disabled={!decided || busy !== null} onClick={() => void resolve()}>
            {busy ? 'Resolving…' : 'Resolve conflicts'}
          </button>
          {!decided && <span className="update-field">Choose for each record first.</span>}
        </div>
      ) : (
        <p className="update-field">Only the update’s author resolves its conflicts.</p>
      )}
      {confirming && (
        <div className="merge-conflict" role="alert">
          <p>{confirming}.</p>
          <button type="button" className="btn-line is-small" disabled={busy !== null} onClick={() => void resolve(true)}>
            Let them go too
          </button>
        </div>
      )}
      {problem && (
        <p role="alert" className="update-field">
          {problem}
        </p>
      )}
    </div>
  )
}

function ConflictCard({ conflict: c, choice, onChoose, disabled }: { conflict: Conflict; choice: Choice; onChoose: (r: Choice) => void; disabled: boolean }) {
  const words = textOf(c.main ?? c.branch ?? {}) ?? c.id
  const name = `${c.type}-${c.id}`
  if (!c.main || !c.branch) {
    const kept = c.main ? 'Keep main’s version' : 'Keep my version'
    const gone = c.main ? 'Delete it, as I did' : 'Let it go, as main did'
    return (
      <fieldset className="merge-conflict">
        <legend>
          <strong>{c.type}</strong> {words}
        </legend>
        <p className="update-field">{c.main ? 'You deleted it; main changed it since.' : 'Main deleted it; you changed it.'}</p>
        <label>
          <input type="radio" name={name} disabled={disabled} checked={choice !== undefined && choice !== null} onChange={() => onChoose(c.main ?? c.branch)} /> {kept}
        </label>
        <label>
          <input type="radio" name={name} disabled={disabled} checked={choice === null} onChange={() => onChoose(null)} /> {gone}
        </label>
      </fieldset>
    )
  }
  const record = choice ?? c.proposed ?? c.main
  return (
    <fieldset className="merge-conflict">
      <legend>
        <strong>{c.type}</strong> {words}
      </legend>
      <table className="conflict-fields">
        <thead>
          <tr>
            <th scope="col">Field</th>
            <th scope="col">When you began</th>
            <th scope="col">Main</th>
            <th scope="col">Yours</th>
            <th scope="col">Resolved</th>
          </tr>
        </thead>
        <tbody>
          {c.fields.map((f) => (
            <tr key={f.name} className={f.changed_by === 'both' ? 'is-both' : undefined}>
              <th scope="row">
                {f.name.replaceAll('_', ' ')}
                {f.changed_by === 'both' && <span className="update-field"> · both changed: choose</span>}
              </th>
              <td>{formatValue(f.was)}</td>
              <td>{formatValue(f.main)}</td>
              <td>{formatValue(f.update)}</td>
              <td>
                <input
                  className="conflict-input"
                  aria-label={`${f.name.replaceAll('_', ' ')}, resolved`}
                  disabled={disabled}
                  value={record[f.name] === null || record[f.name] === undefined ? '' : String(record[f.name])}
                  onChange={(e) => onChoose({ ...record, [f.name]: typed(e.target.value, f.main ?? f.update) })}
                />
                {f.changed_by === 'both' && (
                  <span className="conflict-picks">
                    <button type="button" className="btn-link" disabled={disabled} onClick={() => onChoose({ ...record, [f.name]: f.main })}>
                      main’s
                    </button>
                    <button type="button" className="btn-link" disabled={disabled} onClick={() => onChoose({ ...record, [f.name]: f.update })}>
                      mine
                    </button>
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </fieldset>
  )
}
