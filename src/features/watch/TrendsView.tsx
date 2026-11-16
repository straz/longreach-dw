import { formatDate } from '../../domain/format.ts'
import { type WatchRow, inScope } from '../../domain/materiality.ts'
import type { Portfolio } from '../../domain/portfolio.ts'
import GapChart from '../../ui/charts/GapChart.tsx'
import { StateTag } from '../../ui/stateVocabulary.tsx'
import { type Evidence, useEvidence } from '../shared/useEvidence.ts'
import { type RowChart, rowChart } from '../shared/watchRows.ts'
import { useClock } from '../shared/client.tsx'
import './TrendsView.css'

// Trends (docs/PLAN.md §4.3): one small chart per watched indicator, grouped
// by the company or market it describes, our own figures last. Every chart
// shares the same date axis, so a reader can compare when things moved.

type Props = { portfolio: Portfolio; scope?: string; selected?: string; onSelect: (id?: string) => void }

/** One indicator: the row it opens (its belief, or a tripwire on it) and that row's chart. */
type Cell = { row: WatchRow; chart: RowChart }

function cellsOf(p: Portfolio, ev: Evidence, scope?: string): Cell[] {
  const mine = scope ? new Set(p.commitments.find((c) => c.commitment === scope)?.foundations.map((f) => f.belief)) : undefined
  const cells = new Map<string, Cell>()
  for (const row of [...p.watch.flags, ...p.watch.moved, ...p.watch.holding]) {
    const wanted = row.kind === 'belief' ? (mine ? mine.has(row.belief) : row.resters.length > 0) : row.kind === 'tripwire' && inScope(row, scope)
    const chart = wanted ? rowChart(row, ev) : undefined
    if (chart && !cells.has(chart.metric)) cells.set(chart.metric, { row, chart })
  }
  // The order indicators.yml lists them in: fixed, so charts do not move as the as-of date does.
  return [...cells.values()].sort((a, b) => ev.metricOrder(a.chart.metric) - ev.metricOrder(b.chart.metric))
}

export default function TrendsView({ portfolio, scope, selected, onSelect }: Props) {
  const clock = useClock()
  const ev = useEvidence()
  if (!ev.ready) return null
  const cells = cellsOf(portfolio, ev, scope)
  const groups = new Map<string, Cell[]>()
  for (const c of cells) {
    const g = ev.indicator(c.chart.metric)?.group ?? 'Other'
    groups.set(g, [...(groups.get(g) ?? []), c])
  }
  // Groups in the order their first indicator is listed; our own figures last.
  const ordered = [...groups.entries()].sort(([a], [b]) => Number(a === 'Internal') - Number(b === 'Internal'))

  return (
    <div className="trends-view">
      <header className="wv-head">
        <div>
          <h1 className="wv-title">Trends</h1>
          <p className="wv-sub">
            {cells.length} indicators our assumptions are measured by, as of {formatDate(portfolio.asOf, { long: true })}, on one time axis from {formatDate(clock.earliest)}
          </p>
        </div>
      </header>
      {cells.length === 0 && <p className="flags-empty">No assumption this commitment rests on is measured by an indicator. Its assumptions are judged by their owners; see Flags.</p>}
      {ordered.map(([group, list]) => (
        <section key={group} className="trend-group">
          <h2 className="wv-section-title caps-label">
            {group}
            {group === 'Internal' && <span className="internal-mark">Internal</span>}
          </h2>
          <div className="trend-grid">
            {list.map((c) => (
              <TrendCell key={c.chart.metric} cell={c} asOf={portfolio.asOf} ev={ev} selected={selected === c.row.id} onSelect={onSelect} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

function TrendCell({ cell: { row, chart }, asOf, ev, selected, onSelect }: { cell: Cell; asOf: string; ev: Evidence; selected: boolean; onSelect: (id?: string) => void }) {
  const clock = useClock()
  const fmt = ev.format(chart.metric)
  const name = ev.indicator(chart.metric)?.name ?? chart.metric
  const [prev, last] = chart.points.slice(-2).length === 2 ? chart.points.slice(-2) : [undefined, chart.points.at(-1)]
  const trend = !last || !prev ? undefined : last.value > prev.value ? 'rising' : last.value < prev.value ? 'falling' : 'flat'
  const rests = row.resters.length
  return (
    <button type="button" className={`trend${selected ? ' is-selected' : ''}`} onClick={() => onSelect(row.id)} aria-pressed={selected}>
      <span className="trend-name">{name}</span>
      <span className="trend-now">
        {last && <strong>{fmt(last.value)}</strong>}
        {trend && <span className="trend-word">{trend}</span>}
        {row.kind === 'belief' ? <StateTag state={row.state} /> : <span className="trend-word">tripwire</span>}
      </span>
      <GapChart {...chart} start={clock.earliest} end={clock.today} asOf={asOf} format={fmt} width={268} height={84} label={`${name} trend`} />
      <span className="trend-foot">{rests ? `${rests} ${rests === 1 ? 'commitment rests' : 'commitments rest'} on its line` : 'Nothing of ours rests on it'}</span>
    </button>
  )
}
