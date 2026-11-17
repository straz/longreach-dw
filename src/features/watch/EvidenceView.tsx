import { useMemo, useState } from 'react'
import { dayOf } from '../../domain/dates.ts'
import { formatDate } from '../../domain/format.ts'
import type { Portfolio } from '../../domain/portfolio.ts'
import { type Evidence, useEvidence } from '../shared/useEvidence.ts'
import { STANCE_TEXT } from '../shared/watchWords.ts'
import './EvidenceView.css'

// Evidence (docs/PLAN.md §4.3): every claim that bears on one of our
// assumptions, newest first, with who judged it and how: by rule against
// the line, by the owner, or by the agent (marked, never setting a state).

type Props = { portfolio: Portfolio; scope?: string; selected?: string; onSelect: (id?: string) => void }

type Bearing = { belief: string; stance: keyof typeof STANCE_TEXT; by: 'rule' | 'owner' | 'agent'; who?: string }
type Origin = 'all' | 'external' | 'internal' | 'agent'

function bearings(p: Portfolio): Map<string, Bearing[]> {
  const out = new Map<string, Bearing[]>()
  const add = (claim: string, b: Bearing) => out.set(claim, [...(out.get(claim) ?? []), b])
  for (const e of p.beliefs.values()) {
    for (const r of e.readings) add(r.claim, { belief: e.belief, stance: r.stance, by: 'rule' })
    for (const j of e.judgments) add(j.claim, { belief: e.belief, stance: j.stance, by: j.agent ? 'agent' : 'owner', who: j.by })
  }
  return out
}

export default function EvidenceView({ portfolio, scope, selected, onSelect }: Props) {
  const ev = useEvidence()
  const [origin, setOrigin] = useState<Origin>('all')
  const [flagOnly, setFlagOnly] = useState(false)
  const bear = useMemo(() => bearings(portfolio), [portfolio])
  const flagged = new Set(portfolio.watch.flags.flatMap((r) => (r.kind === 'belief' ? [r.belief] : [])))
  const mine = scope ? new Set(portfolio.commitments.find((c) => c.commitment === scope)?.foundations.map((f) => f.belief)) : undefined
  const internal = (metric?: string) => ev.indicator(metric)?.kind === 'internal'

  const rows = ev.claims
    .filter((k) => bear.has(k.claim))
    .filter((k) => !mine || bear.get(k.claim)!.some((b) => mine.has(b.belief)))
    .filter((k) => origin === 'all' || (origin === 'internal' ? internal(k.metric) : origin === 'external' ? !internal(k.metric) : bear.get(k.claim)!.some((b) => b.by === 'agent')))
    .filter((k) => !flagOnly || bear.get(k.claim)!.some((b) => flagged.has(b.belief)))
    .sort((a, b) => b.recorded_at.localeCompare(a.recorded_at))

  return (
    <div className="evidence-view">
      <header className="wv-head">
        <div>
          <h1 className="wv-title">Evidence</h1>
          <p className="wv-sub">
            {rows.length} claims bearing on our assumptions, newest first · published on or before {formatDate(portfolio.asOf, { long: true })}
          </p>
        </div>
        <div className="ev-filters">
          <div className="seg" role="group" aria-label="Origin">
            {(['all', 'external', 'internal', 'agent'] as const).map((o) => (
              <button key={o} type="button" className={origin === o ? 'is-on' : ''} aria-pressed={origin === o} onClick={() => setOrigin(o)}>
                {o === 'all' ? 'All' : o === 'agent' ? 'Agent judged' : o[0].toUpperCase() + o.slice(1)}
              </button>
            ))}
          </div>
          <label className="wv-toggle">
            <input type="checkbox" checked={flagOnly} onChange={(e) => setFlagOnly(e.target.checked)} />
            Touches a flag
          </label>
        </div>
      </header>
      {rows.length === 0 && <p className="flags-empty">No claim matches these filters.</p>}
      <ol className="ev-list">
        {rows.map((k) => (
          <li key={k.claim} className="ev-row">
            <span className="ev-date">{formatDate(k.recorded_at)}</span>
            <div className="ev-main">
              <p className="ev-text">{k.statement}</p>
              <p className="ev-prov">
                <span className={internal(k.metric) ? 'internal-mark' : 'ext-mark'}>{internal(k.metric) ? 'Internal' : 'External'}</span>
                {k.source_title}
                {k.observed_at && dayOf(k.observed_at) !== dayOf(k.recorded_at) && <> · as of {formatDate(k.observed_at)}</>}
                {k.synthetic && <span className="synthetic-mark">Synthetic</span>}
              </p>
              <ul className="ev-bears">
                {dedupe(bear.get(k.claim)!).map((b) => (
                  <li key={`${b.belief}-${b.by}-${b.who ?? ''}`}>
                    <button type="button" className={`ev-bear is-${b.by}${flagged.has(b.belief) ? ' is-flagged' : ''}${selected === `belief:${b.belief}` ? ' is-selected' : ''}`} onClick={() => onSelect(`belief:${b.belief}`)}>
                      <span className={`bev-stance is-${b.stance}`}>{STANCE_TEXT[b.stance]}</span>
                      <span className="ev-bear-belief">{ev.belief(b.belief)?.statement ?? b.belief}</span>
                      <span className="ev-bear-by">{byText(b, ev)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}

const byText = (b: Bearing, ev: Evidence) => (b.by === 'rule' ? 'by rule' : b.by === 'agent' ? 'agent · unreviewed' : ev.actorName(b.who ?? ''))

const dedupe = (bs: Bearing[]) => bs.filter((b, i) => bs.findIndex((x) => x.belief === b.belief && x.by === b.by && x.who === b.who) === i)
