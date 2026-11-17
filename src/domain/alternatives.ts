import type { QueryRow } from '../model/generated.ts'

// The alternatives a decision weighed, each with its reasons, chosen first.
// Shared by a commitment's origin (detail.ts) and a brief's decision (briefs.ts).

export type Alternative = QueryRow<'alternatives'> & { chosen: boolean; reasons: QueryRow<'reasons'>[] }

export function alternativesOf(decision: string, rows: { alternatives: QueryRow<'alternatives'>[]; chosen: QueryRow<'chosen'>[]; reasons: QueryRow<'reasons'>[] }): Alternative[] {
  return rows.alternatives
    .filter((a) => a.decision === decision)
    .map((a) => ({
      ...a,
      chosen: rows.chosen.some((c) => c.decision === decision && c.alternative === a.alternative),
      reasons: rows.reasons.filter((r) => r.alternative === a.alternative),
    }))
    .sort((a, b) => Number(b.chosen) - Number(a.chosen))
}
