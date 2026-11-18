import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { formatDate } from '../domain/format.ts'
import AsOfControl from '../features/shared/AsOfControl.tsx'
import { useClient } from '../features/shared/client.tsx'
import { useBasePath } from '../features/shared/routeState.ts'
import UpdateControl from '../features/updates/UpdateControl.tsx'
import { useGateway } from '../gateway/react.tsx'
import { isMain } from '../project.ts'
import { Menu } from '../ui/Menu.tsx'
import { keys } from '../queryKeys.ts'
import { say } from '../ui/Notice.tsx'
import { startOver } from '../writes.ts'
import type { Heading } from './demo.ts'
import { type DemoListing, useDemos, useProjects, useSession, whoIs } from './session.ts'
import './Navbar.css'

// The bar every screen shares, from test8's (docs/PLAN.md §2). The user menu is a disclosure (ui/Menu.tsx). The
// organization is the demo or project open, then the update control and the as-of control; the user menu lists the
// user's projects, then every demo they can open, each as its persona at its own clock, and switching opens it.
// Below them, in a demo, Start over (the visitor's changes to it are deleted, tyapi W11); Connect your AI; the Google
// account the user signed in with, and Log out.
export default function Navbar({ heading }: { heading: Heading }) {
  const base = useBasePath()
  return (
    <header className="navbar">
      <Link className="navbar-brand" to={`${base}/commitment`} aria-label={`Longreach, back to ${heading.orgName}`}>
        <img className="navbar-logo" src={`${import.meta.env.BASE_URL}longreach-logo-white.svg`} alt="" width={23} height={28} />
      </Link>
      <span className="navbar-org">{heading.orgName}</span>
      <span className="navbar-space" />
      <UpdateControl />
      <AsOfControl />
      <UserMenu heading={heading} />
    </header>
  )
}

/** A demo's clock, the day its screens are as of. */
const clockDay = (demo: DemoListing) => formatDate(demo.frame.clock, { long: true })

function UserMenu({ heading }: { heading: Heading }) {
  const { me, signOut } = useSession()
  const demos = useDemos().data ?? []
  const navigate = useNavigate()
  const gateway = useGateway()
  const client = useClient()
  const queryClient = useQueryClient()
  const projects = useProjects().data
  const here = useParams()
  const [resetting, setResetting] = useState(false)
  const [resetError, setResetError] = useState<string | null>(null)

  const reset = async (close: () => void) => {
    if (!window.confirm(`Start over in ${heading.orgName}? Every change you made to it is deleted, and it goes back to how it began.`)) return
    setResetting(true)
    setResetError(null)
    try {
      // The branch the gateway started is the one to read from now on, whatever its name.
      const sandbox = await startOver(gateway)
      queryClient.setQueryData(keys.sandbox(gateway.graph), sandbox.branch)
      await queryClient.invalidateQueries({ queryKey: keys.graph(gateway.graph) })
      close()
    } catch (e) {
      setResetError(say(e))
    } finally {
      setResetting(false)
    }
  }

  const who = heading.who
  const face = (
    <>
      <span className="usermenu-avatar" aria-hidden="true">
        {initials(who.name)}
      </span>
      <span>
        {who.name}, {who.title}
      </span>
    </>
  )
  return (
    <Menu face={face} label="Your projects and demos">
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
            const current = !here.project && d.org === heading.org
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
                {resetting ? 'Starting over…' : `Start over in ${heading.orgName}`}
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
          {projects && projects.can_create_in.length > 0 && (
            <Link className="menu-item is-plain" to="/model-consent" onClick={close}>
              Model providers…
            </Link>
          )}
          <p className="menu-note">Google account: {whoIs(me)}</p>
          <button type="button" className="menu-item is-plain" onClick={signOut}>
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
