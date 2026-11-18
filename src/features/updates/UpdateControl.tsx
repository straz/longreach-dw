import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router'
import { plural } from '../../domain/format.ts'
import { useGateway } from '../../gateway/react.tsx'
import { MAIN, isMain } from '../../project.ts'
import { keys } from '../../queryKeys.ts'
import { Menu } from '../../ui/Menu.tsx'
import { type Update, discardUpdate, renameUpdate, startUpdate } from '../../updates.ts'
import { useClient } from '../shared/client.tsx'
import { useBasePath } from '../shared/routeState.ts'
import { useAction } from '../shared/useAction.ts'
import './updates.css'
import { useCurrentUpdate, useUpdateChoice, useUpdates } from './useUpdates.ts'

// The update control (tyapi docs/20, §3 and P5): which of the user's updates the demo or project is read and
// written in. A navbar menu: in a project, main; the user's updates (and their sandbox of a demo), each with how
// many records it changes; a new update, named; and for the one open, its changes, Rename and Discard.

const counted = (n: number) => (n === 0 ? 'No changes yet' : `${plural(n, 'record')} changed`)

export default function UpdateControl() {
  const gateway = useGateway()
  const base = useBasePath()
  const queryClient = useQueryClient()
  const { choose, writer, base: start } = useUpdateChoice()
  const { demo } = useClient()
  const updates = useUpdates()
  const current = useCurrentUpdate()
  const [naming, setNaming] = useState('')
  const [renaming, setRenaming] = useState<string | null>(null)
  const { busy, problem, run } = useAction()
  if (!writer) return null

  const listKey = keys.updates(gateway.graph)
  const act = (what: () => Promise<unknown>) =>
    run(async () => {
      await what()
      await queryClient.invalidateQueries({ queryKey: listKey })
    })
  // A new update is in the list before it is chosen, so it is never taken for one discarded.
  const begin = (name: string, close: () => void) =>
    act(async () => {
      const made = await startUpdate(gateway, name)
      queryClient.setQueryData<Update[]>(listKey, (old) => [made, ...(old ?? [])])
      setNaming('')
      choose(made.branch)
      close()
    })
  const mine = updates.data ?? []
  const name = isMain(gateway.branch) ? 'main' : current ? (current.sandbox ? 'Sandbox' : current.name) : demo ? 'Sandbox' : 'an update'
  const onMain = isMain(gateway.branch)
  const face = (
    <>
      <span className="update-dot" aria-hidden="true" />
      <span>
        Working in: <strong>{name}</strong>
        {current && current.changes > 0 && <span className="updates-count"> · {current.changes}</span>}
      </span>
    </>
  )
  return (
    <Menu face={face} label="Your updates">
      {(close) => (
        <>
          {start === MAIN && (
            <button
              type="button"
              aria-current={onMain || undefined}
              className={`menu-item${onMain ? ' is-current' : ''}`}
              onClick={() => {
                choose(null)
                close()
              }}
            >
              <span className="update-dot is-main" aria-hidden="true" />
              <span>
                <strong>main</strong>
                <span>What everyone reads; a change made here starts an update</span>
              </span>
              {onMain && <span className="menu-current">Open</span>}
            </button>
          )}
          <p className="menu-heading">Your updates</p>
          {mine.map((u) => {
            const here = u.branch === gateway.branch
            return (
              <button
                key={u.branch}
                type="button"
                aria-current={here || undefined}
                className={`menu-item${here ? ' is-current' : ''}`}
                onClick={() => {
                  choose(u.sandbox ? null : u.branch)
                  close()
                }}
              >
                <span className="update-dot" aria-hidden="true" />
                <span>
                  <strong>{u.sandbox ? 'Sandbox' : u.name}</strong>
                  <span>{counted(u.changes)}</span>
                </span>
                {here && <span className="menu-current">Open</span>}
              </button>
            )
          })}
          <form
            className="menu-form"
            onSubmit={(e) => {
              e.preventDefault()
              if (naming.trim()) void begin(naming.trim(), close)
            }}
          >
            <input className="menu-input" aria-label="Name a new update" placeholder="New update: name it…" value={naming} onChange={(e) => setNaming(e.target.value)} disabled={busy !== null} />
          </form>
          <p className="menu-note">Each update keeps its changes apart from the others, until it is merged or discarded.</p>
          {!isMain(gateway.branch) && (
            <>
              <div className="menu-sep" aria-hidden="true" />
              <Link className="menu-item is-plain" to={`${base}/update`} onClick={close}>
                See what {current && !current.sandbox ? 'this update' : 'your sandbox'} changes
              </Link>
            </>
          )}

          {current && !current.sandbox && (
            <>
              {renaming === null ? (
                <button type="button" className="menu-item is-plain" onClick={() => setRenaming(current.name)}>
                  Rename “{current.name}”
                </button>
              ) : (
                <form
                  className="menu-form"
                  onSubmit={(e) => {
                    e.preventDefault()
                    const named = renaming.trim()
                    if (named) void act(async () => (await renameUpdate(gateway, current.branch, named), setRenaming(null)))
                  }}
                >
                  <input className="menu-input" aria-label="Rename the update" value={renaming} autoFocus onChange={(e) => setRenaming(e.target.value)} onKeyDown={(e) => e.key === 'Escape' && setRenaming(null)} />
                </form>
              )}
              <button
                type="button"
                className="menu-item is-plain"
                disabled={busy !== null}
                onClick={() => {
                  if (!window.confirm(`Discard “${current.name}”? ${current.changes === 1 ? 'Its change is' : `Its ${plural(current.changes, 'change')} are`} deleted.`)) return
                  void act(async () => {
                    await discardUpdate(gateway, current.branch)
                    choose(null)
                    close()
                  })
                }}
              >
                Discard “{current.name}”
              </button>
            </>
          )}
          {problem && (
            <p className="menu-note" role="alert">
              {problem}
            </p>
          )}
        </>
      )}
    </Menu>
  )
}
