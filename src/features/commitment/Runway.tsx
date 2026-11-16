import { Link } from 'react-router'
import { addDays } from '../../domain/dates.ts'
import { formatDate, formatMoney, monthName } from '../../domain/format.ts'
import type { Portfolio } from '../../domain/portfolio.ts'
import { runwayOf } from '../../domain/runway.ts'
import { Mark, monthTicks, timeScale } from '../../ui/charts/marks.tsx'
import { StateGlyph } from '../../ui/stateVocabulary.tsx'
import { useRouteState } from '../shared/routeState.ts'
import { useWidth } from '../shared/useWidth.ts'
import './Runway.css'

// The overview the Commitment tab opens on (docs/layouts.md): every active
// commitment on one time axis from the as-of date to the day its avoidable
// capital stops being avoidable. It answers "what closes when, for how much"
// with no clicks.

/** Month labels that fit: at least 44px apart, and clear of the as-of label. */
function labelled(ticks: string[], x: (d: string) => number, width: number): Set<string> {
  const keep = new Set<string>()
  // The first label sits at least 56px in, past the as-of label.
  let last = ((56 - 44) / Math.max(width, 1)) * 100
  for (const t of ticks) {
    if (x(t) - last < (44 / Math.max(width, 1)) * 100 || x(t) > 97) continue
    keep.add(t)
    last = x(t)
  }
  return keep
}

export default function Runway({ portfolio }: { portfolio?: Portfolio }) {
  const { asOf, href } = useRouteState()
  const [trackRef, trackWidth] = useWidth<HTMLSpanElement>()
  if (!portfolio) return <RunwaySkeleton />

  const base = runwayOf(portfolio.commitments, asOf)
  const lastWindow = base.rows.reduce((m, r) => (r.until && r.until > m ? r.until : m), asOf)
  const end = [base.end, addDays(lastWindow, 20)].sort().at(-1)!
  const x = timeScale(asOf, end, 0, 100)
  // Leave room for the as-of label at the left edge.
  const ticks = monthTicks(asOf, end)
  // Until measured, label every month; the first measurement thins them.
  const labels = trackWidth ? labelled(ticks, x, trackWidth) : new Set(ticks)
  const moved = base.rows.filter((r) => r.moved && r.until)
  const movedAvoidable = moved.reduce((s, r) => s + r.avoidable, 0)
  const lastMoved = moved.at(-1)?.until

  return (
    <section className="runway">
      <header className="runway-head">
        <div>
          <h1 className="runway-title">What closes when</h1>
          <p className="runway-lede">
            {moved.length ? (
              <>
                <strong>{formatMoney(movedAvoidable)}</strong> resting on moved assumptions can still be avoided, through{' '}
                {moved.length} windows that close between {formatDate(moved[0].until!)} and {formatDate(lastMoved!)}.
              </>
            ) : (
              <>No commitment rests on a contradicted assumption as of {formatDate(asOf, { long: true })}.</>
            )}
          </p>
        </div>
        <ul className="runway-legend" aria-label="Legend">
          <li>
            <span className="legend-bar is-moved" /> Rests on a contradicted assumption
          </li>
          <li>
            <span className="legend-bar" /> Assumptions hold or are only weakening
          </li>
          <li>
            <Mark kind="window" size={11} /> Option window closes
          </li>
        </ul>
      </header>

      <div className="runway-grid" role="table" aria-label="Active commitments by closing window">
        <div className="runway-row runway-axis" role="row">
          <span role="columnheader">Commitment</span>
          <span role="columnheader" className="runway-num">
            Total
          </span>
          <span role="columnheader" className="runway-track" ref={trackRef}>
            <span className="runway-today" style={{ left: '0%' }}>
              {formatDate(asOf)}
            </span>
            {ticks
              .filter((t) => labels.has(t))
              .map((t) => (
              <span key={t} className="runway-tick" style={{ left: `${x(t)}%` }}>
                {monthName(t)}
                {t.slice(5, 7) === '01' ? ` \u2019${t.slice(2, 4)}` : ''}
              </span>
              ))}
          </span>
        </div>

        {base.rows.map((r) => {
          const at = r.until ? x(r.until) : 0
          const flip = at > 72
          return (
            <Link key={r.commitment} role="row" className={`runway-row${r.moved ? ' is-moved' : ''}`} to={href(`/commitment/${r.commitment}`)}>
              <span role="cell" className="runway-name">
                <span className="runway-glyph">{r.worst && <StateGlyph state={r.worst} />}</span>
                <span className="runway-title-cell">{r.title}</span>
              </span>
              <span role="cell" className="runway-num">
                {formatMoney(r.total)}
              </span>
              <span role="cell" className="runway-track">
                {ticks.map((t) => (
                  <span key={t} className="runway-gridline" style={{ left: `${x(t)}%` }} />
                ))}
                {r.until ? (
                  <>
                    <span className="runway-bar" style={{ width: `${at}%` }} />
                    <span className="runway-diamond" style={{ left: `${at}%` }}>
                      <Mark kind="window" size={13} />
                    </span>
                    <span className={`runway-label${flip ? ' is-flipped' : ''}`} style={flip ? { right: `${100 - at}%` } : { left: `${at}%` }}>
                      <strong>{formatMoney(r.avoidable)}</strong> until {formatDate(r.until)}
                    </span>
                  </>
                ) : (
                  <span className="runway-none">{r.total ? 'No window: nothing left to avoid' : 'No capital committed'}</span>
                )}
              </span>
            </Link>
          )
        })}
      </div>
      <p className="runway-foot">
        Bars run from {formatDate(asOf, { long: true })} to the date each commitment's avoidable capital becomes irreversible. Open a commitment to see what it rests on.
      </p>
    </section>
  )
}

function RunwaySkeleton() {
  return (
    <section className="runway" aria-busy="true">
      <header className="runway-head">
        <div>
          <h1 className="runway-title">What closes when</h1>
          <span className="runway-skel is-lede" />
        </div>
      </header>
      <div className="runway-grid">
        {Array.from({ length: 10 }, (_, i) => (
          <div key={i} className="runway-row">
            <span className="runway-skel" style={{ width: `${55 + ((i * 29) % 40)}%` }} />
            <span />
            <span className="runway-track">
              <span className="runway-skel is-bar" style={{ width: `${10 + ((i * 17) % 60)}%` }} />
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}
