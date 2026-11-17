import type { EdgeType, Link, Model } from '../../entities.ts'
import { VERBS } from './verbs.ts'

// The Add palette (docs/21-new-commitment.md, §3, N4): what can be added from a card, as verbs. Each item is one
// record type, one link and, where it applies, a kind. The items come from the model, so only links ty-core allows
// from the card's type are offered; the words come from verbs.ts.

export type Item = {
  label: string
  edge: string
  /** out: the card is the link's source and the new record its target; in: the other way. */
  direction: 'out' | 'in'
  /** The type of the record added. */
  type: string
  kind?: string
  /** The type's description, as help. */
  help?: string | null
  /** The card has as many of these links as the model allows: offered, but turned off. */
  full?: boolean
}

export const itemKey = (i: Pick<Item, 'edge' | 'direction' | 'kind'>) => `${i.edge}:${i.direction}:${i.kind ?? ''}`

/** The items a card of this type offers, given its links so far. */
export function palette(model: Model, type: string, links: Link[] = []): Item[] {
  const nodes = new Map(model.nodes.map((n) => [n.name, n]))
  const items: Item[] = []
  const offer = (edge: EdgeType, direction: 'out' | 'in') => {
    const other = nodes.get(direction === 'out' ? edge.to : edge.from)
    const offers = direction === 'out' ? VERBS[edge.name]?.addOut : VERBS[edge.name]?.addIn
    if (!other?.writable || !edge.writable || !offers) return
    const kinds = other.fields.find((f) => f.name === 'kind')?.values ?? []
    // A most-one link counts against its source: only the card's own outgoing links fill it.
    const full = direction === 'out' && edge.max != null && links.filter((l) => l.edge === edge.name && l.direction === 'out').length >= edge.max
    for (const o of offers) {
      items.push({ label: o.label, edge: edge.name, direction, type: other.name, kind: o.kind && kinds.includes(o.kind) ? o.kind : undefined, help: other.description, full })
    }
  }
  for (const edge of model.edges) {
    if (edge.from === type) offer(edge, 'out')
    if (edge.to === type) offer(edge, 'in')
  }
  return items
}
