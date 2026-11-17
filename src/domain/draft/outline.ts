import type { Link } from '../../entities.ts'

// The draft as an outline by ty-core's five questions (docs/21-new-commitment.md, §2c, N3): which section each of
// the commitment's links goes in, the words an empty section invites with, and each card's plain label.

export type SectionId = 'why' | 'rests' | 'depends' | 'change' | 'possible' | 'authority'

export type Facet = 'blue' | 'teal' | 'amber' | 'green' | 'red'

export type Section = {
  id: SectionId
  title: string
  /** What an empty section says instead of a heading over a blank (N1). */
  invite: string
  /** The commitment's links shown here, each as edge:direction. */
  links: string[]
  /** What its ＋ adds first, an item of the commitment's palette (palette.ts itemKey). */
  add: string
  facet: Facet
}

export const SECTIONS: Section[] = [
  { id: 'why', title: 'Why', invite: 'Why this? What decision made it, and on what evidence?', links: ['Creates:in', 'GroundsCommitment:in'], add: 'Creates:in:commit', facet: 'blue' },
  { id: 'rests', title: 'Rests on', invite: 'What has to be true for this to work?', links: ['RestsOn:out'], add: 'RestsOn:out:assumption', facet: 'teal' },
  { id: 'depends', title: 'Depends on', invite: 'What does it depend on, or tie up?', links: ['DependsOn:out', 'Entails:out', 'Allocates:out'], add: 'DependsOn:out:', facet: 'amber' },
  { id: 'change', title: 'What could change', invite: 'What could go wrong, and at what point would you stop?', links: ['RiskOf:in', 'GuardedBy:out'], add: 'RiskOf:in:other', facet: 'amber' },
  { id: 'possible', title: 'What it makes possible', invite: 'What does this make possible, or rule out?', links: ['Enables:out', 'Forecloses:out', 'Serves:out'], add: 'Enables:out:expand', facet: 'green' },
  { id: 'authority', title: 'Authority', invite: 'Who must approve it, or what contract formalizes it?', links: ['CoversCommitment:in', 'FormalizedBy:out', 'AccountableTo:out'], add: 'AccountableTo:out:person', facet: 'red' },
]

/** The links of the commitment sentence: who commits, who owns it, whom it is owed to. */
const SENTENCE = ['Commits:in', 'OwnedBy:out', 'Owes:out']

const at = (l: Pick<Link, 'edge' | 'direction'>) => `${l.edge}:${l.direction}`

/** Which section a link of the commitment's is shown in; none for the sentence's and for its notes (RecordedIn). */
export function sectionOf(link: Pick<Link, 'edge' | 'direction'>): SectionId | undefined {
  return SECTIONS.find((s) => s.links.includes(at(link)))?.id
}

export const inSentence = (link: Pick<Link, 'edge' | 'direction'>) => SENTENCE.includes(at(link))

const KINDS: Record<string, Record<string, string>> = {
  Belief: { assumption: 'Assumption', prediction: 'Prediction', thesis: 'Thesis', constraint: 'Constraint' },
  Tripwire: { kill: 'Stop rule', review: 'Review trigger' },
  Resource: { capital: 'Money', talent: 'People', time: 'Time' },
}
const TYPES: Record<string, string> = { Claim: 'Evidence', Opportunity: 'Option', Commitment: 'Commitment' }

/** A card's label in plain words, by kind (§2c); the ty-core type goes in its title, for those who want it. */
export function cardLabel(type: string, kind?: string | null, edge?: string): string {
  if (type === 'Source' && edge === 'WillInform') return 'Report due'
  if (type === 'Commitment' && edge === 'Entails') return 'Smaller commitment'
  return (kind && KINDS[type]?.[kind]) ?? TYPES[type] ?? type
}

/** Keys of records in the order first seen, new ones last: the page never moves under the user (§7, A). */
export function stableOrder(previous: string[], now: string[]): string[] {
  const present = new Set(now)
  const kept = previous.filter((k) => present.has(k))
  const seen = new Set(kept)
  return [...kept, ...now.filter((k) => !seen.has(k))]
}

/** The types whose own links the outline shows under their cards. */
export const NESTED: ReadonlySet<string> = new Set(['Belief', 'Risk', 'Decision', 'Tripwire'])

const FACETS: Record<string, Facet> = {
  Belief: 'teal', Claim: 'teal', Tripwire: 'teal', Source: 'teal', Question: 'teal',
  Risk: 'amber', Resource: 'amber', Exposure: 'amber',
  Opportunity: 'green', Goal: 'green',
  Mandate: 'red', Contract: 'red',
}

/** The facet a record type's cards are marked with (§2c). */
export const facetOf = (type: string): Facet => FACETS[type] ?? 'blue'
