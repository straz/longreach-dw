import { Link, useSearchParams } from 'react-router'
import type { Brief } from '../../domain/briefs.ts'
import { daysAway, formatDate, formatMoney, monthName, plural } from '../../domain/format.ts'
import type { BeliefRow } from '../../domain/materiality.ts'
import { ownerStances } from '../../domain/watchState.ts'
import CapitalBar from '../../ui/charts/CapitalBar.tsx'
import GapChart from '../../ui/charts/GapChart.tsx'
import { Mark } from '../../ui/charts/marks.tsx'
import { StateTag } from '../../ui/stateVocabulary.tsx'
import { useClient } from '../shared/client.tsx'
import { useRouteState } from '../shared/routeState.ts'
import { type Evidence, useEvidence } from '../shared/useEvidence.ts'
import { usePortfolio } from '../shared/usePortfolio.ts'
import { LIFECYCLE_LABEL } from '../shared/watchWords.ts'
import { rowChart } from '../shared/watchRows.ts'
import DecisionRecord from './DecisionRecord.tsx'
import PathsTable from './PathsTable.tsx'
import { STATE_TEXT, briefLabel } from './words.ts'
import RecordForm from './RecordForm.tsx'
import { RECORDED } from './useDecisionWrite.ts'
import { useClock } from '../shared/client.tsx'
import './BriefView.css'

// One brief (docs/PLAN.md §2.6): the headline, the capital clock, what moved,
// the four paths, and the decision, recorded or to record.

export default function BriefView({ brief }: { brief: Brief }) {
  const ev = useEvidence()
  const { asOf } = useRouteState()
  const lifecycle = brief.rows.find((r) => r.flagged)?.lifecycle
  const label = briefLabel(brief.spec.slug)
  return (
    <article className="brief">
      <header className="brief-head">
        <p className="brief-status">
          <span className={`brief-pill is-${brief.state}`}>{STATE_TEXT[brief.state]}</span>
          {brief.state === 'open' && lifecycle && lifecycle !== 'new' && <span className={`lifecycle is-${lifecycle}`}>{LIFECYCLE_LABEL[lifecycle]}</span>}
          {brief.state === 'deferred' && brief.revisit && <span>Revisit {formatDate(brief.revisit)} {daysAway(brief.revisit, asOf)}</span>}
          {label && <span className="brief-id">{label}</span>}
        </p>
        <h1 className="brief-title">{brief.spec.title}</h1>
        {ev.ready && <p className="brief-lede">{headline(brief, ev, asOf)}</p>}
      </header>

      <Recorded />
      <CapitalClock brief={brief} />
      <WhatMoved brief={brief} ev={ev} />

      {brief.state === 'open' && brief.spec.paths && (
        <>
          <PathsTable brief={brief} />
          <RecordForm brief={brief} />
        </>
      )}
      {brief.decision && brief.state !== 'open' && <DecisionRecord brief={brief} />}
      {brief.state === 'open' && brief.decision && <DecisionRecord brief={brief} earlier />}
    </article>
  )
}

/** After recording: which decision, and how many records the graph took. */
function Recorded() {
  const [search, setSearch] = useSearchParams()
  const { graph } = useClient()
  const decision = search.get(RECORDED.decision)
  if (!decision) return null
  const dismiss = () =>
    setSearch((prev) => {
      const next = new URLSearchParams(prev)
      next.delete(RECORDED.decision)
      next.delete(RECORDED.count)
      return next
    })
  return (
    <p className="brief-recorded" role="status">
      <span>
        Recorded decision <code>{decision}</code>: {search.get(RECORDED.count)} records written to <code>{graph}</code>. Watch, the commitments' history and the headline now reflect it.
      </span>
      <button type="button" className="btn-quiet is-small" onClick={dismiss}>
        Dismiss
      </button>
    </p>
  )
}

/** The brief's first paragraph: what was authorized, under what assumption, what moved, by when it matters. */
function headline(b: Brief, ev: Evidence, asOf: string): string {
  const first = b.bundle.map((c) => c.committed_at).filter((d): d is string => !!d).sort()[0]
  const assumption = ev.belief(b.spec.beliefs[0])?.statement
  // A decided brief reads as it stood when it was decided.
  const until = b.state === 'open' ? undefined : b.decision?.held_at
  const moved = b.rows.filter((r) => r.state !== 'supported')
  const parts = [
    first && assumption ? `Authorized ${monthName(first)} ${first.slice(0, 4)} on the assumption “${assumption}.”` : undefined,
    ...moved.map((r, i) => movedSentence(r, ev, until, i > 0 ? `“${ev.belief(r.belief)?.statement ?? r.belief}”` : 'it')),
  ]
  if (b.state !== 'decided') {
    const window = b.firstWindow && ` The first window closes ${formatDate(b.firstWindow.date)} ${daysAway(b.firstWindow.date, asOf)}`.trimEnd()
    parts.push(`${plural(b.bundle.length, 'commitment')} and ${formatMoney(b.avoidable)} of avoidable capital rest on it.${window ? `${window}.` : ''}`)
  }
  return parts.filter(Boolean).join(' ')
}

/** What moved one belief, in a sentence: its newest reading, or its owner's newest judgment, up to `until`. */
function movedSentence(r: BeliefRow, ev: Evidence, until?: string, subject = 'it'): string | undefined {
  const b = ev.belief(r.belief)
  const before = (at: string) => !until || at <= until
  const last = r.evaluation.readings.filter((x) => before(x.recorded_at)).at(-1)
  if (b?.metric && last) {
    const fmt = ev.format(b.metric)
    const ind = ev.indicator(b.metric)?.name ?? b.metric
    const line = r.state === 'contradicting' && b.hard_threshold !== undefined ? `past its ${fmt(b.hard_threshold)} limit` : b.threshold !== undefined ? `against a ${fmt(b.threshold)} line` : ''
    return `${ind} was ${fmt(last.value)} in ${monthName(last.observed_at)}, ${line}.`
  }
  const judged = ownerStances(r.evaluation.judgments)
    .filter((j) => before(j.at))
    .at(-1)
  if (!judged) return undefined
  return `${ev.actorName(judged.by)} judged ${subject} ${judged.stance === 'contradicts' ? 'contradicted' : judged.stance === 'weakens' ? 'weakening' : 'holding'} on ${formatDate(judged.at)}${judged.note ? `: ${judged.note}` : '.'}`
}

function CapitalClock({ brief }: { brief: Brief }) {
  const { href } = useRouteState()
  const { portfolio } = usePortfolio()
  const scale = Math.max(...brief.bundle.map((c) => c.capital?.total ?? 0), 1)
  const bundle = new Set(brief.spec.commitments)
  const dates = (portfolio?.comingUp ?? []).filter((i) => i.commitments.some((c) => bundle.has(c)) || i.beliefs.some((b) => brief.spec.beliefs.includes(b))).slice(0, 8)
  return (
    <section className="bsection">
      <h2 className="caps-label">Capital clock</h2>
      <table className="clock">
        <tbody>
          {brief.bundle.map((c) => (
            <tr key={c.commitment}>
              <th scope="row">
                <Link to={href(`/commitment/${c.commitment}`)}>{c.title}</Link>
              </th>
              <td className="clock-bar">{c.capital && <CapitalBar sunk={c.capital.sunk} unspent={c.capital.unspent} avoidable={c.capital.avoidable} scale={scale} tone={brief.state === 'decided' ? 'calm' : 'moved'} label={`${c.title}: ${formatMoney(c.capital.sunk)} sunk, ${formatMoney(c.capital.unspent)} unspent`} />}</td>
              <td className="clock-num">{c.capital ? `${formatMoney(c.capital.unspent)} unspent` : ''}</td>
              <td className="clock-num is-avoidable">{c.capital?.avoidable ? `${formatMoney(c.capital.avoidable)} avoidable` : ''}</td>
              <td className="clock-until">{c.capital?.avoidable && c.capital.until ? `until ${formatDate(c.capital.until)}` : c.status === 'past' ? c.state : ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {dates.length > 0 && (
        <ul className="clock-dates">
          {dates.map((d) => (
            <li key={`${d.kind}-${d.date}-${d.title}`} className={`is-${d.kind}`}>
              <Mark kind={d.kind} size={10} />
              <span className="clock-date">{formatDate(d.date)}</span> {d.title}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function WhatMoved({ brief, ev }: { brief: Brief; ev: Evidence }) {
  const clock = useClock()
  const { href, asOf } = useRouteState()
  return (
    <section className="bsection">
      <h2 className="caps-label">What moved</h2>
      <div className="moved-grid">
        {brief.rows.map((r) => {
          const chart = rowChart(r, ev)
          return (
            <div key={r.id} className="moved">
              <p className="moved-title">{ev.belief(r.belief)?.statement ?? r.belief}</p>
              <p className="moved-sub">
                <StateTag state={r.state} />
                {r.evaluation.movedSince && <span> since {formatDate(r.evaluation.movedSince)}</span>}
                <Link to={href('/watch/flags', { row: r.id })}>Open in Watch</Link>
              </p>
              {chart ? (
                <GapChart {...chart} start={clock.earliest} end={clock.today} asOf={asOf} format={ev.format(chart.metric)} width={300} height={92} label={`${ev.indicator(chart.metric)?.name ?? chart.metric}, readings`} />
              ) : (
                <p className="moved-note">{movedSentence(r, ev) ?? 'No evidence judged yet.'}</p>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
