import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import type { Me } from '../api.ts'
import { formatDate } from '../domain/format.ts'
import AsOfControl from '../features/shared/AsOfControl.tsx'
import { useGateway } from '../gateway/react.tsx'
import { startOver } from '../writes.ts'
import { useDismiss } from '../ui/useDismiss.ts'
import { type DemoListing, whoIs } from './session.ts'
import { say } from './Card.tsx'
import { sandboxKey } from './Shell.tsx'
import './Navbar.css'

// The bar every screen shares, from test8's (docs/PLAN.md §2). The user menu is a disclosure: a button that shows
// a panel of plain buttons, closed by Escape (focus back on the button) or a press outside. The organization is the demo open, then the
// as-of control; the user menu lists every demo the visitor can open, each as its persona at its own clock, and switching opens that
// demo's organization. Below them, Start over (the visitor's changes to this demo are deleted, tyapi W11), the
// Google account the visitor signed in with, and Log out.
export default function Navbar({ demo, demos, me, onSignOut }: { demo: DemoListing; demos: DemoListing[]; me: Me; onSignOut: () => void }) {
  return (
    <header className="navbar">
      <Link className="navbar-brand" to={`/${demo.org}/commitment`} aria-label={`Longreach, back to ${demo.org_name}`}>
        <img className="navbar-logo" src={`${import.meta.env.BASE_URL}longreach-logo-white.svg`} alt="" width={23} height={28} />
      </Link>
      <span className="navbar-org">{demo.org_name}</span>
      <span className="navbar-space" />
      <AsOfControl />
      <UserMenu demo={demo} demos={demos} me={me} onSignOut={onSignOut} />
    </header>
  )
}

/** A demo's clock, the day its screens are as of. */
export const clockDay = (demo: DemoListing) => formatDate(demo.frame.clock, { long: true })

function UserMenu({ demo, demos, me, onSignOut }: { demo: DemoListing; demos: DemoListing[]; me: Me; onSignOut: () => void }) {
  const navigate = useNavigate()
  const gateway = useGateway()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [resetError, setResetError] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  const button = useRef<HTMLButtonElement>(null)
  const close = useCallback(() => setOpen(false), [])
  useDismiss(ref, open, close, button)

  const reset = async () => {
    if (!window.confirm(`Start over in ${demo.org_name}? Every change you made to it is deleted, and it goes back to how it began.`)) return
    setResetting(true)
    setResetError(null)
    try {
      // The branch the gateway started is the one to read from now on, whatever its name.
      const sandbox = await startOver(gateway)
      queryClient.setQueryData(sandboxKey(gateway.graph), sandbox.branch)
      await queryClient.invalidateQueries({ queryKey: [gateway.graph] })
      setOpen(false)
    } catch (e) {
      setResetError(say(e))
    } finally {
      setResetting(false)
    }
  }

  const persona = demo.persona
  return (
    <div className="usermenu" ref={ref}>
      <button ref={button} type="button" className="usermenu-button" aria-expanded={open} aria-controls="usermenu-panel" onClick={() => setOpen((o) => !o)}>
        <span className="usermenu-avatar" aria-hidden="true">
          {initials(persona.name)}
        </span>
        <span className="usermenu-name">
          {persona.name}, {persona.title}
        </span>
        <svg width="10" height="6" viewBox="0 0 10 6" aria-hidden="true">
          <path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </button>
      {open && (
        <div id="usermenu-panel" className="usermenu-panel" role="group" aria-label="Open a demo as">
          <p className="usermenu-heading">Signed in to {demo.org_name}</p>
          {demos.map((d) => {
            const current = d.org === demo.org
            return (
              <button
                key={d.org}
                type="button"
                aria-current={current || undefined}
                className={`usermenu-item${current ? ' is-current' : ''}`}
                onClick={() => {
                  setOpen(false)
                  if (!current) navigate(`/${d.org}`)
                }}
              >
                <span className="usermenu-avatar is-small" aria-hidden="true">
                  {initials(d.persona.name)}
                </span>
                <span>
                  <strong>{d.persona.name}</strong>
                  <span>
                    {d.persona.title}, {d.org_name}, as of {clockDay(d)}
                  </span>
                </span>
                {current && <span className="usermenu-current">Signed in</span>}
              </button>
            )
          })}
          <p className="usermenu-note">Each demo is its own organization, at its own date.</p>
          {gateway.branch !== 'main' && (
            <>
              <div className="usermenu-sep" aria-hidden="true" />
              <button type="button" className="usermenu-item is-plain" disabled={resetting} onClick={() => void reset()}>
                {resetting ? 'Starting over…' : `Start over in ${demo.org_name}`}
              </button>
              <p className="usermenu-note">Your changes are yours alone; starting over deletes them.</p>
              {resetError && (
                <p className="usermenu-note" role="alert">
                  Could not start over: {resetError}
                </p>
              )}
            </>
          )}
          <div className="usermenu-sep" aria-hidden="true" />
          <p className="usermenu-note">Google account: {whoIs(me)}</p>
          <button type="button" className="usermenu-item is-plain" onClick={onSignOut}>
            Log out
          </button>
        </div>
      )}
    </div>
  )
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
