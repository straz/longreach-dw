import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link as RouterLink, useParams } from 'react-router'
import { useDemos } from '../../app/session.ts'
import type { Item } from '../../domain/draft/palette.ts'
import { type Ref, refKey } from '../../domain/draft/questions.ts'
import { createRecord, putRecord } from '../../entities.ts'
import { useGateway } from '../../gateway/react.tsx'
import { useClient, useClock } from '../shared/client.tsx'
import { useRouteState } from '../shared/routeState.ts'
import { usePortfolio } from '../shared/usePortfolio.ts'
import { useWriteContext } from '../shared/useWriteContext.ts'
import WriteError from '../shared/WriteError.tsx'
import Coach from './Coach.tsx'
import { DraftContext, type DraftState, useDraftState } from './context.ts'
import { InlineText } from './Inline.tsx'
import { Sections, Sentence } from './Outline.tsx'
import Palette from './Palette.tsx'
import { useChanges, useDismissed, useDraft, useModel, useUnsaved } from './useDraft.ts'
import './draft.css'

// New commitment as a page, not a menu (docs/21-new-commitment.md, N1, phase A): #/<org>/draft asks what is being
// committed to, and #/<org>/draft/<slug> is the drafting page, the outline beside the coach. Phase A runs in the
// visitor's sandbox of the demo (tyapi W11), on tyapi's generic record routes; the update's color, Review, Merge
// and Discard come with updates (tyapi docs/20, phases 2 and 4).

export default function DraftPage() {
  const { slug } = useParams()
  return slug ? <Drafting key={slug} slug={slug} /> : <Start />
}

/** The first sentence of what was typed, as the commitment's title. */
export const titleOf = (text: string) => {
  const first = text.trim().split(/(?<=[.!?])\s+|\n/)[0].trim().replace(/[.!?]$/, '')
  return first.length > 100 ? `${first.slice(0, 97).trimEnd()}…` : first
}

function Start() {
  const gateway = useGateway()
  const client = useClient()
  const { go } = useRouteState()
  const { readOnly, why } = useWriteContext()
  const { portfolio } = usePortfolio()
  const changes = useChanges()
  const [text, setText] = useState('')
  const drafts = portfolio?.commitments.filter((c) => c.state === 'proposed') ?? []
  const start = async () => {
    const said = text.trim()
    if (!said) return
    const made = await changes.run(() =>
      createRecord(gateway, { type: 'Commitment', fields: { title: titleOf(said), statement: said, scale: 'operational' }, links: [{ edge: 'Commits', from: client.org }] }),
    )
    if (made) go(`/draft/${made.slug}`)
  }
  return (
    <div className="draft-start">
      <h1>What are you committing to?</h1>
      <textarea
        className="start-input"
        rows={4}
        aria-label="What are you committing to?"
        placeholder="Describe it in a sentence or two."
        value={text}
        autoFocus
        disabled={readOnly}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            void start()
          }
        }}
      />
      <div className="start-actions">
        <button type="button" className="btn-action" onClick={() => void start()} disabled={!text.trim() || changes.busy || readOnly} title={readOnly ? why : undefined}>
          {changes.busy ? 'Starting…' : 'Start drafting'}
        </button>
        <RouterLink className="btn-quiet as-link" to={`/${gateway.org}/commitment?new=import`}>
          or import a sample document
        </RouterLink>
      </div>
      <WriteError error={changes.error} />
      <p className="start-example">
        For example: “We’ll move patient records to the new platform by Q3, budget $2.4M, assuming the vendor certifies HIPAA by May.” One sentence can
        name a party, a date, money and an assumption; the draft asks for the rest.
      </p>
      {drafts.length > 0 && (
        <section className="start-drafts" aria-label="Drafts in progress">
          <h2>Drafts in progress</h2>
          <ul>
            {drafts.map((d) => (
              <li key={d.commitment}>
                <RouterLink to={`/${gateway.org}/draft/${d.commitment}`}>{d.title}</RouterLink>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

function Drafting({ slug }: { slug: string }) {
  const gateway = useGateway()
  const clock = useClock()
  const { readOnly: lookingBack } = useWriteContext()
  const demos = useDemos()
  const model = useModel()
  const { draft, error, missing } = useDraft(slug)
  const changes = useChanges()
  const storage = `dw:draft:${gateway.graph}:${gateway.branch}:${slug}`
  const unsaved = useUnsaved(`${storage}:unsaved`)
  const { dismissed, dismiss } = useDismissed(`${storage}:dismissed`)
  const [focus, setFocus] = useState<Ref>({ type: 'Commitment', slug })
  const [paletteOn, setPaletteOn] = useState<Ref | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const readOnly = lookingBack || gateway.branch === 'main'
  const persona = demos.data?.find((d) => d.graph === gateway.graph)?.persona.name ?? 'you'

  const linksOf = useCallback((r: Ref) => (!draft ? [] : r.type === 'Commitment' && r.slug === draft.slug ? draft.links : (draft.around[refKey(r)]?.links ?? [])), [draft])
  const recordOf = useCallback((r: Ref) => (!draft ? undefined : r.type === 'Commitment' && r.slug === draft.slug ? draft.record : draft.around[refKey(r)]?.record), [draft])
  const addCard = useCallback(
    (on: Ref, item: Item, text = '') => {
      const id = unsaved.add({ focus: on, item, text, fields: {} })
      setTimeout(() => document.getElementById(`unsaved-${id}`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 50)
    },
    [unsaved],
  )

  // / or ⌘K opens the palette on the focused card; ⌘Z undoes the user's last change. Not while typing.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      const typing = t.closest('input, textarea, select, [contenteditable="true"]')
      if (paletteOn || readOnly) return
      if (!typing && (e.key === '/' || ((e.metaKey || e.ctrlKey) && e.key === 'k'))) {
        e.preventDefault()
        setPaletteOn(focus)
      }
      if (!typing && (e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        void changes.undo()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [focus, paletteOn, readOnly, changes])

  const state = useMemo(
    (): DraftState | null =>
      model.data && draft
        ? {
            model: model.data,
            nodes: new Map(model.data.nodes.map((n) => [n.name, n])),
            draft,
            project: gateway,
            today: clock.today,
            readOnly,
            persona,
            changes,
            unsaved,
            focus,
            setFocus,
            openPalette: setPaletteOn,
            addCard,
            editing,
            setEditing,
            linksOf,
            recordOf,
          }
        : null,
    [model.data, draft, gateway, clock.today, readOnly, persona, changes, unsaved, focus, addCard, editing, linksOf, recordOf],
  )

  if (missing) {
    return (
      <div className="draft-start">
        <h1>No draft here</h1>
        <p>
          There is no commitment {slug} in your copy of this demo. <RouterLink to={`/${gateway.org}/draft`}>Start a new one</RouterLink>.
        </p>
      </div>
    )
  }
  if (error || model.error) return <WriteError error={error ?? model.error} />
  if (!state) return <p className="draft-loading">Opening the draft…</p>
  const r = state.draft.record
  return (
    <DraftContext.Provider value={state}>
      <div className="draft">
        <header className="draft-head">
          <p className="draft-eyebrow">
            Draft · proposed · in your copy of the demo
            {readOnly && <span className="draft-readonly"> · read only</span>}
          </p>
          <h1>
            <InlineText
              value={r.title as string}
              label="Title"
              placeholder="A title"
              disabled={readOnly}
              onSave={(v) =>
                v &&
                void changes.run(
                  () => putRecord(gateway, { type: 'Commitment', slug, fields: { title: v } }),
                  () => ({ what: 'Changed the title', undo: () => putRecord(gateway, { type: 'Commitment', slug, fields: { title: r.title } }) }),
                )
              }
            />
          </h1>
          <div className="draft-tools">
            <button type="button" className="btn-line is-small" onClick={() => setPaletteOn(focus)} disabled={readOnly}>
              ＋ Add… <kbd>/</kbd>
            </button>
            <button type="button" className="btn-quiet is-small" onClick={() => void changes.undo()} disabled={!changes.last || changes.busy}>
              Undo{changes.last ? `: ${changes.last.what}` : ''}
            </button>
            <CopyLink />
            <RouterLink className="btn-quiet is-small as-link" to={`/${gateway.org}/commitment/${slug}`}>
              Open in Commitments
            </RouterLink>
          </div>
        </header>
        <WriteError error={changes.error} />
        <div className="draft-body">
          <article className="draft-outline" aria-busy={changes.busy}>
            <Sentence />
            <Sections />
          </article>
          <Coach dismissed={dismissed} dismiss={dismiss} />
        </div>
        {paletteOn && <Palette focus={paletteOn} onClose={() => setPaletteOn(null)} />}
        <UndoToast />
      </div>
    </DraftContext.Provider>
  )
}

function CopyLink() {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      className="btn-quiet is-small"
      onClick={() =>
        void navigator.clipboard?.writeText(window.location.href).then(() => {
          setCopied(true)
          setTimeout(() => setCopied(false), 2000)
        })
      }
    >
      {copied ? 'Link copied' : 'Copy link'}
    </button>
  )
}

/** The last change, with Undo, for eight seconds after it is made. */
function UndoToast() {
  const { changes } = useDraftState()
  const [shown, setShown] = useState<string | null>(null)
  const last = changes.last
  useEffect(() => {
    if (!last) return setShown(null)
    setShown(last.what)
    const timer = setTimeout(() => setShown(null), 8000)
    return () => clearTimeout(timer)
  }, [last])
  if (!shown) return null
  return (
    <div className="undo-toast" role="status">
      <span>{shown}</span>
      <button type="button" className="btn-link" onClick={() => void changes.undo()} disabled={changes.busy}>
        Undo
      </button>
    </div>
  )
}
