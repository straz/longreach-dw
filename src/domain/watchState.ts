import type { QueryRow } from '../model/generated.ts'
import { isAtLeast, meets } from './comparator.ts'
import { dayOf } from './dates.ts'

// The state of a belief as of a date (docs/PLAN.md §2.5), ported from the
// prototype's rule engine (evalAsm, ruleStance, gapRun). Inputs are the rows
// of the `beliefs`, `metric_claims` and `*_links` queries, already filtered
// to the as-of date by the gateway.
//
// Quantitative beliefs are judged by rule against their lines; beliefs with
// no metric take the owner's newest judgment. An agent's stance is reported
// beside the state and never sets it.

export type Stance = 'supports' | 'weakens' | 'contradicts'
export type BeliefState = 'contradicting' | 'weakening' | 'supported' | 'on_track' | 'untested'

export const STATE_OF: Record<Stance, BeliefState> = { supports: 'supported', weakens: 'weakening', contradicts: 'contradicting' }

/** The belief no longer holds: it is contradicting or weakening. */
export const isMoved = (s: BeliefState) => s === 'contradicting' || s === 'weakening'

type Belief = QueryRow<'beliefs'>
type MetricClaim = QueryRow<'metric_claims'>

export type Judgment = {
  claim: string
  belief: string
  stance: Stance | 'informs'
  by: string
  at: string
  note?: string
  agent: boolean
}

export type Reading = { claim: string; value: number; observed_at: string; recorded_at: string; stance: Stance }

export type BeliefEvaluation = {
  belief: string
  state: BeliefState
  /** rule: from readings against the belief's line; judgment: the owner's newest. */
  basis: 'rule' | 'judgment' | 'none'
  /** The claim that sets the state. */
  newest?: string
  /** When the current state began (recorded date of the first claim in the run). */
  since?: string
  /** When the belief stopped holding: the start of the trailing run of weakening or contradicting steps. */
  movedSince?: string
  readings: Reading[]
  judgments: Judgment[]
  /** The stances that set the state, oldest first: readings by rule, else the owner's judgments. */
  steps: Step[]
  /** The agent's newest stance, when it is newer than the basis and disagrees. */
  agentDiffers?: Judgment
}

/** One stance in the run that sets a belief's state. `judged` when an owner made it, not the rule. */
export type Step = { claim: string; at: string; stance: Stance; note?: string; judged: boolean }

/** A judgment that is a person's stance, not the agent's and not "informs". */
export type OwnerStance = Judgment & { stance: Stance }

/** The owner's own stances, oldest first. */
export const ownerStances = (judgments: Judgment[]): OwnerStance[] => judgments.filter((j): j is OwnerStance => !j.agent && j.stance !== 'informs')

/** The judgment links, merged and labelled. `agents` is the set of agent actor slugs. */
export function judgmentsFrom(
  links: { supports: QueryRow<'supports_links'>[]; contradicts: QueryRow<'contradicts_links'>[]; informs: QueryRow<'informs_links'>[] },
  agents: ReadonlySet<string>,
): Judgment[] {
  const out: Judgment[] = []
  const push = (claim: string, belief: string, stance: Judgment['stance'], by?: string, at?: string, note?: string) => {
    if (!by || !at) return
    out.push({ claim, belief, stance, by, at, note, agent: agents.has(by) })
  }
  for (const l of links.supports) push(l.claim, l.belief, 'supports', l.judged_by, l.judged_at, l.note)
  for (const l of links.contradicts) push(l.claim, l.belief, l.weight === 'weak' ? 'weakens' : 'contradicts', l.judged_by, l.judged_at, l.note)
  for (const l of links.informs) push(l.claim, l.belief, 'informs', l.judged_by, l.judged_at, l.note)
  return out.sort((a, b) => a.at.localeCompare(b.at))
}

/**
 * One reading's stance against a belief. Past the hard line contradicts;
 * between the lines weakens; on the right side but within 3% of the line and
 * moving the wrong way also weakens. Trend beliefs compare with the reading
 * before.
 */
export function ruleStance(b: Belief, value: number, previous?: number): Stance {
  if (b.trend) {
    if (previous === undefined) return 'supports'
    const better = b.trend === 'rising' ? value > previous : value < previous
    return better ? 'supports' : value === previous ? 'weakens' : 'contradicts'
  }
  const th = b.threshold
  if (th === undefined || !b.comparator) return 'supports'
  const hard = b.hard_threshold ?? th
  const atLeast = isAtLeast(b.comparator)
  const holds = meets(b.comparator, value, th)
  if (holds) {
    const near = Math.abs(value - th) <= Math.abs(th) * 0.03
    const worsening = previous !== undefined && (atLeast ? value < previous : value > previous)
    return near && worsening ? 'weakens' : 'supports'
  }
  const pastHard = atLeast ? value < hard : value > hard
  return pastHard ? 'contradicts' : 'weakens'
}

/** Readings for a metric in the order they describe the world. */
export function readingsFor(b: Belief, claims: MetricClaim[]): Reading[] {
  const own = claims
    .filter((k) => k.metric === b.metric && k.value !== undefined && k.status !== 'rejected')
    .sort((x, y) => (x.observed_at ?? '').localeCompare(y.observed_at ?? '') || x.recorded_at.localeCompare(y.recorded_at))
  return own.map((k, i) => ({
    claim: k.claim,
    value: k.value!,
    observed_at: k.observed_at ?? k.recorded_at,
    recorded_at: k.recorded_at,
    stance: ruleStance(b, k.value!, i ? own[i - 1].value : undefined),
  }))
}

export function evaluateBelief(b: Belief, claims: MetricClaim[], judgments: Judgment[]): BeliefEvaluation {
  const mine = judgments.filter((j) => j.belief === b.belief)
  const readings = b.metric ? readingsFor(b, claims) : []
  // The run of steps that sets the state: readings by rule, else owner judgments.
  const steps: Step[] = b.metric
    ? readings.map((r) => ({ claim: r.claim, at: r.recorded_at, stance: r.stance, judged: false }))
    : ownerStances(mine).map((j) => ({ claim: j.claim, at: j.at, stance: j.stance, note: j.note, judged: true }))
  const result: BeliefEvaluation = { belief: b.belief, state: 'untested', basis: 'none', readings, judgments: mine, steps }
  const last = steps.at(-1)
  if (last) {
    result.basis = b.metric ? 'rule' : 'judgment'
    result.newest = last.claim
    result.state = STATE_OF[last.stance]
    if (b.kind === 'prediction' && result.state === 'supported') result.state = 'on_track'
    let i = steps.length - 1
    while (i > 0 && steps[i - 1].stance === last.stance) i--
    result.since = dayOf(steps[i].at)
    if (last.stance !== 'supports') {
      let j = steps.length - 1
      while (j > 0 && steps[j - 1].stance !== 'supports') j--
      result.movedSince = dayOf(steps[j].at)
    }
  }

  const agent = mine.filter((j) => j.agent && j.stance !== 'informs').at(-1)
  if (agent && (!last || agent.at >= last.at) && STATE_OF[agent.stance as Stance] !== result.state) result.agentDiffers = agent
  return result
}

/** The agent's stances the owner has not answered with a judgment of their own on the same claim. */
export function unreviewedAgent(e: BeliefEvaluation): Judgment[] {
  return e.judgments.filter((j) => j.agent && j.stance !== 'informs' && !e.judgments.some((o) => !o.agent && o.claim === j.claim))
}
