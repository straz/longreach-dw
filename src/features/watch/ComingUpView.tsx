import { Link } from 'react-router'
import type { ComingItem } from '../../domain/comingUp.ts'
import { COMING_UP_DAYS } from '../../domain/comingUp.ts'
import { addDays } from '../../domain/dates.ts'
import { daysAway, formatDate, formatMoney, monthName } from '../../domain/format.ts'
import { inScope } from '../../domain/materiality.ts'
import type { Portfolio } from '../../domain/portfolio.ts'
import { Mark, monthTicks, timeScale } from '../../ui/charts/marks.tsx'
import { useRouteState } from '../shared/routeState.ts'
import { type Evidence, useEvidence } from '../shared/useEvidence.ts'
import { useWidth } from '../shared/useWidth.ts'
import { quietText } from '../shared/watchWords.ts'
import './ComingUpView.css'

// Coming up (docs/PLAN.md §4.3): the next 180 days on one strip, then the
// same items by month. What a CFO opens before a board meeting.

export default function ComingUpView({ portfolio, scope }: { portfolio: Portfolio; scope?: string }) {
  const { asOf } = portfolio
  const items = portfolio.comingUp.filter((i) => !scope || i.commitments.includes(scope))
  const near = portfolio.watch.moved.filter((r) => r.kind === 'tripwire' && inScope(r, scope))
  const months = new Map<string, ComingItem[]>()
  for (const i of items) months.set(i.date.slice(0, 7), [...(months.get(i.date.slice(0, 7)) ?? []), i])
  const ev = useEvidence()

  return (
    <div className="coming-view">
      <header className="wv-head">
        <div>
          <h1 className="wv-title">Coming up</h1>
          <p className="wv-sub">
            {items.length} dated items from {formatDate(asOf)} to {formatDate(addDays(asOf, COMING_UP_DAYS), { long: true })}
          </p>
        </div>
      </header>
      <Strip items={items} asOf={asOf} />
      {near.length > 0 && (
        <section className="coming-near">
          <h2 className="wv-section-title caps-label">Near a line now</h2>
          <ul>
            {near.map((r) =>
              r.kind === 'tripwire' ? (
                <li key={r.id}>
                  <Mark kind="report" size={11} /> Tripwire: {r.tripwire.condition}. Now {r.latest && ev.format(r.tripwire.metric)(r.latest.value)}; {r.quiet && quietText(r.quiet, ev.format(r.tripwire.metric)).toLowerCase()}.
                </li>
              ) : null,
            )}
          </ul>
        </section>
      )}
      {items.length === 0 && <p className="flags-empty">Nothing dated in the next 180 days{scope ? ' for this commitment' : ''}.</p>}
      {[...months.entries()].map(([month, list]) => (
        <section key={month} className="coming-month">
          <h2 className="wv-section-title caps-label">
            {monthName(month, { long: true })} {month.slice(0, 4)}
          </h2>
          <ol className="coming-list">
            {list.map((i) => (
              <Item key={`${i.kind}-${i.date}-${i.title}-${i.commitments.join()}`} item={i} portfolio={portfolio} ev={ev} />
            ))}
          </ol>
        </section>
      ))}
    </div>
  )
}

function Item({ item, portfolio, ev }: { item: ComingItem; portfolio: Portfolio; ev: Evidence }) {
  const { href } = useRouteState()
  const name = (slug: string) => portfolio.commitments.find((c) => c.commitment === slug)?.title ?? slug
  return (
    <li className={`coming-item is-${item.kind}${item.flagged ? ' is-flagged' : ''}`}>
      <span className="coming-date">
        {formatDate(item.date)} <small>{daysAway(item.date, portfolio.asOf)}</small>
      </span>
      <span className="coming-mark">
        <Mark kind={item.kind} size={12} />
      </span>
      <div className="coming-main">
        <p className="coming-title">
          {item.title}
          {item.also.length > 0 && <span className="coming-also"> · or {item.also.join('; or ').replace(/^./, (c) => c.toLowerCase())}</span>}
        </p>
        <p className="coming-sub">
          {item.commitments.map((c, i) => (
            <span key={c}>
              {i > 0 && ', '}
              <Link to={href(`/commitment/${c}`)}>{name(c)}</Link>
            </span>
          ))}
          {item.kind === 'report' && item.beliefs.length > 0 && (
            <span className="coming-informs">
              {item.commitments.length ? ' · ' : ''}informs {item.beliefs.map((b) => ev.belief(b)?.statement ?? b).join('; ')}
            </span>
          )}
        </p>
      </div>
      <span className="coming-amount">
        {item.amount !== undefined && <strong>{formatMoney(item.amount)} avoidable</strong>}
        {item.cost !== undefined && <small>costs {formatMoney(item.cost)}</small>}
      </span>
    </li>
  )
}

function Strip({ items, asOf }: { items: ComingItem[]; asOf: string }) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const end = addDays(asOf, COMING_UP_DAYS)
  const x = timeScale(asOf, end, 8, Math.max(width - 8, 9))
  const byDate = new Map<string, number>()
  return (
    <div className="coming-strip" ref={ref}>
      {width > 0 && (
        <svg width={width} height={88} role="img" aria-label="The next 180 days">
          {monthTicks(asOf, end).map((d) => (
            <g key={d}>
              <line className="strip-tick" x1={x(d)} x2={x(d)} y1={6} y2={70} />
              <text className="strip-month" x={x(d) + 4} y={84}>
                {monthName(d)}
              </text>
            </g>
          ))}
          <line className="strip-axis" x1={8} x2={width - 8} y1={70} y2={70} />
          <line className="strip-asof" x1={x(asOf)} x2={x(asOf)} y1={2} y2={74} />
          {items.map((i) => {
            const n = byDate.get(i.date) ?? 0
            byDate.set(i.date, n + 1)
            return (
              <g key={`${i.kind}-${i.date}-${i.title}-${i.commitments.join()}`} className={i.flagged ? 'is-flagged' : 'is-calm'} transform={`translate(${x(i.date) - 6}, ${56 - n * 12})`}>
                <title>{`${formatDate(i.date)}: ${i.title}`}</title>
                <Mark kind={i.kind} size={12} />
              </g>
            )
          })}
        </svg>
      )}
    </div>
  )
}
