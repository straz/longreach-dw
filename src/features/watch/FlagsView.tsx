import { type MouseEvent, useState } from 'react'
import { Link } from 'react-router'
import { daysBetween } from '../../domain/dates.ts'
import { daysAway, formatDate, formatMoney, plural } from '../../domain/format.ts'
import { type BeliefRow, type Rester, type WatchRow, inScope } from '../../domain/materiality.ts'
import type { Portfolio } from '../../domain/portfolio.ts'
import { ownerStances, unreviewedAgent } from '../../domain/watchState.ts'
import Sparkline from '../../ui/charts/Sparkline.tsx'
import { Mark } from '../../ui/charts/marks.tsx'
import { StateGlyph, toneOf } from '../../ui/stateVocabulary.tsx'
import { useRouteState } from '../shared/routeState.ts'
import { type Evidence, useEvidence } from '../shared/useEvidence.ts'
import { goodSide, rowTitle } from '../shared/watchRows.ts'
import { LIFECYCLE_LABEL, STANCE_TEXT, quietText } from '../shared/watchWords.ts'
import './FlagsView.css'

// Flags (docs/PLAN.md §4.3): rows that meet the materiality rule, each with
// what rests on it and by when it matters; then the rows that moved without
// becoming a flag, each saying which condition it misses; then what holds.

type Props = { portfolio: Portfolio; scope?: string; selected?: string; onSelect: (id?: string) => void }

export default function FlagsView({ portfolio, scope, selected, onSelect }: Props) {
  const ev = useEvidence()
  const [showAgent, setShowAgent] = useState(true)
  const [showHolding, setShowHolding] = useState(false)
  const { asOf } = portfolio
  const flags = portfolio.watch.flags.filter((r) => inScope(r, scope))
  const moved = portfolio.watch.moved.filter((r) => inScope(r, scope))
  const holding = portfolio.watch.holding.filter((r) => inScope(r, scope) && (scope || r.resters.length))
  const concerned = new Set(flags.flatMap((r) => r.commitments)).size

  return (
    <div className="flags-view">
      <header className="wv-head">
        <div>
          <h1 className="wv-title">Flags</h1>
          <p className="wv-sub">
            {flags.length ? `${plural(flags.length, 'flag')} on ${plural(concerned, 'commitment')}` : 'No flags'} · {moved.length} moved, not flagged · {holding.length} holding · as of {formatDate(asOf, { long: true })}
          </p>
        </div>
        <label className="wv-toggle">
          <input type="checkbox" checked={showAgent} onChange={(e) => setShowAgent(e.target.checked)} />
          Agent stances
        </label>
      </header>

      {flags.length === 0 ? (
        <p className="flags-empty">
          Nothing meets the rule{scope ? ' for this commitment' : ''}. A row becomes a flag when a necessary assumption is contradicted while capital can still be avoided, a tripwire is reached, a dependency ends within 90 days under a moved assumption, or a deferred review comes due.
        </p>
      ) : (
        <ol className="flags">
          {flags.map((r) => (
            <FlagRow key={r.id} row={r} ev={ev} asOf={asOf} showAgent={showAgent} selected={r.id === selected} onSelect={onSelect} />
          ))}
        </ol>
      )}

      {moved.length > 0 && (
        <section className="wv-section">
          <h2 className="wv-section-title caps-label">
            Moved, not flagged <span className="wv-count">{moved.length}</span>
          </h2>
          <ul className="quiet">
            {moved.map((r) => (
              <QuietRow key={r.id} row={r} ev={ev} showAgent={showAgent} selected={r.id === selected} onSelect={onSelect} />
            ))}
          </ul>
        </section>
      )}

      {holding.length > 0 && (
        <section className="wv-section">
          <h2 className="wv-section-title caps-label">
            <button type="button" onClick={() => setShowHolding((s) => !s)} aria-expanded={showHolding}>
              Holding <span className="wv-count">{holding.length}</span>
              <svg className={`wv-caret${showHolding ? ' is-open' : ''}`} width="9" height="9" viewBox="0 0 10 10" aria-hidden="true">
                <path d="M3 1.5 L7 5 L3 8.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </button>
          </h2>
          {showHolding && (
            <ul className="quiet">
              {holding.map((r) => (
                <QuietRow key={r.id} row={r} ev={ev} showAgent={showAgent} selected={r.id === selected} onSelect={onSelect} />
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  )
}

/** Clicking a row's background opens it; links and buttons inside keep their own action. */
const rowClick = (id: string, onSelect: (id?: string) => void) => (e: MouseEvent) => {
  if ((e.target as Element).closest('a, button, input, label')) return
  onSelect(id)
}

function FlagRow({ row, ev, asOf, showAgent, selected, onSelect }: { row: WatchRow; ev: Evidence; asOf: string; showAgent: boolean; selected: boolean; onSelect: (id?: string) => void }) {
  const rests = row.resters.filter((r) => row.commitments.includes(r.commitment))
  const lead = row.opened && row.firstWindow ? daysBetween(row.opened, row.firstWindow.date) : undefined
  return (
    <li className={`flag${selected ? ' is-selected' : ''}`} onClick={rowClick(row.id, onSelect)}>
      <div className="flag-head">
        <span className="flag-glyph">
          <StateGlyph state="contradicting" size={12} />
        </span>
        {row.lifecycle && <span className={`lifecycle is-${row.lifecycle}`}>{LIFECYCLE_LABEL[row.lifecycle]}</span>}
        <button type="button" className="flag-title" onClick={() => onSelect(row.id)} aria-expanded={selected}>
          {rowTitle(row, ev)}
        </button>
        {row.kind === 'belief' && <span className="flag-tag">Necessary</span>}
      </div>

      <div className="flag-body">
        <Reading row={row} ev={ev} />
        <p className="flag-when">
          {row.opened && <>Moved {formatDate(row.opened)}</>}
          {lead !== undefined && lead > 0 && <>, {lead} days before its first window</>}
          {row.review && (
            <>
              {' · '}
              Reviewed {formatDate(row.review.held_at)}: {row.review.outcome === 'defer' ? 'deferred' : row.review.outcome}
              {row.review.revisit_at && `, revisit ${formatDate(row.review.revisit_at)}${row.review.revisit_at === asOf ? ' (today)' : ''}`}
            </>
          )}
        </p>
        <RestsOn rests={rests} asOf={asOf} />
        {row.kind === 'belief' && <EvidenceLine row={row} ev={ev} showAgent={showAgent} />}
      </div>
    </li>
  )
}

/** The newest reading against the line, or the owner's newest judgment. */
function Reading({ row, ev }: { row: WatchRow; ev: Evidence }) {
  if (row.kind === 'tripwire') {
    const fmt = ev.format(row.tripwire.metric)
    return (
      <p className="flag-reading">
        {row.latest && (
          <>
            <strong className="tone-moved">{fmt(row.latest.value)}</strong> {formatDate(row.latest.recorded_at)} · line {fmt(row.tripwire.threshold ?? 0)}
          </>
        )}
      </p>
    )
  }
  if (row.kind === 'dependency') {
    return (
      <p className="flag-reading">
        {row.other.counterparty ?? 'Another party'} · while {row.beliefs.map((b) => ev.belief(b)?.statement ?? b).join('; ')} {row.beliefs.length === 1 ? 'has' : 'have'} moved
      </p>
    )
  }
  if (row.kind === 'revisit') return <p className="flag-reading">{row.review?.notes}</p>
  return <BeliefReading row={row} ev={ev} />
}

function BeliefReading({ row, ev }: { row: BeliefRow; ev: Evidence }) {
  const b = ev.belief(row.belief)
  const e = row.evaluation
  const last = e.readings.at(-1)
  const fmt = ev.format(b?.metric)
  if (b?.metric && last) {
    const tone = toneOf(row.state)
    return (
      <div className="flag-reading has-chart">
        <p>
          <strong className={`tone-${tone}`}>{fmt(last.value)}</strong> {formatDate(last.observed_at)}
          {b.threshold !== undefined && <> · line {fmt(b.threshold)}</>}
          {b.hard_threshold !== undefined && <> · limit {fmt(b.hard_threshold)}</>}
          {b.trend && <> · should keep {b.trend}</>}
        </p>
        <Sparkline points={e.readings.map((r) => ({ x: r.observed_at, y: r.value }))} threshold={b.threshold} hard={b.hard_threshold} good={goodSide(b)} tone={tone} width={140} height={28} label={`${ev.indicator(b.metric)?.name ?? b.metric} readings`} />
      </div>
    )
  }
  const judged = ownerStances(e.judgments).at(-1)
  if (!judged) return <p className="flag-reading">No evidence judged yet</p>
  return (
    <p className="flag-reading">
      Judged <strong className={`tone-${toneOf(row.state)}`}>{STANCE_TEXT[judged.stance]}</strong> {formatDate(judged.at)} by {ev.actorName(judged.by)}
      {judged.note && <span className="flag-note">: {judged.note}</span>}
    </p>
  )
}

function RestsOn({ rests, asOf }: { rests: Rester[]; asOf: string }) {
  const { href } = useRouteState()
  if (!rests.length) return null
  return (
    <table className="rests">
      <caption className="sr-only">What rests on it</caption>
      <tbody>
        {rests.map((r) => (
          <tr key={r.commitment}>
            <th scope="row">
              <Link to={href(`/commitment/${r.commitment}`)}>{r.title}</Link>
            </th>
            <td className="rests-num">{r.unspent ? `${formatMoney(r.unspent)} unspent` : ''}</td>
            <td className="rests-num is-avoidable">{r.avoidable ? `${formatMoney(r.avoidable)} avoidable` : ''}</td>
            <td className="rests-window">
              {r.window && (
                <>
                  <Mark kind="window" size={9} /> {formatDate(r.window.date)} <span className="rests-days">{daysAway(r.window.date, asOf)}</span>
                </>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function EvidenceLine({ row, ev, showAgent }: { row: BeliefRow; ev: Evidence; showAgent: boolean }) {
  const e = row.evaluation
  const steps = e.steps.map((s) => s.stance)
  // "1 contradicts", "3 contradict": the stance is the verb.
  const parts = (['contradicts', 'weakens', 'supports'] as const)
    .map((s) => [steps.filter((x) => x === s).length, s] as const)
    .filter(([n]) => n > 0)
    .map(([n, s]) => `${n} ${n === 1 ? s : s.slice(0, -1)}`)
  const agent = showAgent ? unreviewedAgent(e).at(-1) : undefined
  return (
    <div className="flag-evidence">
      <span>Evidence: {parts.join(' · ') || 'none yet'}</span>
      {agent && <AgentNote stance={agent.stance} note={agent.note} claim={ev.claim(agent.claim)?.statement} />}
    </div>
  )
}

function AgentNote({ stance, note, claim }: { stance: string; note?: string; claim?: string }) {
  return (
    <p className="agent-note">
      <span className="agent-mark">Agent · unreviewed</span> {stance}
      {note ? `: ${note}` : claim ? `: ${claim}` : ''}
    </p>
  )
}

function QuietRow({ row, ev, showAgent, selected, onSelect }: { row: WatchRow; ev: Evidence; showAgent: boolean; selected: boolean; onSelect: (id?: string) => void }) {
  const b = row.kind === 'belief' ? ev.belief(row.belief) : undefined
  const metric = row.kind === 'belief' ? b?.metric : row.kind === 'tripwire' ? row.tripwire.metric : undefined
  const fmt = ev.format(metric)
  const state = row.kind === 'belief' ? row.state : 'weakening'
  const last = row.kind === 'belief' ? row.evaluation.readings.at(-1) : row.kind === 'tripwire' ? row.latest : undefined
  const agent = showAgent && row.kind === 'belief' ? unreviewedAgent(row.evaluation).at(-1) : undefined
  const next = row.kind === 'belief' ? row.next : undefined
  return (
    <li className={`quiet-row${selected ? ' is-selected' : ''}`} onClick={rowClick(row.id, onSelect)}>
      <span className="quiet-glyph">
        <StateGlyph state={state} />
      </span>
      <div className="quiet-main">
        <button type="button" className="quiet-title" onClick={() => onSelect(row.id)} aria-expanded={selected}>
          {rowTitle(row, ev)}
        </button>
        <p className="quiet-why">
          {row.quiet && <strong>{quietText(row.quiet, fmt)}</strong>}
          {!row.quiet && row.kind === 'belief' && (row.resters.length ? `Rests on it: ${plural(row.resters.length, 'commitment')}` : 'Nothing of ours rests on it')}
          {row.firstWindow && row.quiet && <> · first window {formatDate(row.firstWindow.date)}</>}
          {next && <> · next: {next.source}, {formatDate(next.date)}</>}
        </p>
        {agent && <AgentNote stance={agent.stance} note={agent.note} claim={ev.claim(agent.claim)?.statement} />}
      </div>
      <span className="quiet-value">{last && fmt(last.value)}</span>
    </li>
  )
}
