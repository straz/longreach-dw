import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import type { Me } from '../api.ts'
import { formatDate } from '../domain/format.ts'
import AsOfControl from '../features/shared/AsOfControl.tsx'
import { useGateway } from '../gateway/react.tsx'
import { startOver } from '../writes.ts'
import type { Demo } from './session.ts'
import './Navbar.css'

// The bar every screen shares, from test8's (docs/PLAN.md §2). The organization is the demo open, then the
// as-of control; the user menu lists every demo the visitor can open, each as its persona at its own clock, and switching opens that
// demo's organization. Below them, Start over (the visitor's changes to this demo are deleted, tyapi W11), the
// Google account the visitor signed in with, and Log out.
export default function Navbar({ demo, demos, me, onSignOut }: { demo: Demo; demos: Demo[]; me: Me; onSignOut: () => void }) {
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
export const clockDay = (demo: Demo) => formatDate(demo.frame.clock.slice(0, 10), { long: true })

function UserMenu({ demo, demos, me, onSignOut }: { demo: Demo; demos: Demo[]; me: Me; onSignOut: () => void }) {
  const navigate = useNavigate()
  const gateway = useGateway()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [resetError, setResetError] = useState<string | null>(null)

  const reset = async () => {
    if (!window.confirm(`Start over in ${demo.org_name}? Every change you made to it is deleted, and it goes back to how it began.`)) return
    setResetting(true)
    setResetError(null)
    try {
      await startOver(gateway)
      await queryClient.invalidateQueries({ queryKey: [gateway.graph] })
      setOpen(false)
    } catch (e) {
      setResetError(e instanceof Error ? e.message : String(e))
    } finally {
      setResetting(false)
    }
  }
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    const key = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', key)
    return () => {
      document.removeEventListener('pointerdown', close)
      document.removeEventListener('keydown', key)
    }
  }, [open])

  const persona = demo.persona
  return (
    <div className="usermenu" ref={ref}>
      <button type="button" className="usermenu-button" aria-expanded={open} aria-haspopup="menu" onClick={() => setOpen((o) => !o)}>
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
        <div className="usermenu-panel" role="menu" aria-label="Open a demo as">
          <p className="usermenu-heading">Signed in to {demo.org_name}</p>
          {demos.map((d) => {
            const current = d.org === demo.org
            return (
              <button
                key={d.org}
                type="button"
                role="menuitemradio"
                aria-checked={current}
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
              <div className="usermenu-sep" role="separator" />
              <button type="button" role="menuitem" className="usermenu-item is-plain" disabled={resetting} onClick={() => void reset()}>
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
          <div className="usermenu-sep" role="separator" />
          <p className="usermenu-note">Google account: {me.email ?? me.display_name}</p>
          <button type="button" role="menuitem" className="usermenu-item is-plain" onClick={onSignOut}>
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
