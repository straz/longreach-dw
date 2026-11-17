import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { addDays } from '../../domain/dates.ts'
import { formatDate, formatMoney } from '../../domain/format.ts'
import type { BeliefRow, Rester, WatchRow } from '../../domain/materiality.ts'
import type { Portfolio } from '../../domain/portfolio.ts'
import { type Judgment, STATE_OF, unreviewedAgent } from '../../domain/watchState.ts'
import { judge, reviewFlag } from '../../writes.ts'
import GapChart from '../../ui/charts/GapChart.tsx'
import type { MarkKind } from '../../ui/charts/marks.tsx'
import { StateGlyph, StateTag } from '../../ui/stateVocabulary.tsx'
import { useRouteState } from './routeState.ts'
import { briefFor, useBriefs } from './useBriefs.ts'
import { type Evidence, useEvidence } from './useEvidence.ts'
import { rowChart, rowTitle } from './watchRows.ts'
import { useService } from './useService.ts'
import { useWriteContext } from './useWriteContext.ts'
import WriteError from './WriteError.tsx'
import { CONDITION_TEXT, LIFECYCLE_LABEL, STANCE_TEXT, quietText } from './watchWords.ts'
import { useClock } from './client.tsx'
import './BeliefPanel.css'

// The belief panel (docs/PLAN.md §4.3, §4.5): one Watch row in full. The
// chart large, why it is or is not a flag, what rests on it, the evidence
// kept apart by who judged it, and the actions: agree with or dismiss the
// agent, mark the flag reviewed, open a commitment, reconsider.

type Props = { row: WatchRow; portfolio: Portfolio; onClose: () => void; onSelect: (id?: string) => void }

export default function BeliefPanel({ row, portfolio, onClose, onSelect }: Props) {
  const ev = useEvidence()
  const title = rowTitle(row, ev)
  const kindLabel = row.kind === 'belief' ? 'Assumption' : row.kind === 'tripwire' ? 'Tripwire' : row.kind === 'dependency' ? 'Another party’s commitment' : 'Deferred review'

  return (
    <aside className="bpanel" aria-label={`${kindLabel}: ${title}`}>
      <header className="bpanel-head">
        <div className="bpanel-titlerow">
          <h2 className="bpanel-title">{title}</h2>
          <button type="button" className="bpanel-close" onClick={onClose} aria-label="Close panel">
            <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
              <path d="M2 2 L10 10 M10 2 L2 10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="bpanel-status">
          <span className="bpanel-kind">{kindLabel}</span>
          {row.kind === 'belief' ? <StateTag state={row.state} /> : row.flagged ? <StateTag state="contradicting" label={row.kind === 'tripwire' ? 'Reached' : 'Flagged'} /> : <StateTag state="weakening" label="Near" />}
          {row.lifecycle && <span className={`lifecycle is-${row.lifecycle}`}>{LIFECYCLE_LABEL[row.lifecycle]}</span>}
        </div>
        {row.kind === 'belief' && ev.belief(row.belief)?.falsifier && <p className="bpanel-falsifier">Stops holding if {lower(ev.belief(row.belief)!.falsifier!)}</p>}
      </header>

      <div className="bpanel-body">
        <Why row={row} ev={ev} />
        <Chart row={row} portfolio={portfolio} ev={ev} />
        <RestsOn row={row} />
        {row.kind === 'belief' && <BeliefEvidence row={row} ev={ev} />}
        {row.kind === 'dependency' && (
          <section className="bsec">
            <h3 className="bsec-title caps-label">Assumptions that moved</h3>
            <ul className="bsec-list">
              {row.beliefs.map((b) => (
                <li key={b}>
                  <button type="button" className="btn-link" onClick={() => onSelect(`belief:${b}`)}>
                    {ev.belief(b)?.statement ?? b}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
        {row.review && (
          <section className="bsec">
            <h3 className="bsec-title caps-label">Last review</h3>
            <p className="bsec-text">
              {formatDate(row.review.held_at)}: {row.review.notes}
            </p>
          </section>
        )}
      </div>
      <Actions row={row} ev={ev} />
    </aside>
  )
}

const lower = (s: string) => s[0].toLowerCase() + s.slice(1)

function Why({ row, ev }: { row: WatchRow; ev: Evidence }) {
  const metric = row.kind === 'belief' ? ev.belief(row.belief)?.metric : row.kind === 'tripwire' ? row.tripwire.metric : undefined
  if (row.flagged)
    return (
      <section className="bsec bsec-why is-flag">
        <h3 className="bsec-title caps-label">Why it is a flag</h3>
        <ul className="bsec-list">
          {row.conditions.map((c) => (
            <li key={c}>{CONDITION_TEXT[c]}</li>
          ))}
        </ul>
      </section>
    )
  if (row.quiet)
    return (
      <section className="bsec bsec-why">
        <h3 className="bsec-title caps-label">Why it is not a flag</h3>
        <p className="bsec-text">{quietText(row.quiet, ev.format(metric))}. Weakening alone, or movement inside tolerance, never opens a brief.</p>
      </section>
    )
  return null
}

function Chart({ row, portfolio, ev }: { row: WatchRow; portfolio: Portfolio; ev: Evidence }) {
  const clock = useClock()
  const chart = rowChart(row, ev)
  if (!chart) return null
  const asOf = portfolio.asOf
  const marks: { date: string; kind: MarkKind; title: string }[] = [
    ...(row.kind === 'belief' && row.next ? [{ date: row.next.date, kind: 'report' as const, title: row.next.source }] : []),
    ...row.resters.filter((r) => r.window).map((r) => ({ date: r.window!.date, kind: 'window' as const, title: `${r.title}: ${r.window!.title}` })),
  ]
  // A fixed axis through the demo clock and what is coming after it, so moving as-of moves only the as-of line.
  const end = [addDays(clock.today, 45), ...marks.map((m) => m.date)].sort().at(-1)!
  const name = ev.indicator(chart.metric)?.name ?? chart.metric
  return (
    <section className="bsec">
      <h3 className="bsec-title caps-label">{name}</h3>
      <GapChart {...chart} start={clock.earliest} end={[end, addDays(clock.today, 120)].sort()[0]} asOf={asOf} format={ev.format(chart.metric)} marks={marks} width={352} height={168} axis label={`${name}, readings against the line`} />
    </section>
  )
}

function RestsOn({ row }: { row: WatchRow }) {
  const { href } = useRouteState()
  if (!row.resters.length) return null
  const title = row.kind === 'tripwire' ? 'Guards' : row.kind === 'belief' ? 'Rests on it' : 'Concerns'
  const order = (r: Rester) => (row.commitments.includes(r.commitment) ? 0 : r.necessary ? 1 : 2)
  return (
    <section className="bsec">
      <h3 className="bsec-title caps-label">{title}</h3>
      <ul className="brests">
        {[...row.resters].sort((a, b) => order(a) - order(b)).map((r) => (
          <li key={r.commitment} className={row.commitments.includes(r.commitment) ? 'is-flagged' : ''}>
            <Link to={href(`/commitment/${r.commitment}`)}>{r.title}</Link>
            <span className="brests-meta">
              {row.kind === 'belief' && <span>{r.necessary ? 'Necessary' : 'Supporting'}</span>}
              {!r.watched && <span>Not watched</span>}
              {r.unspent > 0 && <span>{formatMoney(r.unspent)} unspent</span>}
              {r.avoidable > 0 && <span className="is-avoidable">{formatMoney(r.avoidable)} avoidable</span>}
              {r.window && <span className="is-window">{r.window.title.toLowerCase().startsWith('avoidable') ? 'until' : 'window'} {formatDate(r.window.date)}</span>}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

function BeliefEvidence({ row, ev }: { row: BeliefRow; ev: Evidence }) {
  const e = row.evaluation
  const b = ev.belief(row.belief)
  const fmt = ev.format(b?.metric)
  const owners = e.judgments.filter((j) => !j.agent)
  const agents = e.judgments.filter((j) => j.agent)
  const open = new Set(unreviewedAgent(e).map((j) => j.claim))
  return (
    <section className="bsec">
      <h3 className="bsec-title caps-label">Evidence</h3>
      {e.readings.length > 0 && (
        <EvidenceGroup title="By rule, against the line">
          {[...e.readings].reverse().map((r) => {
            const k = ev.claim(r.claim)
            return (
              <li key={r.claim} className="bev">
                <span className="bev-lead">
                  <StateGlyph state={STATE_OF[r.stance]} /> {fmt(r.value)}
                </span>
                <span className="bev-text">{k?.statement}</span>
                <Provenance claim={k} at={r.recorded_at} />
              </li>
            )
          })}
        </EvidenceGroup>
      )}
      {owners.length > 0 && (
        <EvidenceGroup title="Owner judgments">
          {[...owners].reverse().map((j) => (
            <JudgmentItem key={`${j.claim}-${j.at}`} j={j} ev={ev} />
          ))}
        </EvidenceGroup>
      )}
      {agents.length > 0 && (
        <EvidenceGroup title="Evidence agent">
          {[...agents].reverse().map((j) => (
            <JudgmentItem key={`${j.claim}-${j.at}`} j={j} ev={ev} agent open={open.has(j.claim)} />
          ))}
        </EvidenceGroup>
      )}
      {!e.readings.length && !e.judgments.length && <p className="bsec-text">No evidence yet. {row.next ? `${row.next.source} is expected ${formatDate(row.next.date)}.` : ''}</p>}
      {row.next && (e.readings.length > 0 || e.judgments.length > 0) && (
        <p className="bev-next">
          Next: {row.next.source}, {formatDate(row.next.date)}
        </p>
      )}
    </section>
  )
}

function EvidenceGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="bev-group">
      <h4 className="bev-group-title">{title}</h4>
      <ul>{children}</ul>
    </div>
  )
}

function JudgmentItem({ j, ev, agent = false, open = false }: { j: Judgment; ev: Evidence; agent?: boolean; open?: boolean }) {
  const k = ev.claim(j.claim)
  const { readOnly, why } = useWriteContext()
  const run = useService(judge)
  const act = (stance: Judgment['stance'], note: string) => run.mutate({ claim: j.claim, belief: j.belief, stance, note })
  return (
    <li className={`bev${agent ? ' is-agent' : ''}${open ? ' is-open' : ''}`}>
      <span className="bev-lead">
        <span className={`bev-stance is-${j.stance}`}>{STANCE_TEXT[j.stance]}</span>
      </span>
      <span className="bev-text">
        {j.note ?? k?.statement}
        {j.note && k && <span className="bev-claim">{k.statement}</span>}
      </span>
      <span className="bev-prov">
        {agent ? <span className="agent-mark">{open ? 'Agent · unreviewed' : 'Agent · answered'}</span> : <span>{ev.actorName(j.by)}</span>} · {formatDate(j.at)}
        {k?.synthetic && <span className="synthetic-mark">Synthetic</span>}
      </span>
      {run.error && (
        <span className="bev-actions">
          <WriteError error={run.error} />
        </span>
      )}
      {open && (
        <span className="bev-actions">
          <button type="button" className="btn-line is-small" disabled={readOnly || run.isPending} title={readOnly ? why : undefined} onClick={() => act(j.stance, `Agreed with the evidence agent: ${j.note ?? ''}`.trim())}>
            Agree
          </button>
          <button type="button" className="btn-quiet is-small" disabled={readOnly || run.isPending} title={readOnly ? why : undefined} onClick={() => act('informs', 'Read the agent’s stance; it does not move this assumption.')}>
            Dismiss
          </button>
        </span>
      )}
    </li>
  )
}

function Provenance({ claim, at }: { claim?: { source_title: string; synthetic?: boolean }; at: string }) {
  return (
    <span className="bev-prov">
      {claim?.source_title} · {formatDate(at)}
      {claim?.synthetic && <span className="synthetic-mark">Synthetic</span>}
    </span>
  )
}

function Actions({ row, ev }: { row: WatchRow; ev: Evidence }) {
  const { href } = useRouteState()
  const { readOnly, why } = useWriteContext()
  const run = useService(reviewFlag)
  const brief = briefFor(useBriefs().briefs, row)
  if (!row.flagged) return null
  const subject = rowTitle(row, ev)
  return (
    <footer className="bpanel-foot">
      {run.error && <WriteError error={run.error} />}
      {row.lifecycle !== 'reviewed' && (
        <button type="button" className="btn-line" disabled={readOnly || run.isPending} title={readOnly ? why : undefined} onClick={() => run.mutate({ commitments: row.commitments, key: row.key, subject })}>
          {run.isPending ? 'Recording…' : 'Mark reviewed'}
        </button>
      )}
      {row.lifecycle === 'reviewed' && <span className="bpanel-done">Reviewed{row.review ? ` ${formatDate(row.review.held_at)}` : ''}</span>}
      <Link className="btn-action as-link" to={href(brief ? `/reconsider/${brief.spec.slug}` : '/reconsider')}>
        {brief?.state === 'deferred' ? 'Open the deferred brief' : 'Reconsider'}
      </Link>
    </footer>
  )
}
