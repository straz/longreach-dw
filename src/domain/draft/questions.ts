import type { Fields, Link } from '../../entities.ts'
import { monthName } from '../format.ts'
import { type Ref, refKey } from '../record.ts'

// Prompting questions (docs/21-new-commitment.md, §4, N6, N7): each gap in the draft becomes a question, asked in
// place and listed in the coach. A pure function over the draft's records; dw chooses which to show. Those a
// GraphPolicy will check before a merge are to do (they block it); the rest are suggestions, which never block.

/** The records around the commitment, each with its own fields and links. */
export type Around = { record?: Fields; links: Link[] }

export type Draft = { slug: string; record: Fields; links: Link[]; around: Record<string, Around> }

export type Ask = {
  /** Stable, so marking a question not applicable is remembered (per update). */
  id: string
  /** To do: a GraphPolicy blocks the merge until it is answered. Otherwise a suggestion. */
  todo: boolean
  text: string
  /** Why it is asked now, when that helps. */
  why?: string
  /** The card the answer goes on. */
  focus: Ref
  /** What answering opens: a new card of a palette item (palette.ts itemKey), or a field of the focus. */
  answer: { item: string } | { field: string }
}

/** At most this many suggestions show at a time (§4). */
const SHOWN = 3

const has = (links: Link[], edge: string, direction: 'out' | 'in') => links.some((l) => l.edge === edge && l.direction === direction)
const quoted = (text: unknown) => {
  const s = String(text ?? '').trim()
  return s.length > 60 ? `“${s.slice(0, 57)}…”` : `“${s}”`
}

/** Every question the draft raises, to do first, then in the order §4 asks them. */
export function questions(draft: Draft, today: string): Ask[] {
  const c: Ref = { type: 'Commitment', slug: draft.slug }
  const { links, record } = draft
  const asks: Ask[] = []
  const ask = (a: Omit<Ask, 'todo'> & { todo?: boolean }) => asks.push({ todo: false, ...a })

  if (!has(links, 'OwnedBy', 'out')) ask({ id: 'owner', todo: true, text: 'Who is accountable for this?', focus: c, answer: { item: 'OwnedBy:out:person' } })
  const beliefs = links.filter((l) => l.edge === 'RestsOn' && l.direction === 'out')
  if (!beliefs.length) ask({ id: 'beliefs', text: 'What has to be true for this to work?', focus: c, answer: { item: 'RestsOn:out:assumption' } })
  for (const b of beliefs) {
    const around = draft.around[refKey({ type: 'Belief', slug: b.slug })]
    if (!around) continue
    const belief: Ref = { type: 'Belief', slug: b.slug }
    if (around.record && !around.record.falsifier) {
      ask({ id: `falsifier:${b.slug}`, text: `What would tell you ${quoted(b.text)} is wrong?`, focus: belief, answer: { field: 'falsifier' } })
    }
    const evidence = ['Supports', 'Contradicts', 'InformsBelief', 'WillInform'].some((e) => has(around.links, e, 'in'))
    if (!evidence) {
      ask({ id: `evidence:${b.slug}`, text: `What do you know that supports ${quoted(b.text)}? What report would tell you?`, focus: belief, answer: { item: 'Supports:in:observation' } })
    }
  }
  if (!has(links, 'GuardedBy', 'out')) {
    ask({ id: 'tripwire', text: 'At what point would you stop, or rethink?', why: 'Kill criteria set before you commit are the ones that count.', focus: c, answer: { item: 'GuardedBy:out:kill' } })
  }
  const decisions = links.filter((l) => l.edge === 'Creates' && l.direction === 'in')
  if (!decisions.length) ask({ id: 'decision', text: 'What decision made this, and what else did you consider?', focus: c, answer: { item: 'Creates:in:commit' } })
  for (const d of decisions) {
    const around = draft.around[refKey({ type: 'Decision', slug: d.slug })]
    if (around && !has(around.links, 'Considered', 'out')) {
      ask({ id: `alternatives:${d.slug}`, text: 'What else did you consider?', focus: { type: 'Decision', slug: d.slug }, answer: { item: 'Considered:out:' } })
    }
  }
  if (!has(links, 'RiskOf', 'in')) {
    ask({ id: 'risks', text: 'What could go wrong, and who bears it?', focus: c, answer: { item: 'RiskOf:in:other' } })
    ask({ id: 'premortem', text: premortem(record.horizon_at, today), focus: c, answer: { item: 'RiskOf:in:other' } })
  }
  if (!has(links, 'Allocates', 'out')) ask({ id: 'resources', text: 'What does this tie up: money, people, time?', focus: c, answer: { item: 'Allocates:out:capital' } })
  if (!record.reversibility) ask({ id: 'reversibility', text: 'How hard would this be to undo?', focus: c, answer: { field: 'reversibility' } })
  if (!has(links, 'Enables', 'out') && !has(links, 'Forecloses', 'out')) {
    ask({ id: 'options', text: 'What does this make possible, or rule out?', focus: c, answer: { item: 'Enables:out:expand' } })
  }
  return asks
}

/** The pre-mortem, at the commitment's horizon, or a year from today without one. It asks; it never judges. */
export function premortem(horizon: unknown, today: string): string {
  const day = typeof horizon === 'string' && horizon ? horizon.slice(0, 10) : `${Number(today.slice(0, 4)) + 1}${today.slice(4, 10)}`
  return `Imagine it is ${monthName(day, { long: true })} ${day.slice(0, 4)} and this has failed. What happened?`
}

/** What the coach shows: every to do, and the first few suggestions not marked not applicable. */
export function shown(asks: Ask[], dismissed: ReadonlySet<string>): { todo: Ask[]; suggested: Ask[]; more: number } {
  const todo = asks.filter((a) => a.todo && !dismissed.has(a.id))
  const open = asks.filter((a) => !a.todo && !dismissed.has(a.id))
  return { todo, suggested: open.slice(0, SHOWN), more: Math.max(0, open.length - SHOWN) }
}
