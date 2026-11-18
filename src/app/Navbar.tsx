import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import type { Me } from '../api.ts'
import { formatDate } from '../domain/format.ts'
import AsOfControl from '../features/shared/AsOfControl.tsx'
import { useClient } from '../features/shared/client.tsx'
import { useBasePath } from '../features/shared/routeState.ts'
import UpdateControl from '../features/updates/UpdateControl.tsx'
import { useGateway } from '../gateway/react.tsx'
import { isMain } from '../project.ts'
import { Menu } from '../ui/Menu.tsx'
import { startOver } from '../writes.ts'
import { type DemoListing, sandboxKey, useProjects, whoIs } from './session.ts'
import { say } from './Card.tsx'
import './Navbar.css'

// The bar every screen shares, from test8's (docs/PLAN.md §2). The user menu is a disclosure (ui/Menu.tsx). The organization is the demo open, then the
// as-of control; the user menu lists every demo the visitor can open, each as its persona at its own clock, and switching opens that
// demo's organization. Below them, Start over (the visitor's changes to this demo are deleted, tyapi W11), the
// Google account the visitor signed in with, and Log out.
export default function Navbar({ demo, demos, me, onSignOut }: { demo: DemoListing; demos: DemoListing[]; me: Me; onSignOut: () => void }) {
  const base = useBasePath()
  return (
    <header className="navbar">
      <Link className="navbar-brand" to={`${base}/commitment`} aria-label={`Longreach, back to ${demo.org_name}`}>
        <img className="navbar-logo" src={`${import.meta.env.BASE_URL}longreach-logo-white.svg`} alt="" width={23} height={28} />
      </Link>
      <span className="navbar-org">{demo.org_name}</span>
      <span className="navbar-space" />
      <UpdateControl me={me.principal_id} />
      <AsOfControl />
      <UserMenu demo={demo} demos={demos} me={me} onSignOut={onSignOut} />
    </header>
  )
}

/** A demo's clock, the day its screens are as of. */
const clockDay = (demo: DemoListing) => formatDate(demo.frame.clock, { long: true })

function UserMenu({ demo, demos, me, onSignOut }: { demo: DemoListing; demos: DemoListing[]; me: Me; onSignOut: () => void }) {
  const navigate = useNavigate()
  const gateway = useGateway()
  const client = useClient()
  const queryClient = useQueryClient()
  const projects = useProjects().data
  const here = useParams()
  const [resetting, setResetting] = useState(false)
  const [resetError, setResetError] = useState<string | null>(null)

  const reset = async (close: () => void) => {
    if (!window.confirm(`Start over in ${demo.org_name}? Every change you made to it is deleted, and it goes back to how it began.`)) return
    setResetting(true)
    setResetError(null)
    try {
      // The branch the gateway started is the one to read from now on, whatever its name.
      const sandbox = await startOver(gateway)
      queryClient.setQueryData(sandboxKey(gateway.graph), sandbox.branch)
      await queryClient.invalidateQueries({ queryKey: [gateway.graph] })
      close()
    } catch (e) {
      setResetError(say(e))
    } finally {
      setResetting(false)
    }
  }

  const persona = demo.persona
  const face = (
    <>
      <span className="usermenu-avatar" aria-hidden="true">
        {initials(persona.name)}
      </span>
      <span>
        {persona.name}, {persona.title}
      </span>
    </>
  )
  return (
    <Menu face={face} label="Open a demo as">
      {(close) => (
        <>
          {projects && (projects.projects.some((p) => !p.demo) || projects.can_create_in.length > 0) && (
            <>
              <p className="menu-heading">Your projects</p>
              {projects.projects
                .filter((p) => !p.demo)
                .map((p) => {
                  const current = here.org === p.org && here.project === p.project
                  return (
                    <button
                      key={p.graph}
                      type="button"
                      aria-current={current || undefined}
                      className={`menu-item${current ? ' is-current' : ''}`}
                      onClick={() => {
                        close()
                        if (!current) navigate(`/p/${p.org}/${p.project}`)
                      }}
                    >
                      <span className="usermenu-avatar is-small" aria-hidden="true">
                        {initials(p.name)}
                      </span>
                      <span>
                        <strong>{p.name}</strong>
                        <span>
                          {p.org_name}
                          {p.state === 'creating' ? ', being made' : p.state === 'failed' ? ', not made' : ''}
                        </span>
                      </span>
                      {current && <span className="menu-current">Open</span>}
                    </button>
                  )
                })}
              {projects.can_create_in.length > 0 && (
                <Link className="menu-item is-plain" to="/new-project" onClick={close}>
                  New project…
                </Link>
              )}
              <div className="menu-sep" aria-hidden="true" />
            </>
          )}
          <p className="menu-heading">Demos</p>
          {demos.map((d) => {
            const current = !here.project && d.org === demo.org
            return (
              <button
                key={d.org}
                type="button"
                aria-current={current || undefined}
                className={`menu-item${current ? ' is-current' : ''}`}
                onClick={() => {
                  close()
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
                {current && <span className="menu-current">Signed in</span>}
              </button>
            )
          })}
          <p className="menu-note">Each demo is its own organization, at its own date.</p>
          {client.demo && !isMain(gateway.branch) && (
            <>
              <div className="menu-sep" aria-hidden="true" />
              <button type="button" className="menu-item is-plain" disabled={resetting} onClick={() => void reset(close)}>
                {resetting ? 'Starting over…' : `Start over in ${demo.org_name}`}
              </button>
              <p className="menu-note">Your changes are yours alone; starting over deletes them.</p>
              {resetError && (
                <p className="menu-note" role="alert">
                  Could not start over: {resetError}
                </p>
              )}
            </>
          )}
          <div className="menu-sep" aria-hidden="true" />
          <Link className="menu-item is-plain" to="/connect-ai" onClick={close}>
            Connect your AI…
          </Link>
          <p className="menu-note">Google account: {whoIs(me)}</p>
          <button type="button" className="menu-item is-plain" onClick={onSignOut}>
            Log out
          </button>
        </>
      )}
    </Menu>
  )
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
