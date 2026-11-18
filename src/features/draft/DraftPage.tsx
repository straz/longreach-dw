import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link as RouterLink, useParams } from 'react-router'
import { type Item, itemKey, palette } from '../../domain/draft/palette.ts'
import { type Ref, refKey } from '../../domain/record.ts'
import { createRecord, putRecord } from '../../entities.ts'
import { useGateway } from '../../gateway/react.tsx'
import { isMain } from '../../project.ts'
import { PanelProblem } from '../../ui/Notice.tsx'
import { keys } from '../../queryKeys.ts'
import { uploadFile } from '../../sources.ts'
import { startUpdate } from '../../updates.ts'
import { useClient, useClock } from '../shared/client.tsx'
import { useBasePath, useRouteState } from '../shared/routeState.ts'
import { usePortfolio } from '../shared/usePortfolio.ts'
import { useWriteContext } from '../shared/useWriteContext.ts'
import { useAction } from '../shared/useAction.ts'
import WriteError from '../shared/WriteError.tsx'
import { useCurrentUpdate, useFollowWrite, useIsWriter, useUpdateChoice } from '../updates/useUpdates.ts'
import Coach from './Coach.tsx'
import { DraftContext, type DraftState, useDraftState } from './context.ts'
import { InlineText } from './Inline.tsx'
import Palette from './Palette.tsx'
import { Sections } from './Sections.tsx'
import { Sentence } from './Sentence.tsx'
import { useDismissed, useDraft, useModel, useUndoableWrites, useUnsaved } from './useDraft.ts'
import './draft.css'

// New commitment as a page, not a menu (docs/21-new-commitment.md, N1, phase A): …/draft asks what is being
// committed to, and …/draft/<slug> is the drafting page, the outline beside the coach, on tyapi's generic record
// routes, in the branch the user works in: an update of theirs, or their sandbox of a demo. Starting a draft while
// reading a project's main starts an update for it; a draft opened from main is read there, and edited in an update
// started for it, so the page never changes branch under the user's hands. Review and Merge are the update's page
// (features/updates/).

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
  const base = useBasePath()
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
        {client.demo && (
          <RouterLink className="btn-quiet as-link" to={`${base}/commitment?new=import`}>
            or import a sample document
          </RouterLink>
        )}
        <UploadButton disabled={readOnly} />
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
                <RouterLink to={`${base}/draft/${d.commitment}`}>{d.title}</RouterLink>
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
  const client = useClient()
  const base = useBasePath()
  const clock = useClock()
  const writeContext = useWriteContext()
  const writer = useIsWriter()
  const { choose } = useUpdateChoice()
  const current = useCurrentUpdate()
  const onMain = isMain(gateway.branch) && writer
  const readOnly = writeContext.readOnly || onMain
  const starting = useAction()
  const model = useModel()
  const { draft, error, missing, retry } = useDraft(slug)
  const writes = useUndoableWrites()
  const storage = `dw:draft:${gateway.graph}:${gateway.branch}:${slug}`
  const unsaved = useUnsaved(`${storage}:unsaved`)
  const { dismissed, dismiss } = useDismissed(`${storage}:dismissed`)
  const [focus, setFocus] = useState<Ref>({ type: 'Commitment', slug })
  const [paletteOn, setPaletteOn] = useState<Ref | null>(null)
  const [editing, setEditing] = useState<string | null>(null)

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
            who: client.who,
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
    [model.data, draft, gateway, clock.today, readOnly, client.who, writes, unsaved, focus, addCard, addByKey, editing, linksOf, recordOf],
  )

  if (missing) {
    return (
      <div className="draft-start">
        <h1>No draft here</h1>
        <p>
          There is no commitment {slug} here. <RouterLink to={`${base}/draft`}>Start a new one</RouterLink>.
        </p>
      </div>
    )
  }
  if (error || model.error) {
    return <PanelProblem what="open the draft" error={error ?? model.error} onRetry={() => (model.error ? void model.refetch() : retry())} />
  }
  if (!state) return <p className="draft-loading">Opening the draft…</p>
  const r = state.draft.record
  return (
    <DraftContext.Provider value={state}>
      <div className="draft">
        <header className="draft-head">
          <p className="draft-eyebrow">
            Draft · proposed · {isMain(gateway.branch) ? 'on main' : current?.sandbox ? 'in your copy of the demo' : 'in your update'}
            {readOnly && <span className="draft-readonly"> · read only</span>}
          </p>
          {onMain && !writeContext.readOnly && (
            <p className="draft-on-main">
              You are reading main. Edit this draft in an update of yours, and merge it when it is ready.{' '}
              <button
                type="button"
                className="btn-line is-small"
                disabled={starting.busy !== null}
                onClick={() => void starting.run(async () => choose((await startUpdate(gateway, `Draft: ${String(r.title ?? slug)}`)).branch))}
              >
                {starting.busy ? 'Starting an update…' : 'Edit in a new update'}
              </button>
              {starting.problem && <span role="alert"> Could not start one: {starting.problem}</span>}
            </p>
          )}
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
            <RouterLink className="btn-quiet is-small as-link" to={`${base}/commitment/${slug}`}>
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

/** Upload a document to read a draft from (tyapi P18): to the update worked in, or a new one named for the file.
 *  Decision Watch's assistant reads it into a draft; until it does, the update's page lists it, kept. */
function UploadButton({ disabled }: { disabled: boolean }) {
  const gateway = useGateway()
  const { go } = useRouteState()
  const follow = useFollowWrite()
  const queryClient = useQueryClient()
  const input = useRef<HTMLInputElement>(null)
  const { busy, problem, run } = useAction()
  const send = (file: File) =>
    run(async () => {
      const made = await uploadFile(gateway, file)
      await queryClient.invalidateQueries({ queryKey: keys.graph(gateway.graph) })
      follow(made)
      go('/update')
    })
  return (
    <>
      <input
        ref={input}
        type="file"
        hidden
        aria-label="A document to upload"
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (file) void send(file)
        }}
      />
      <button type="button" className="btn-quiet" disabled={disabled || busy !== null} onClick={() => input.current?.click()}>
        {busy ? 'Uploading…' : 'or upload a document'}
      </button>
      {problem && (
        <p role="alert" className="write-error">
          Could not upload it: {problem}
        </p>
      )}
    </>
  )
}
