import type { Ref } from '../../domain/record.ts'
import { type Link, type LinkIn, asLinksIn, deleteLink, deleteRecord, getLinks, putLink, putRecord } from '../../entities.ts'
import { useDraftState } from './context.ts'

// The drafting page's writes that cards share, each undoable (useUndoableWrites).

/** Save one field of a record; undone by writing back its previous value. */
export function useFieldSaver() {
  const { project, writes } = useDraftState()
  return (ref: Ref, name: string, value: unknown, previous: unknown) =>
    writes.run(
      () => putRecord(project, { type: ref.type, slug: ref.slug, fields: { [name]: value } }),
      () => ({ what: `Changed the ${name.replaceAll('_', ' ')}`, undo: () => putRecord(project, { type: ref.type, slug: ref.slug, fields: { [name]: previous ?? null } }) }),
    )
}

/** Take a link off a card: unlink it, or, for a record that cannot stand without that link (a risk without its
 *  commitment), delete the record. Either is undone by putting it back: a deleted record with every link it had. */
export function useUnlink() {
  const { project, writes, nodes, recordOf } = useDraftState()
  return (parent: Ref, l: Link) => {
    const [from, to] = l.direction === 'out' ? [parent.slug, l.slug] : [l.slug, parent.slug]
    const node = nodes.get(l.type)
    if (l.direction === 'in' && node?.required_links.includes(l.edge)) {
      const fields = Object.fromEntries(Object.entries(recordOf({ type: l.type, slug: l.slug }) ?? {}).filter(([k]) => k !== node.key))
      let links: LinkIn[] = [{ edge: l.edge, to: parent.slug }]
      return writes.run(
        async () => {
          links = asLinksIn((await getLinks(project, l.type, l.slug)).links)
          return deleteRecord(project, { type: l.type, slug: l.slug })
        },
        () => ({ what: `Removed ${l.text ?? l.slug}`, undo: () => putRecord(project, { type: l.type, slug: l.slug, fields, links }) }),
      )
    }
    return writes.run(
      () => deleteLink(project, { edge: l.edge, from, to }),
      () => ({ what: `Unlinked ${l.text ?? l.slug}`, undo: () => putLink(project, { edge: l.edge, from, to, fields: l.fields }) }),
    )
  }
}

/** Link a record already in the graph from a card, as the palette item's link. */
export function useLinkExisting() {
  const { project, writes } = useDraftState()
  return (focus: Ref, edge: string, direction: 'out' | 'in', other: { slug: string; text: string }) => {
    const [from, to] = direction === 'out' ? [focus.slug, other.slug] : [other.slug, focus.slug]
    return writes.run(
      () => putLink(project, { edge, from, to }),
      () => ({ what: `Linked “${other.text.slice(0, 40)}”`, undo: () => deleteLink(project, { edge, from, to }) }),
    )
  }
}
