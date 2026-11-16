import { Link } from 'react-router'
import { findRow, inScope } from '../../domain/materiality.ts'
import BeliefPanel from '../shared/BeliefPanel.tsx'
import CommitmentList from '../shared/CommitmentList.tsx'
import GraphError from '../shared/GraphError.tsx'
import { useRouteState } from '../shared/routeState.ts'
import { usePortfolio } from '../shared/usePortfolio.ts'
import ComingUpView from './ComingUpView.tsx'
import EvidenceView from './EvidenceView.tsx'
import FlagsView from './FlagsView.tsx'
import { VIEWS, useWatchParams, watchPath } from './params.ts'
import TrendsView from './TrendsView.tsx'
import './WatchTab.css'

// The Watch tab (docs/PLAN.md §4.3): the commitment list as a scope filter on
// the left; Flags, Trends, Evidence and Coming up in the middle; the open
// row's belief panel on the right.

export default function WatchTab() {
  const { portfolio, error } = usePortfolio()
  const { view, scope, row, select } = useWatchParams()
  const { href } = useRouteState()
  if (error) return <GraphError error={error} />

  const scoped = scope ? portfolio?.commitments.find((c) => c.commitment === scope) : undefined
  const open = portfolio && row ? findRow(portfolio.watch, row) : undefined
  const flagCount = (slug: string) => portfolio?.watch.flags.filter((r) => r.commitments.includes(slug)).length ?? 0

  return (
    <div className={`wtab${open ? ' has-panel' : ''}`}>
      <CommitmentList
        portfolio={portfolio}
        selected={scope}
        overview={{ label: 'All commitments', to: watchPath(view) }}
        rowPath={(s) => watchPath(view, s)}
        rowNote={(c) => {
          const n = flagCount(c.commitment)
          return n ? `${n} ${n === 1 ? 'flag' : 'flags'}` : undefined
        }}
      />
      <div className="wtab-main">
        <div className="wtab-bar">
          <nav className="wtab-views" aria-label="Watch views">
            {VIEWS.map((v) => (
              <Link key={v.slug} className={`wtab-view${v.slug === view ? ' is-current' : ''}`} to={href(watchPath(v.slug, scope))} aria-current={v.slug === view ? 'page' : undefined}>
                {v.label}
                {v.slug === 'flags' && portfolio && <span className="wtab-view-count">{portfolio.watch.flags.filter((r) => inScope(r, scope)).length}</span>}
              </Link>
            ))}
          </nav>
          {scoped && (
            <p className="wtab-scope">
              Scoped to <strong>{scoped.title}</strong>
              <Link to={href(watchPath(view))}>Show all</Link>
            </p>
          )}
        </div>
        <div className="wtab-body">
          {!portfolio ? (
            <ViewSkeleton />
          ) : view === 'flags' ? (
            <FlagsView portfolio={portfolio} scope={scope} selected={row} onSelect={select} />
          ) : view === 'trends' ? (
            <TrendsView portfolio={portfolio} scope={scope} selected={row} onSelect={select} />
          ) : view === 'evidence' ? (
            <EvidenceView portfolio={portfolio} scope={scope} selected={row} onSelect={select} />
          ) : (
            <ComingUpView portfolio={portfolio} scope={scope} />
          )}
        </div>
      </div>
      {open && portfolio && <BeliefPanel row={open} portfolio={portfolio} onClose={() => select(undefined)} onSelect={select} />}
    </div>
  )
}

function ViewSkeleton() {
  return (
    <div className="wtab-skeleton" aria-busy="true">
      {Array.from({ length: 4 }, (_, i) => (
        <span key={i} />
      ))}
    </div>
  )
}
