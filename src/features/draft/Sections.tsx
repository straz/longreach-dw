import { useRef, useState } from 'react'
import { NESTED, SECTIONS, type Section, cardLabel, facetOf, sectionOf, stableOrder } from '../../domain/draft/outline.ts'
import { textField } from '../../domain/draft/records.ts'
import { verbOf } from '../../domain/draft/verbs.ts'
import { plural } from '../../domain/format.ts'
import { type Ref, refKey } from '../../domain/record.ts'
import type { Link } from '../../entities.ts'
import { usePending } from '../updates/useUpdates.ts'
import { useDraftState } from './context.ts'
import { InlineSelect, InlineText } from './Inline.tsx'
import { UnsavedCard, UnsavedCards } from './UnsavedCard.tsx'
import { useFieldSaver, useUnlink } from './useDraftWrites.ts'

// The draft as an outline (docs/21-new-commitment.md, §2c): a section per question, each card labelled in plain
// words with its facet's color beside the label. An empty section is one invitation line. Cards keep their places
// as records are added (stableOrder), and an unsaved card stays where it was added until its record replaces it.

export function Sections() {
  const { draft } = useDraftState()
  return (
    <>
      {SECTIONS.map((s) => (
        <SectionView key={s.id} section={s} links={draft.links.filter((l) => sectionOf(l) === s.id)} />
      ))}
    </>
  )
}

/** Keys in the order first seen, kept across renders. */
function useStable(keys: string[]): string[] {
  const order = useRef<string[]>([])
  order.current = stableOrder(order.current, keys)
  return order.current
}

function SectionView({ section, links }: { section: Section; links: Link[] }) {
  const { draft, addByKey, unsaved, readOnly } = useDraftState()
  const c: Ref = { type: 'Commitment', slug: draft.slug }
  const unsavedHere = unsaved.cards.filter((u) => u.focus.slug === draft.slug && u.focus.type === 'Commitment' && sectionOf({ edge: u.item.edge, direction: u.item.direction }) === section.id)
  const byKey = new Map(links.map((l) => [`${l.edge}/${l.slug}`, l]))
  const order = useStable([...byKey.keys()])
  const [open, setOpen] = useState(section.id !== 'authority')
  const invite = () => addByKey(c, section.add)
  if (!links.length && !unsavedHere.length) {
    return (
      <section className={`facet-${section.facet}`} aria-label={section.title}>
        <button type="button" className="invite" onClick={invite} disabled={readOnly}>
          <span className="invite-title">{section.title}</span>
          <span className="invite-text">{section.invite}</span>
          <span className="invite-plus" aria-hidden="true">
            ＋
          </span>
        </button>
      </section>
    )
  }
  return (
    <section className={`facet-${section.facet}`} aria-label={section.title}>
      <h2 className="section-head">
        <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          {section.title} <span className="section-count">· {links.length}</span>
        </button>
        {!readOnly && (
          <button type="button" className="section-add" onClick={invite} aria-label={`Add to ${section.title}`}>
            ＋
          </button>
        )}
      </h2>
      {open && (
        <div className="section-cards">
          {order.map((k) => (
            <RecordCard key={k} link={byKey.get(k)!} parent={c} />
          ))}
          {unsavedHere.map((u) => (
            <UnsavedCard key={u.id} card={u} />
          ))}
        </div>
      )}
    </section>
  )
}

function RecordCard({ link, parent }: { link: Link; parent: Ref }) {
  const { draft, nodes, setFocus, openPalette, readOnly, editing, setEditing } = useDraftState()
  const saveField = useFieldSaver()
  const unlink = useUnlink()
  const ref: Ref = { type: link.type, slug: link.slug }
  const node = nodes.get(link.type)
  const around = draft.around[refKey(ref)]
  const record = around?.record
  const label = cardLabel(link.type, link.kind, link.edge)
  const text = node ? textField(node) : 'statement'
  const kinds = node?.fields.find((f) => f.name === 'kind')?.values ?? []
  const shared = link.type === 'Belief' ? (around?.links ?? []).filter((l) => l.edge === 'RestsOn' && l.direction === 'in' && l.slug !== draft.slug).length : 0
  const nested = (around?.links ?? []).filter((l) => !(l.type === 'Commitment' && l.slug === draft.slug) && l.edge !== 'ClaimFrom' && !(link.type === 'Belief' && l.edge === 'RestsOn' && l.direction === 'in'))
  const falsifierId = `${refKey(ref)}:falsifier`
  const inUpdate = usePending().has(refKey(ref))
  return (
    <div className={`record-card facet-${facetOf(link.type)}`} id={`card-${refKey(ref)}`} tabIndex={0} onFocus={(e) => e.target === e.currentTarget && setFocus(ref)} onClick={() => setFocus(ref)}>
      <div className="card-top">
        {inUpdate && <span className="update-dot" title="Changed in this update, not yet in main" aria-label="pending" />}
        <span className="card-label" title={`${link.type} · ${verbOf(link)}`}>
          {label}
        </span>
        {shared > 0 && <span className="cross-badge">also underpins {plural(shared, 'other commitment')}</span>}
        <span className="card-tools">
          {!readOnly && kinds.length > 0 && link.type !== 'Party' && record && (
            <InlineSelect value={(record.kind as string) ?? link.kind ?? undefined} values={kinds} label={`${label}: kind`} onSave={(v) => v && saveField(ref, 'kind', v, record.kind)} />
          )}
          {!readOnly && NESTED.has(link.type) && (
            <button type="button" className="btn-quiet is-small" onClick={(e) => (e.stopPropagation(), openPalette(ref))} aria-label={`Add to ${link.text ?? link.slug}`}>
              ＋ Add
            </button>
          )}
          {!readOnly && (
            <button type="button" className="btn-quiet is-small" onClick={(e) => (e.stopPropagation(), unlink(parent, link))}>
              {link.direction === 'in' && node?.required_links.includes(link.edge) ? 'Remove' : 'Unlink'}
            </button>
          )}
        </span>
      </div>
      <InlineText value={link.text ?? undefined} label={`${label} text`} placeholder={`${label}, in a sentence`} multiline disabled={readOnly} onSave={(v) => saveField(ref, text, v, link.text)} className="card-text" />
      {link.type === 'Belief' && record && (
        <div className="card-line">
          {record.falsifier || editing === falsifierId ? (
            <>
              <span className="line-verb">wrong if</span>
              <InlineText
                value={record.falsifier as string | undefined}
                label="What would tell you it is wrong"
                placeholder="what would tell you it is wrong"
                open={editing === falsifierId}
                onOpen={() => setEditing(falsifierId)}
                onClose={() => setEditing(null)}
                disabled={readOnly}
                onSave={(v) => saveField(ref, 'falsifier', v || null, record.falsifier)}
              />
            </>
          ) : (
            <button type="button" className="gap-mark" disabled={readOnly} onClick={() => setEditing(falsifierId)}>
              ◌ falsifier: needs one
            </button>
          )}
        </div>
      )}
      {nested.map((l) => (
        <div key={`${l.edge}/${l.direction}/${l.slug}`} className={`card-line facet-${facetOf(l.type)}`}>
          <span className="line-verb">{verbOf(l)}</span>
          <span className="line-label">{cardLabel(l.type, l.kind, l.edge)}</span>
          <span className="line-text">{l.text ?? l.slug}</span>
          {!readOnly && (
            <button type="button" className="chip-x" aria-label={`Unlink ${l.text ?? l.slug}`} onClick={() => unlink(ref, l)}>
              ×
            </button>
          )}
        </div>
      ))}
      <UnsavedCards focus={ref} />
    </div>
  )
}
