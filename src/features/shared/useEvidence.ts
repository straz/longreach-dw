import { useMemo } from 'react'
import { formatMetric } from '../../domain/format.ts'
import { useQueryRows } from '../../gateway/react.tsx'
import type { QueryRow } from '../../model/generated.ts'
import { useRouteState } from './routeState.ts'
import { type Indicator, useIndicators } from './usePortfolio.ts'

// The records a Watch row names, by slug: beliefs, claims, actors and how
// each metric prints. Shared by the Watch views and the belief panel.

const EVIDENCE_QUERIES = ['beliefs', 'claims', 'metric_claims', 'actors'] as const

export type Evidence = {
  ready: boolean
  belief: (slug: string) => QueryRow<'beliefs'> | undefined
  claim: (slug: string) => QueryRow<'claims'> | undefined
  claims: QueryRow<'claims'>[]
  beliefs: QueryRow<'beliefs'>[]
  metricClaims: QueryRow<'metric_claims'>[]
  actorName: (slug: string) => string
  indicator: (metric?: string) => Indicator | undefined
  /** A metric's position in indicators.yml, for a stable order. */
  metricOrder: (metric: string) => number
  /** Prints a value of this metric as its indicator does. */
  format: (metric?: string) => (v: number) => string
}

export function useEvidence(): Evidence {
  const { asOf } = useRouteState()
  // One consistent set of answers, so lookups never mix two as-of dates.
  const { rows } = useQueryRows(EVIDENCE_QUERIES, asOf)
  const { beliefs, claims, metric_claims: metricClaims, actors } = rows ?? {}
  const indicators = useIndicators()
  return useMemo(() => {
    const b = new Map(beliefs?.map((x) => [x.belief, x]))
    const k = new Map(claims?.map((x) => [x.claim, x]))
    const a = new Map(actors?.map((x) => [x.actor, x.name]))
    const order = new Map(Object.keys(indicators ?? {}).map((m, i) => [m, i]))
    return {
      ready: !!(beliefs && claims && metricClaims && actors && indicators),
      belief: (slug) => b.get(slug),
      claim: (slug) => k.get(slug),
      claims: claims ?? [],
      beliefs: beliefs ?? [],
      metricClaims: metricClaims ?? [],
      actorName: (slug) => a.get(slug) ?? slug,
      indicator: (metric) => (metric ? indicators?.[metric] : undefined),
      metricOrder: (metric) => order.get(metric) ?? Number.MAX_SAFE_INTEGER,
      format: (metric) => (v) => formatMetric(v, metric ? indicators?.[metric] : undefined),
    }
  }, [beliefs, claims, metricClaims, actors, indicators])
}
