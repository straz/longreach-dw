import { useMemo } from 'react'
import { BRIEF_QUERIES, type Brief, type BriefSpec, buildBriefs } from '../../domain/briefs.ts'
import type { WatchRow } from '../../domain/materiality.ts'
import { useQueryRows, useSettled } from '../../gateway/react.tsx'
import { useRouteState } from './routeState.ts'
import { useDemoContent } from './client.tsx'
import { usePortfolio } from './usePortfolio.ts'

// The briefs visible as of the route's date: authored paths (briefs.yml)
// joined with the graph's reviews and decisions and the Watch flags.

export function useBriefs(): { briefs?: Brief[]; error?: Error } {
  const { asOf } = useRouteState()
  const { portfolio, error } = usePortfolio()
  const specs: BriefSpec[] = useDemoContent().briefs
  const { rows, settled: rowsSettled, error: rowsError } = useQueryRows(BRIEF_QUERIES, asOf)
  // Only when the portfolio and the reviews describe the same date; until then, the last briefs that did.
  const settled = rowsSettled && portfolio?.asOf === asOf
  const fresh = useMemo(() => (settled && rows ? buildBriefs(specs, portfolio!, rows) : undefined), [settled, specs, portfolio, rows])
  return { briefs: useSettled(fresh, settled), error: error ?? rowsError }
}

/** The open (or deferred) brief a Watch row belongs to, for its Reconsider link. */
export const briefFor = (briefs: Brief[] | undefined, row: WatchRow): Brief | undefined =>
  briefs?.find((b) => b.state !== 'decided' && (row.kind === 'belief' ? b.spec.beliefs.includes(row.belief) : true) && row.commitments.some((c) => b.spec.commitments.includes(c)))
