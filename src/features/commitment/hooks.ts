import { useMemo } from 'react'
import { type CommitmentDetail, DETAIL_QUERIES, buildDetail, currentOrigin } from '../../domain/detail.ts'
import { useGatewayQuery, useQueryRows, useSettled } from '../../gateway/react.tsx'
import { endOf } from '../../wire.ts'
import { useRouteState } from '../shared/routeState.ts'
import { usePortfolio } from '../shared/usePortfolio.ts'

// Everything the detail pane needs for one commitment, as of the route's date. Built only from answers that are
// all for this date (as usePortfolioAt is); until they are, the previous date's detail stays on screen.

export function useCommitmentDetail(slug: string | undefined): { detail?: CommitmentDetail; isLoading: boolean; error?: Error } {
  const { asOf } = useRouteState()
  const { portfolio, error: portfolioError } = usePortfolio()
  const { rows, settled: rowsSettled, error: rowsError } = useQueryRows(DETAIL_QUERIES, asOf)
  const expected = useGatewayQuery('expected_evidence', { after: endOf(asOf) }, asOf)
  const decision = slug && rows ? currentOrigin(rows.origins, slug)?.decision : undefined
  // Only a commitment with an originating decision has approvals to ask for.
  const approvals = useGatewayQuery('approvals', { decision: decision ?? '' }, asOf, { enabled: !!decision })

  const fresh = (q: { data?: unknown; isPlaceholderData: boolean }) => q.data !== undefined && !q.isPlaceholderData
  const settled = !!(portfolio && slug && rowsSettled && fresh(expected) && (!decision || fresh(approvals)))
  const built = useMemo(
    () => (settled ? buildDetail(portfolio!, { ...rows!, expected: expected.data!, approvals: decision ? approvals.data! : [] }, slug!) : undefined),
    [settled, portfolio, slug, rows, expected.data, approvals.data, decision],
  )
  // The last detail built stays while the next date loads, but never stands in for another commitment's.
  const last = useSettled(built, settled)
  const detail = last?.view.commitment === slug ? last : undefined
  const error = portfolioError ?? rowsError ?? expected.error ?? approvals.error ?? undefined
  // Not loading, no error and no detail: the slug names no commitment.
  return { detail, isLoading: !settled && !error, error }
}
