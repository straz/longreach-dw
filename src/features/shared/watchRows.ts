import { formatDate } from '../../domain/format.ts'
import type { WatchRow } from '../../domain/materiality.ts'
import type { GapPoint } from '../../ui/charts/GapChart.tsx'
import type { Evidence } from './useEvidence.ts'

// How a Watch row is named and charted, in one place for the Flags rows, the
// Trends cells and the belief panel (and Phase 4's briefs).

export function rowTitle(r: WatchRow, ev: Evidence): string {
  switch (r.kind) {
    case 'belief':
      return ev.belief(r.belief)?.statement ?? r.belief
    case 'tripwire':
      return `Tripwire: ${r.tripwire.condition}`
    case 'dependency':
      return `${r.other.title} ends ${formatDate(r.ends)}`
    case 'revisit':
      return `Revisit due: ${r.review?.notes?.split('.')[0] ?? r.review?.review}`
  }
}

export type RowChart = {
  metric: string
  points: GapPoint[]
  threshold?: number
  hard?: number
  /** Which side of the line holds. A tripwire's "good" side is away from its line. */
  good: 'above' | 'below' | 'rising' | 'falling'
}

/** The series and lines a row is charted against: a measured belief's readings, or a tripwire's metric. */
export function rowChart(r: WatchRow, ev: Evidence): RowChart | undefined {
  if (r.kind === 'belief') {
    const b = ev.belief(r.belief)
    if (!b?.metric) return undefined
    return {
      metric: b.metric,
      points: r.evaluation.readings.map((x) => ({ date: x.observed_at.slice(0, 10), value: x.value, stance: x.stance })),
      threshold: b.threshold,
      hard: b.hard_threshold,
      good: goodSide(b),
    }
  }
  if (r.kind === 'tripwire' && r.tripwire.metric) {
    const metric = r.tripwire.metric
    return {
      metric,
      points: ev.metricClaims
        .filter((k) => k.metric === metric && k.value !== undefined)
        .map((k) => ({ date: (k.observed_at ?? k.recorded_at).slice(0, 10), value: k.value!, stance: 'supports' as const })),
      threshold: r.tripwire.threshold,
      good: r.tripwire.comparator === 'ge' || r.tripwire.comparator === 'gt' ? 'below' : 'above',
    }
  }
  return undefined
}

/** Which side of its line a belief holds on. */
export const goodSide = (b: { trend?: 'rising' | 'falling'; comparator?: string }): RowChart['good'] =>
  b.trend ?? (b.comparator === 'ge' || b.comparator === 'gt' ? 'above' : 'below')
