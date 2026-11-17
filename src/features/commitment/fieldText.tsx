import { dayOf } from '../../domain/dates.ts'
import { formatDate, formatMoney } from '../../domain/format.ts'
import type { FieldProposal } from '../../gateway/documents.ts'
import { useDirectory } from '../shared/useDirectory.ts'
import { useEvidence } from '../shared/useEvidence.ts'

// A field's value in words, with names resolved from the graph: who owns it,
// which assumptions, which commitments it depends on.

export function useNames() {
  const dir = useDirectory()
  const ev = useEvidence()
  return {
    /** Every lookup has answered; until then names would show as slugs. */
    ready: dir.ready && ev.ready,
    party: dir.partyName,
    mandate: dir.mandate,
    belief: (slug: string) => ev.belief(slug)?.statement ?? slug,
    commitment: dir.commitmentTitle,
    parties: dir.parties,
    beliefs: ev.beliefs,
    commitments: dir.commitments,
    mandates: dir.mandates,
  }
}

export type Names = ReturnType<typeof useNames>

export function FieldValue({ value, names }: { value: FieldProposal; names: Names }) {
  switch (value.field) {
    case 'promise':
      return (
        <>
          <strong className="fv-title">{value.title}</strong>
          <span className="fv-text">{value.text}</span>
        </>
      )
    case 'capital':
      return (
        <span className="fv-text">
          <strong>{formatMoney(value.amount)}</strong>
          {value.until ? `, avoidable until ${formatDate(value.until)}` : ''}
        </span>
      )
    case 'owner':
      return <strong className="fv-text">{names.party(value.party)}</strong>
    case 'rationale':
      return (
        <>
          <span className="fv-text">{value.text}</span>
          <span className="fv-sub">
            {value.decision.statement}. Decided {formatDate(dayOf(value.decision.decided_at))} by {names.party(value.decision.by)} under{' '}
            <span className="mandate">{value.decision.under}</span>
          </span>
        </>
      )
    case 'assumptions':
      return value.beliefs.length ? (
        <ul className="fv-list">
          {value.beliefs.map((b) => (
            <li key={b.belief}>
              <span className={`nec-tag${b.necessary ? ' is-necessary' : ''}`}>{b.necessary ? 'Necessary' : 'Supporting'}</span> {names.belief(b.belief)}
            </li>
          ))}
        </ul>
      ) : (
        <span className="fv-text">None</span>
      )
    case 'success_criteria':
      return (
        <span className="fv-text">
          {value.text}
          {value.target_at ? <span className="fv-sub"> By {formatDate(value.target_at, { long: true })}.</span> : null}
        </span>
      )
    case 'dependencies':
      return value.on.length ? (
        <ul className="fv-list">
          {value.on.map((d) => (
            <li key={d.commitment}>
              {d.kind === 'requires' ? 'Requires' : d.kind} {names.commitment(d.commitment)}
            </li>
          ))}
        </ul>
      ) : (
        <span className="fv-text">None</span>
      )
  }
}
