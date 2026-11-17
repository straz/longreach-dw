import { useMemo } from 'react'
import { type Portfolio, PORTFOLIO_QUERIES, buildPortfolio } from '../../domain/portfolio.ts'
import { useGatewayQuery, useQueryRows, useSettled } from '../../gateway/react.tsx'
import type { IsoDate } from '../../model/generated.ts'
import { endOf } from '../../wire.ts'
import { useClient, useClock, useDemoContent } from './client.tsx'
import { useRouteState } from './routeState.ts'

// The portfolio as of the route's date: the stored queries every tab needs,
// fetched in parallel and joined by domain/portfolio.ts.

export type PortfolioResult = {
  portfolio?: Portfolio
  /** First load only; later as-of changes keep the previous answer on screen. */
  isLoading: boolean
  /** A newer answer is on its way. */
  isUpdating: boolean
  error?: Error
}

export function usePortfolioAt(asOf: IsoDate): PortfolioResult {
  const { org } = useClient()
  const { rows, settled: rowsSettled, isUpdating, error } = useQueryRows(PORTFOLIO_QUERIES, asOf)
  const expected = useGatewayQuery('expected_evidence', { after: endOf(asOf) }, asOf)
  // Built only from answers for this date; until they are all in, the previous date's portfolio stays.
  const settled = rowsSettled && !!expected.data && !expected.isPlaceholderData
  const fresh = useMemo(() => (settled && rows ? buildPortfolio({ ...rows, expected: expected.data! }, asOf, org) : undefined), [settled, rows, expected.data, asOf, org])
  const portfolio = useSettled(fresh, settled)
  return {
    portfolio,
    isLoading: !portfolio,
    isUpdating: isUpdating || !settled || expected.isFetching,
    error: error ?? expected.error ?? undefined,
  }
}

/** The portfolio as of the route's as-of date. */
export function usePortfolio(): PortfolioResult {
  return usePortfolioAt(useRouteState().asOf)
}

/** The portfolio at the demo's today, to show how far a past view is from it. */
export function usePortfolioNow(): PortfolioResult {
  return usePortfolioAt(useClock().today)
}

export type Indicator = { name: string; unit: string; decimals: number; prefix?: string; suffix?: string; kind?: string; group: string }

/** How each metric is named and printed (the demo's indicators). */
export const useIndicators = () => useDemoContent().indicators
