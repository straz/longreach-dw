import { Link, Navigate, useParams } from 'react-router'
import { type Brief, groupBriefs } from '../../domain/briefs.ts'
import { daysAway, formatDate, formatMoney } from '../../domain/format.ts'
import { useRouteState } from '../shared/routeState.ts'
import { useBriefs } from '../shared/useBriefs.ts'
import GraphError from '../shared/GraphError.tsx'
import NarrowPicker from '../shared/NarrowPicker.tsx'
import BriefView from './BriefView.tsx'
import { briefLabel } from './words.ts'
import './ReconsiderTab.css'

// The Reconsider tab (docs/PLAN.md §4.4): briefs grouped Open, Awaiting
// approval, Deferred and Decided on the left; the selected brief on the right.

export default function ReconsiderTab() {
  const { brief: slug } = useParams()
  const { briefs, error } = useBriefs()
  const { href } = useRouteState()
  if (error) return <GraphError error={error} />
  if (!briefs) return <div className="rtab" aria-busy="true" />

  const groups = groupBriefs(briefs)
  const selected = briefs.find((b) => b.spec.slug === slug)
  // With nothing chosen, open the brief with the nearest deadline.
  if (!selected && groups.length) return <Navigate to={href(`/reconsider/${groups[0].briefs[0].spec.slug}`)} replace />

  return (
    <div className="rtab">
      <NarrowPicker className="blist" label="Briefs" current={selected?.spec.title ?? 'Briefs'}>
        {groups.map((g) => (
          <section key={g.key} className={`blist-group is-${g.key}`}>
            <h2 className="blist-group-title caps-label">
              {g.title} <span className="blist-count">{g.briefs.length}</span>
            </h2>
            {g.briefs.map((b) => (
              <BriefRow key={b.spec.slug} brief={b} selected={b === selected} />
            ))}
          </section>
        ))}
        {groups.length === 0 && <p className="blist-empty">No brief is open. A brief opens when a Watch flag puts a commitment's assumption in question.</p>}
      </NarrowPicker>
      <div className="rtab-main">{selected ? <BriefView brief={selected} /> : <NoBriefs />}</div>
    </div>
  )
}

function BriefRow({ brief, selected }: { brief: Brief; selected: boolean }) {
  const { href, asOf } = useRouteState()
  const sub =
    brief.state === 'deferred'
      ? `revisit ${formatDate(brief.revisit!)}`
      : brief.state === 'decided'
        ? brief.supersededBy
          ? `superseded by ${briefLabel(brief.supersededBy) ?? 'a newer brief'}`
          : brief.decision && `${brief.decision.kind} ${formatDate(brief.decision.held_at)}`
        : brief.state === 'awaiting'
          ? `${brief.decision?.mandate?.holder_name ?? 'approval'}`
          : brief.firstWindow && `window ${formatDate(brief.firstWindow.date)} ${daysAway(brief.firstWindow.date, asOf)}`
  return (
    <Link className={`brow${selected ? ' is-selected' : ''} is-${brief.state}`} to={href(`/reconsider/${brief.spec.slug}`)} aria-current={selected ? 'page' : undefined}>
      <span className="brow-title">
        {briefLabel(brief.spec.slug) && <span className="brow-id">{briefLabel(brief.spec.slug)}</span>} {brief.spec.title}
      </span>
      <span className="brow-meta">
        {brief.state !== 'decided' && brief.avoidable > 0 && <span className="brow-amount">{formatMoney(brief.avoidable)} avoidable</span>}
        {sub && <span>{sub}</span>}
      </span>
    </Link>
  )
}

function NoBriefs() {
  return (
    <div className="rtab-empty">
      <h1>Nothing to reconsider</h1>
      <p>Briefs open from Watch flags: a necessary assumption contradicted while capital can still be avoided, a tripwire reached, or a deferred decision coming due.</p>
    </div>
  )
}
