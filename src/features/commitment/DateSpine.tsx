import { daysBetween } from '../../domain/dates.ts'
import { formatDate, formatMoney } from '../../domain/format.ts'
import type { CommitmentDetail, SpineEvent } from '../../domain/detail.ts'
import { Mark } from '../../ui/charts/marks.tsx'
import { useRouteState } from '../shared/routeState.ts'
import './DateSpine.css'

// Every dated thing about one commitment, top to bottom (docs/layouts.md):
// what moved its assumptions above the as-of rule, what is coming below it.

export default function DateSpine({ detail }: { detail: CommitmentDetail }) {
  const { asOf } = useRouteState()
  const { past, coming } = detail.spine
  return (
    <aside className="spine" aria-label="Dates for this commitment">
      <h2 className="spine-title">Dates</h2>
      <ol className="spine-list">
        {past.map((e, i) => (
          <Event key={`p${i}`} e={e} asOf={asOf} />
        ))}
        <li className="spine-asof">
          <span>As of {formatDate(asOf, { long: true })}</span>
        </li>
        {coming.length === 0 && <li className="spine-empty">Nothing scheduled.</li>}
        {coming.map((e, i) => (
          <Event key={`c${i}`} e={e} asOf={asOf} />
        ))}
      </ol>
    </aside>
  )
}

function Event({ e, asOf }: { e: SpineEvent; asOf: string }) {
  const days = daysBetween(asOf, e.date)
  const tone = e.kind === 'evidence' ? (e.stance === 'contradicts' ? 'moved' : 'weak') : undefined
  const soon = e.kind === 'window' && days >= 0 && days <= 45
  return (
    <li className={`spine-event is-${e.kind}${soon ? ' is-soon' : ''}`}>
      <span className="spine-mark">
        <Mark kind={e.kind} tone={tone} size={e.kind === 'window' ? 13 : 11} />
      </span>
      <span className="spine-date">
        {formatDate(e.date)}
        {e.kind === 'window' && days >= 0 && days <= 90 && <span className="spine-days"> · {days === 0 ? 'today' : `${days} days`}</span>}
      </span>
      <span className="spine-text">
        {e.kind === 'window' && <span className="spine-kind">Window closes: </span>}
        {e.kind === 'report' && <span className="spine-kind">Expected: </span>}
        {e.title}
      </span>
      {e.amount !== undefined && e.amount > 0 && <span className="spine-amount">{formatMoney(e.amount)} avoidable until then</span>}
      {e.cost !== undefined && <span className="spine-note">Costs {formatMoney(e.cost)} to exercise</span>}
      {e.detail && <span className="spine-note">{e.detail}</span>}
      {e.synthetic && <span className="tag-synthetic">Synthetic</span>}
    </li>
  )
}
