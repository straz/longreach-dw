import type { Fields, LinkIn, NodeType } from '../../entities.ts'
import type { Item } from './palette.ts'
import { type Ref, TEXT_FIELDS } from '../record.ts'

// What a new card is written as (docs/21-new-commitment.md, N8): its text, the kind its palette choice set, the
// required fields the gateway has no default for, and the links it needs besides the one it was added with.

/** The field a record's text goes in: its title, name, statement or condition (as tyapi's entities.text_field). */
export const textField = (node: NodeType) => TEXT_FIELDS.find((t) => node.fields.some((f) => f.name === t && f.type === 'String')) ?? 'statement'

/** Required fields a new record must be sent with: no default from the gateway, not its key or text, and not a
 *  kind the palette choice already gives. Asked on the card, prefilled where there is an honest value. */
export function askedFields(node: NodeType, item: Pick<Item, 'kind'>) {
  const text = textField(node)
  return node.fields.filter((f) => f.required && !f.key && f.default == null && f.name !== text && !(f.name === 'kind' && item.kind))
}

/** A first value for an asked field: the same field of the card it is added from (a smaller commitment's
 *  scale), today for a date, or nothing. */
export function prefill(name: string, type: string, focus: Fields | undefined, today: string): unknown {
  if (focus && focus[name] != null) return focus[name]
  if (type === 'DateTime' || type === 'Date') return today
  if (type === 'Bool') return false
  return undefined
}

/** The links a new record is written with: the one its palette choice makes, and those it needs to stand in the
 *  draft (a risk is a risk to the commitment; a tripwire on a belief guards the commitment; evidence comes from
 *  the draft's notes, a Source, as ty-core requires of a claim). */
export function linksFor(item: Item, focus: Ref, commitment: string, notes: string): LinkIn[] {
  const links: LinkIn[] = [item.direction === 'out' ? { edge: item.edge, from: focus.slug } : { edge: item.edge, to: focus.slug }]
  if (item.type === 'Risk' && item.edge !== 'RiskOf') links.push({ edge: 'RiskOf', to: commitment })
  if (item.type === 'Tripwire' && item.edge !== 'GuardedBy') links.push({ edge: 'GuardedBy', from: commitment })
  if (item.type === 'Claim') links.push({ edge: 'ClaimFrom', to: notes })
  return links
}

/** The slug of a draft's notes: the Source a claim typed by the user is from (§2a). */
export const notesOf = (commitment: string) => `notes-${commitment}`
