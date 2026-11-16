import { describe, expect, it } from 'vitest'
import type { QueryRow } from '../model/generated.ts'
import { type Judgment, evaluateBelief, ruleStance } from './watchState.ts'

const gpu: QueryRow<'beliefs'> = { belief: 'gpuPrice', kind: 'assumption', statement: 'H100 at or above $1.70', status: 'hypothesized', metric: 'h100', comparator: 'ge', threshold: 1.7, hard_threshold: 1.5 }
const top3: QueryRow<'beliefs'> = { belief: 'cwTop3', kind: 'assumption', statement: 'Top three at or below 75%', status: 'hypothesized', metric: 'cwTop3', comparator: 'le', threshold: 75, hard_threshold: 80 }
const rising: QueryRow<'beliefs'> = { belief: 'rr', kind: 'assumption', statement: 'Revenue keeps rising', status: 'hypothesized', metric: 'rr', trend: 'rising' }
const qual: QueryRow<'beliefs'> = { belief: 'openai', kind: 'assumption', statement: 'OpenAI raises on schedule', status: 'hypothesized' }

const claim = (slug: string, metric: string, value: number, recorded: string): QueryRow<'metric_claims'> => ({
  claim: slug,
  metric,
  value,
  statement: slug,
  kind: 'observation',
  status: 'verified',
  observed_at: `${recorded}T00:00:00Z`,
  recorded_at: `${recorded}T12:00:00Z`,
  source: 's',
  source_title: 'S',
  source_kind: 'web',
})

describe('ruleStance', () => {
  it('holds at the line, weakens between the lines, contradicts past the hard line', () => {
    expect(ruleStance(gpu, 1.7)).toBe('supports')
    expect(ruleStance(gpu, 1.62)).toBe('weakens')
    expect(ruleStance(gpu, 1.5)).toBe('weakens')
    expect(ruleStance(gpu, 1.49)).toBe('contradicts')
    expect(ruleStance(top3, 75)).toBe('supports')
    expect(ruleStance(top3, 76.8)).toBe('weakens')
    expect(ruleStance(top3, 80.1)).toBe('contradicts')
  })

  it('weakens near the line only when moving the wrong way', () => {
    expect(ruleStance(gpu, 1.72, 1.8)).toBe('weakens')
    expect(ruleStance(gpu, 1.72, 1.65)).toBe('supports')
  })

  it('reads trends against the previous reading', () => {
    expect(ruleStance(rising, 47)).toBe('supports')
    expect(ruleStance(rising, 53, 47)).toBe('supports')
    expect(ruleStance(rising, 53, 53)).toBe('weakens')
    expect(ruleStance(rising, 50, 53)).toBe('contradicts')
  })
})

describe('evaluateBelief', () => {
  const series = [claim('a', 'h100', 2.1, '2026-10-03'), claim('b', 'h100', 1.62, '2027-02-03'), claim('c', 'h100', 1.47, '2027-03-03')]

  it('takes the newest reading and dates the run', () => {
    const e = evaluateBelief(gpu, series, [])
    expect(e).toMatchObject({ state: 'contradicting', basis: 'rule', newest: 'c', since: '2027-03-03' })
    expect(evaluateBelief(gpu, series.slice(0, 2), [])).toMatchObject({ state: 'weakening', since: '2027-02-03' })
    expect(e.movedSince).toBe('2027-02-03')
    expect(evaluateBelief(gpu, series.slice(0, 1), []).movedSince).toBeUndefined()
  })

  it('takes the owner judgment for a belief with no metric, and ignores the agent', () => {
    const j = (claim: string, stance: Judgment['stance'], at: string, agent = false): Judgment => ({ claim, belief: 'openai', stance, by: agent ? 'bot' : 'cto', at, agent })
    const judged = [j('r8', 'supports', '2026-09-30'), j('m2', 'weakens', '2026-12-10'), j('h2', 'contradicts', '2027-02-12', true)]
    const e = evaluateBelief(qual, [], judged)
    expect(e.state).toBe('weakening')
    expect(e.agentDiffers?.claim).toBe('h2')
    expect(evaluateBelief(qual, [], [...judged, j('h2', 'contradicts', '2027-02-14')]).state).toBe('contradicting')
  })

  it('is untested with no evidence', () => {
    expect(evaluateBelief(qual, [], []).state).toBe('untested')
  })
})
