import { useMemo } from 'react'
import { type CommitmentDetail, type DetailRows, DETAIL_QUERIES, buildDetail } from '../../domain/detail.ts'
import { expectedAfter } from '../../domain/portfolio.ts'
import { useGatewayQuery, useQueryRows } from '../../gateway/react.tsx'
import { useRouteState } from '../shared/routeState.ts'
import { usePortfolio } from '../shared/usePortfolio.ts'

// Everything the detail pane needs for one commitment, as of the route's date.

export function useCommitmentDetail(slug: string | undefined): { detail?: CommitmentDetail; isLoading: boolean } {
  const { asOf } = useRouteState()
  const { portfolio } = usePortfolio()
  const { rows } = useQueryRows(DETAIL_QUERIES, asOf)
  const expected = useGatewayQuery('expected_evidence', { after: expectedAfter(asOf) }, asOf)
  const decision = rows?.origins.filter((o) => o.commitment === slug).at(-1)?.decision
  const approvals = useGatewayQuery('approvals', { decision: decision ?? '' }, asOf)

  const ready = !!(portfolio && slug && rows && expected.data && approvals.data)
  const detail = useMemo(() => {
    if (!ready) return undefined
    const all: DetailRows = { ...rows!, expected: expected.data!, approvals: decision ? approvals.data! : [] }
    return buildDetail(portfolio!, all, slug!)
  }, [ready, portfolio, slug, rows, expected.data, approvals.data, decision])
  // Not loading and no detail: the slug names no commitment.
  return { detail, isLoading: !ready }
}
