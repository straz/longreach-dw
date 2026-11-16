import { Link } from 'react-router'
import { isLookingBack } from '../domain/clock.ts'
import { daysBetween } from '../domain/dates.ts'
import { formatDate, formatMoney, plural } from '../domain/format.ts'
import type { Portfolio } from '../domain/portfolio.ts'
import { useRouteState } from '../features/shared/routeState.ts'
import { usePortfolio, usePortfolioNow } from '../features/shared/usePortfolio.ts'
import { useClock } from '../features/shared/client.tsx'
import './HeadlineStrip.css'

// The answer to the demo's question in one line, on every tab
// (docs/PLAN.md §1.3). When looking back, each figure also shows where it
// stands at the demo clock, so the presenter can show how early it was knowable.

export default function HeadlineStrip() {
  const clock = useClock()
  const { asOf, href } = useRouteState()
  const { portfolio, isUpdating } = usePortfolio()
  const { portfolio: now } = usePortfolioNow()
  const back = isLookingBack(asOf, clock)

  if (!portfolio) return <HeadlineSkeleton />
  const h = portfolio.headline
  const windows = h.moved.filter((m) => m.capital.avoidable > 0 && m.capital.until).length
  const first = h.firstWindow && portfolio.commitments.find((c) => c.commitment === h.firstWindow!.commitment)
  const days = h.firstWindow ? daysBetween(asOf, h.firstWindow.date) : 0
  const compare = (value: (p: Portfolio) => number) => (back && now ? `${formatDate(clock.today)}: ${formatMoney(value(now))}` : undefined)

  return (
    <section className={`headline${isUpdating ? ' is-updating' : ''}`} aria-label="Headline">
      <Link className="headline-figure" to={href(`/commitment/${portfolio.program?.commitment ?? ''}`)}>
        <span className="headline-label">Authorized</span>
        <span className="headline-value">{formatMoney(h.authorized)}</span>
        <span className="headline-note">
          {formatMoney(h.committed)} committed · {formatMoney(h.authorized - h.committed)} headroom
        </span>
      </Link>

      <Link className={`headline-figure${h.movedCapital ? ' is-moved' : ''}`} to={href('/watch/flags')}>
        <span className="headline-label">Deployed under moved assumptions</span>
        <span className="headline-value">{formatMoney(h.movedCapital)}</span>
        <span className="headline-note">{compare((p) => p.headline.movedCapital) ?? (h.moved.length ? `in ${plural(h.moved.length, 'commitment')}` : 'Every necessary assumption holds')}</span>
      </Link>

      <Link className={`headline-figure${h.avoidable ? ' is-moved' : ''}`} to={href('/watch/coming-up')}>
        <span className="headline-label">Still avoidable</span>
        <span className="headline-value">{formatMoney(h.avoidable)}</span>
        <span className="headline-note">{compare((p) => p.headline.avoidable) ?? (windows ? `behind ${plural(windows, 'open window')}` : 'Nothing to avoid')}</span>
      </Link>

      {h.firstWindow && first ? (
        <Link className="headline-figure headline-window" to={href(`/commitment/${first.commitment}`)}>
          <span className="headline-label">First window</span>
          <span className="headline-value">
            {formatDate(h.firstWindow.date)}
            <span className="headline-days">{days === 0 ? 'today' : `in ${plural(days, 'day')}`}</span>
          </span>
          <span className="headline-note" title={first.title}>
            {[first.counterparty, first.nextWindow?.title.toLowerCase()].filter(Boolean).join(': ')}
          </span>
        </Link>
      ) : (
        <div className="headline-figure headline-window is-quiet">
          <span className="headline-label">First window</span>
          <span className="headline-value">None open</span>
          <span className="headline-note">No moved commitment has an option closing</span>
        </div>
      )}
    </section>
  )
}

function HeadlineSkeleton() {
  return (
    <section className="headline" aria-label="Headline" aria-busy="true">
      {['Authorized', 'Deployed under moved assumptions', 'Still avoidable', 'First window'].map((label) => (
        <div key={label} className="headline-figure">
          <span className="headline-label">{label}</span>
          <span className="headline-skeleton" />
          <span className="headline-skeleton is-note" />
        </div>
      ))}
    </section>
  )
}
