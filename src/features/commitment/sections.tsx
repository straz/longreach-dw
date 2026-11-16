import { Link } from 'react-router'
import { formatDate, formatMetric } from '../../domain/format.ts'
import type { CommitmentDetail, Origin, TripwireView } from '../../domain/detail.ts'
import type { CommitmentView } from '../../domain/portfolio.ts'
import { ownerStances } from '../../domain/watchState.ts'
import Sparkline from '../../ui/charts/Sparkline.tsx'
import { StateGlyph, StateTag, toneOf } from '../../ui/stateVocabulary.tsx'
import { useClient } from '../shared/client.tsx'
import { useRouteState } from '../shared/routeState.ts'
import { useEvidence } from '../shared/useEvidence.ts'
import type { Indicator } from '../shared/usePortfolio.ts'
import { usePortfolio } from '../shared/usePortfolio.ts'

// The detail pane's sections below the promise (docs/PLAN.md §4.2).

const titleCase = (s: string) => s[0].toUpperCase() + s.slice(1).replace(/_/g, ' ')

export function Rationale({ origin }: { origin: Origin }) {
  const approvals = origin.approvals
  return (
    <section className="csec">
      <h2 className="csec-title caps-label">Original rationale</h2>
      <p className="rationale-line">
        <strong>{origin.statement}.</strong> Decided {formatDate(origin.decided_at.slice(0, 10), { long: true })}
        {origin.mandate && (
          <>
            {' '}
            under <span className="mandate">{origin.mandate.mandate}</span>
            {origin.mandate.limit_amount ? ` (up to $${origin.mandate.limit_amount}M)` : ''}
          </>
        )}
        {approvals.length > 0 && <>; approved by {approvals.map((a) => a.approver).join(', ')}</>}.
      </p>
      {origin.rationale && <p className="rationale-why">{origin.rationale}</p>}
      {origin.alternatives.length > 0 && (
        <ul className="alternatives">
          {origin.alternatives.map((a) => (
            <li key={a.slug} className={a.chosen ? 'is-chosen' : ''}>
              <span className="alt-tag">{a.chosen ? 'Chosen' : 'Considered'}</span>
              <span className="alt-statement">{a.statement}</span>
              {a.reasons.length > 0 && (
                <ul className="reasons">
                  {a.reasons.map((r) => (
                    <li key={r.reason} className={`is-${r.polarity}`}>
                      <span className="reason-sign" aria-label={r.polarity === 'pro' ? 'For' : 'Against'}>
                        {r.polarity === 'pro' ? '+' : '−'}
                      </span>
                      {r.statement}
                      {r.weight && r.weight !== 'minor' && <span className="reason-weight">{r.weight}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export function Assumptions({ view, indicators }: { view: CommitmentView; indicators?: Record<string, Indicator> }) {
  const { href } = useRouteState()
  const { portfolio } = usePortfolio()
  const ev = useEvidence()
  if (!view.foundations.length) {
    return (
      <section className="csec">
        <h2 className="csec-title caps-label">Economic assumptions</h2>
        <p className="csec-empty">None recorded. Nothing in Watch follows this commitment until an assumption is added.</p>
      </section>
    )
  }
  return (
    <section className="csec">
      <div className="csec-titlerow">
        <h2 className="csec-title caps-label">Economic assumptions</h2>
        <Link className="csec-link" to={href('/watch/flags', { c: view.commitment })}>
          Open in Watch
        </Link>
      </div>
      <ul className="assumptions">
        {view.foundations.map((f) => {
          const b = ev.belief(f.belief)
          const e = portfolio?.beliefs.get(f.belief)
          const ind = b?.metric ? indicators?.[b.metric] : undefined
          const last = e?.readings.at(-1)
          const judged = e?.basis === 'judgment' ? ownerStances(e.judgments).at(-1) : undefined
          const judgedClaim = judged && ev.claim(judged.claim)
          const tone = toneOf(f.state)
          return (
            <li key={f.belief} className={`assumption is-${f.state}`}>
              <span className={`nec-tag${f.necessary ? ' is-necessary' : ''}`}>{f.necessary ? 'Necessary' : 'Supporting'}</span>
              <div className="assumption-main">
                <p className="assumption-statement">{b?.statement ?? f.belief}</p>
                <p className="assumption-sub">
                  <StateTag state={f.state} />
                  {e?.since && f.state !== 'supported' && f.state !== 'untested' && <span> since {formatDate(e.since)}</span>}
                  {judged && (
                    <span className="assumption-judged">
                      {' '}
                      · {judged.note ?? judgedClaim?.statement}
                    </span>
                  )}
                  {e?.agentDiffers && <span className="agent-tag">Agent · unreviewed: {e.agentDiffers.stance}</span>}
                </p>
              </div>
              {b?.metric && e && (
                <div className="assumption-chart">
                  <Sparkline
                    points={e.readings.map((r) => ({ x: r.observed_at, y: r.value }))}
                    threshold={b.threshold}
                    hard={b.hard_threshold}
                    good={b.trend ?? (b.comparator === 'ge' || b.comparator === 'gt' ? 'above' : 'below')}
                    tone={tone}
                    label={`${ind?.name ?? b.metric} readings`}
                  />
                  {last && (
                    <span className={`assumption-value tone-${tone}`}>
                      {formatMetric(last.value, ind)}
                      <small>{formatDate(last.observed_at.slice(0, 10))}</small>
                    </span>
                  )}
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

export function SuccessCriteria({ tripwires, indicators }: { tripwires: TripwireView[]; indicators?: Record<string, Indicator> }) {
  return (
    <section className="csec">
      <h2 className="csec-title caps-label">Success criteria and tripwires</h2>
      <ul className="plain-list">
        {tripwires.map((t) => {
          const ind = t.metric ? indicators?.[t.metric] : undefined
          return (
            <li key={t.tripwire} className={t.fired ? 'is-moved' : t.near ? 'is-near' : ''}>
              <span className="list-lead">{t.kind === 'kill' ? 'Ends it' : 'Forces a review'}</span>
              <span>
                {titleCase(t.condition)}.{' '}
                {t.latest && (
                  <>
                    Now <strong>{formatMetric(t.latest.value, ind)}</strong> ({formatDate(t.latest.recorded_at.slice(0, 10))})
                    {t.fired ? ': reached.' : t.near ? ': close to the line.' : '.'}
                  </>
                )}
              </span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

export function Dependencies({ dependencies, horizon }: { dependencies: CommitmentDetail['dependencies']; horizon?: string }) {
  const { href } = useRouteState()
  const { org } = useClient()
  return (
    <section className="csec">
      <h2 className="csec-title caps-label">Dependencies</h2>
      <ul className="plain-list">
        {dependencies.map((d) => (
          <li key={`${d.direction}-${d.commitment.commitment}`} className={d.protectionGap ? 'is-gap' : ''}>
            <span className="list-lead">{d.direction === 'on' ? (d.kind === 'assumes' ? 'Assumes' : 'Requires') : 'Required by'}</span>
            <span>
              <Link to={href(`/commitment/${d.commitment.commitment}`)}>{d.commitment.title}</Link>
              {d.commitment.owner && d.commitment.owner.party !== org && !d.commitment.capital && <> ({d.commitment.owner.name})</>}
              {d.protectionGap && d.commitment.horizon_at && horizon && (
                <span className="gap-note">
                  Ends {formatDate(d.commitment.horizon_at, { long: true })}, before this commitment ends ({formatDate(horizon, { long: true })}).
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function Options({ options }: { options: CommitmentDetail['options'] }) {
  const { asOf } = useRouteState()
  return (
    <section className="csec">
      <h2 className="csec-title caps-label">Options and windows</h2>
      <ul className="plain-list">
        {options.map((o) => {
          const closed = o.closes_at && o.closes_at < asOf
          return (
            <li key={o.option} className={closed ? 'is-closed' : ''}>
              <span className="list-lead">{o.closes_at ? (closed ? `Closed ${formatDate(o.closes_at)}` : `Until ${formatDate(o.closes_at)}`) : 'Open'}</span>
              <span>
                {o.title}
                {o.exercise_cost ? <span className="list-aside"> · costs ${o.exercise_cost}M</span> : <span className="list-aside"> · no cost</span>}
              </span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

export function Risks({ risks }: { risks: CommitmentDetail['risks'] }) {
  return (
    <section className="csec">
      <h2 className="csec-title caps-label">Risk register</h2>
      <table className="risk-table">
        <tbody>
          {risks.map((r) => (
            <tr key={r.risk}>
              <th scope="row">{titleCase(r.kind)}</th>
              <td>
                <span className="risk-level" aria-label={`Level ${r.level} of 5`}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <i key={n} className={n <= r.level ? `is-on${r.level >= 4 ? ' is-high' : ''}` : ''} />
                  ))}
                </span>
              </td>
              <td className="risk-change">
                {r.previous !== undefined && r.previous !== r.level && (
                  <>
                    {r.previous > r.level ? 'down' : 'up'} from {r.previous}
                    {r.changed_at && `, ${formatDate(r.changed_at)}`}
                  </>
                )}
              </td>
              <td className="risk-drivers">{r.drivers.length ? `Driven by ${r.drivers.join(', ')}` : ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}

export function History({ history }: { history: CommitmentDetail['history'] }) {
  return (
    <section className="csec">
      <h2 className="csec-title caps-label">History</h2>
      <ol className="history">
        {history.map((h, i) => (
          <li key={i}>
            <span className="history-date">{formatDate(h.at.slice(0, 10), { long: true })}</span>
            <span>
              <StateGlyph state={h.kind === 'review' ? 'untested' : 'supported'} size={9} /> {titleCase(h.title)}
              {h.detail && <span className="list-aside"> · {h.detail}</span>}
            </span>
          </li>
        ))}
      </ol>
    </section>
  )
}
