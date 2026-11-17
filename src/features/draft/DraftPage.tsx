import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link as RouterLink, useParams } from 'react-router'
import { useDemos } from '../../app/session.ts'
import { Problem } from '../../app/Card.tsx'
import { type Item, itemKey, palette } from '../../domain/draft/palette.ts'
import { type Ref, refKey } from '../../domain/record.ts'
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
import Palette from './Palette.tsx'
import { Sections } from './Sections.tsx'
import { Sentence } from './Sentence.tsx'
import { useDismissed, useDraft, useModel, useUndoableWrites, useUnsaved } from './useDraft.ts'
import './draft.css'

// New commitment as a page, not a menu (docs/21-new-commitment.md, N1, phase A): #/<org>/draft asks what is being
// committed to, and #/<org>/draft/<slug> is the drafting page, the outline beside the coach. Phase A runs in the
// branch the visitor works in (an update of theirs, or their sandbox), on tyapi's generic record routes; Review and
// Merge come with tyapi docs/20, phase 4.

export default function DraftPage() {
  const { slug } = useParams()
  const gateway = useGateway()
  // A new draft, or another update, starts the page afresh: its unsaved cards, dismissals and focus are its own.
  return slug ? <Drafting key={`${gateway.branch}/${slug}`} slug={slug} /> : <Start />
}

/** The first sentence of what was typed, as the commitment's title. */
const titleOf = (text: string) => {
  const first = text.trim().split(/(?<=[.!?])\s+|\n/)[0].trim().replace(/[.!?]$/, '')
  return first.length > 100 ? `${first.slice(0, 97).trimEnd()}…` : first
}

function Start() {
  const gateway = useGateway()
  const client = useClient()
  const { go } = useRouteState()
  const { readOnly, why } = useWriteContext()
  const { portfolio } = usePortfolio()
  const writes = useUndoableWrites()
  const [text, setText] = useState('')
  const drafts = portfolio?.commitments.filter((c) => c.state === 'proposed') ?? []
  const start = async () => {
    const said = text.trim()
    if (!said) return
    const made = await writes.run(() =>
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
        <button type="button" className="btn-action" onClick={() => void start()} disabled={!text.trim() || writes.busy || readOnly} title={readOnly ? why : undefined}>
          {writes.busy ? 'Starting…' : 'Start drafting'}
        </button>
        <RouterLink className="btn-quiet as-link" to={`/${gateway.org}/commitment?new=import`}>
          or import a sample document
        </RouterLink>
      </div>
      <WriteError error={writes.error} />
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
  const { readOnly } = useWriteContext()
  const demos = useDemos()
  const model = useModel()
  const { draft, error, missing, retry } = useDraft(slug)
  const writes = useUndoableWrites()
  const storage = `dw:draft:${gateway.graph}:${gateway.branch}:${slug}`
  const unsaved = useUnsaved(`${storage}:unsaved`)
  const { dismissed, dismiss } = useDismissed(`${storage}:dismissed`)
  const [focus, setFocus] = useState<Ref>({ type: 'Commitment', slug })
  const [paletteOn, setPaletteOn] = useState<Ref | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
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
  const addByKey = useCallback(
    (on: Ref, key: string) => {
      const item = model.data && palette(model.data, on.type, linksOf(on)).find((i) => itemKey(i) === key)
      if (item) addCard(on, item)
    },
    [model.data, linksOf, addCard],
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
        void writes.undo()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [focus, paletteOn, readOnly, writes])

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
            writes,
            unsaved,
            focus,
            setFocus,
            openPalette: setPaletteOn,
            addCard,
            addByKey,
            editing,
            setEditing,
            linksOf,
            recordOf,
          }
        : null,
    [model.data, draft, gateway, clock.today, readOnly, persona, writes, unsaved, focus, addCard, addByKey, editing, linksOf, recordOf],
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
  if (error || model.error) {
    return <Problem what="open the draft" error={error ?? model.error} onRetry={() => (model.error ? void model.refetch() : retry())} />
  }
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
                void writes.run(
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
            <button type="button" className="btn-quiet is-small" onClick={() => void writes.undo()} disabled={!writes.last || writes.busy}>
              Undo{writes.last ? `: ${writes.last.what}` : ''}
            </button>
            <CopyLink />
            <RouterLink className="btn-quiet is-small as-link" to={`/${gateway.org}/commitment/${slug}`}>
              Open in Commitments
            </RouterLink>
          </div>
        </header>
        <WriteError error={writes.error} />
        <div className="draft-body">
          <article className="draft-outline" aria-busy={writes.busy}>
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
  const { writes } = useDraftState()
  const [shown, setShown] = useState<string | null>(null)
  const last = writes.last
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
      <button type="button" className="btn-link" onClick={() => void writes.undo()} disabled={writes.busy}>
        Undo
      </button>
    </div>
  )
}
