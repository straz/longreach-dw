import { useQuery } from '@tanstack/react-query'
import { type ReactNode, useMemo } from 'react'
import { Navigate, Outlet, useParams } from 'react-router'
import { ApiError, answer, client as api } from '../api.ts'
import { localToday } from '../domain/dates.ts'
import { type Opened, OpenedProvider, useClient } from '../features/shared/client.tsx'
import LookingBackBar from '../features/shared/LookingBackBar.tsx'
import { useRouteState } from '../features/shared/routeState.ts'
import { useBriefs } from '../features/shared/useBriefs.ts'
import { useScrollMemory } from '../features/shared/useScrollMemory.ts'
import { usePortfolio } from '../features/shared/usePortfolio.ts'
import { type UpdateChoice, UpdateContext, useChosenBranch, useUpdateDiffPoll } from '../features/updates/useUpdates.ts'
import { DwGateway } from '../gateway/dw.ts'
import { GatewayProvider } from '../gateway/react.tsx'
import { MAIN, isMain } from '../project.ts'
import { keys } from '../queryKeys.ts'
import { startSandbox } from '../writes.ts'
import { Card, Problem } from './Card.tsx'
import Chevrons, { PANEL_ID, tabId } from './Chevrons.tsx'
import { type Heading, demoFrom, demoHeading, projectFrom, projectHeading } from './demo.ts'
import HeadlineStrip from './HeadlineStrip.tsx'
import Navbar from './Navbar.tsx'
import { type DemoListing, type ProjectListing, defaultDemo, useDemos, useProjects, useSession, whoIs, writes } from './session.ts'
import './Shell.css'

// One demo or project, as the URL names it, around test8's frame. A demo (#/<org>/…): its content from tyapi
// (GET /v1/projects/{org}/{project}/demo), opened as its persona in the visitor's sandbox of its graph; a demo the
// visitor cannot open goes to their first. A project of the user's own (#/p/<org>/<project>/…, tyapi docs/20, P1):
// opened as them, at today's date, reading main until they work in an update; a change made while reading main
// starts one.

/** The visitor's demos, once listed; until then, saying so, or what went wrong. */
export function DemosGate({ children }: { children: (demos: DemoListing[]) => ReactNode }) {
  const demos = useDemos()
  if (demos.isPending) return <Card lede="Opening your demos…" />
  if (demos.error) return <Problem what="list your demos" error={demos.error} onRetry={() => void demos.refetch()} />
  return children(demos.data)
}

export default function DemoShell() {
  const { org } = useParams()
  return (
    <DemosGate>
      {(demos) => {
        const listing = demos.find((d) => d.org === org)
        return listing ? <DemoWorkspace key={listing.graph} listing={listing} /> : <FirstDemo demos={demos} />
      }}
    </DemosGate>
  )
}

function DemoWorkspace({ listing }: { listing: DemoListing }) {
  const content = useQuery({
    queryKey: keys.demo(listing.graph),
    queryFn: async () => demoFrom(await answer(api.GET('/v1/projects/{org}/{project}/demo', { params: { path: { org: listing.org, project: listing.project } } }))),
  })
  // The visitor's own branch of the demo, started on opening it so reads and writes always have one (tyapi W11).
  // A visitor who may only read the demo reads its main.
  const sandbox = useQuery({
    queryKey: keys.sandbox(listing.graph),
    queryFn: async () => {
      try {
        return (await startSandbox(listing)).branch
      } catch (e) {
        if (e instanceof ApiError && e.status === 403) return MAIN
        throw e
      }
    },
  })
  // The update the visitor works in, if they chose one and it is still open (tyapi docs/20, P5); else the sandbox.
  const { branch, choice } = useChosenBranch(listing, sandbox.data, sandbox.data !== undefined && !isMain(sandbox.data))
  const heading = useMemo(() => demoHeading(listing), [listing])

  if (sandbox.error) return <Problem what={`open your copy of ${listing.org_name}`} error={sandbox.error} onRetry={() => void sandbox.refetch()} />
  if (content.error) return <Problem what={`open ${listing.org_name}`} error={content.error} onRetry={() => void content.refetch()} />
  if (content.isPending || !branch) return <Card lede={`Opening ${listing.org_name}…`} />
  return <Workspace heading={heading} opened={content.data} branch={branch} choice={choice} />
}

/** A project of the user's own, as the URL names it, once it is made; while it is being made, saying so. */
export function ProjectShell() {
  const { org, project } = useParams()
  const { me } = useSession()
  const projects = useProjects()
  if (projects.isPending) return <Card lede="Opening your projects…" />
  if (projects.error) return <Problem what="list your projects" error={projects.error} onRetry={() => void projects.refetch()} />
  const found = projects.data.projects.find((p) => p.org === org && p.project === project && !p.demo)
  if (!found) return <Card lede={`No project ${org}/${project} is open to ${whoIs(me)}.`} />
  if (found.state === 'creating') return <Card lede={`Making ${found.name}: its graph is being set up. This page opens it when it is ready.`} />
  if (found.state === 'failed') return <Problem what={`make ${found.name}`} error={found.error ?? 'the reconciler did not make its graph'} />
  return <ProjectWorkspace key={found.graph} found={found} />
}

function ProjectWorkspace({ found }: { found: ProjectListing }) {
  const { me } = useSession()
  const today = localToday()
  const heading = useMemo(() => projectHeading(found, me), [found, me])
  const opened = useMemo(() => projectFrom(found, me, today), [found, me, today])
  const { branch, choice } = useChosenBranch(found, MAIN, writes(found.role))
  return <Workspace heading={heading} opened={opened} branch={branch ?? MAIN} choice={choice} />
}

/** A demo or project open: what it is, a gateway on the branch worked in, and the update choice, around the frame. */
function Workspace({ heading, opened, branch, choice }: { heading: Heading; opened: Opened; branch: string; choice: UpdateChoice }) {
  const gateway = useMemo(() => new DwGateway({ ...heading, branch }), [heading, branch])
  return (
    <OpenedProvider opened={opened}>
      <GatewayProvider client={gateway}>
        <UpdateContext value={choice}>
          <Frame heading={heading} />
        </UpdateContext>
      </GatewayProvider>
    </OpenedProvider>
  )
}

/** Where a URL that names no demo the visitor can open goes: their first, or word that they have none. */
export function FirstDemo({ demos }: { demos: DemoListing[] }) {
  const { me, signOut } = useSession()
  const first = defaultDemo(demos)
  if (first) return <Navigate to={`/${first.org}`} replace />
  return (
    <Card lede={`No demo is open to ${whoIs(me)}. Ask Longreach to add you to Decision Watch's visitors.`}>
      <button type="button" className="btn-line signin-button" onClick={signOut}>
        Log out
      </button>
    </Card>
  )
}

/** The frame every tab shares, from test8 (its docs/PLAN.md §4.1). Counts and headline figures come from the
 *  graph as of the route's date. The open update's changes are polled here, whatever the tab. */
function Frame({ heading }: { heading: Heading }) {
  const { me } = useSession()
  const { tab } = useRouteState()
  const { portfolio } = usePortfolio()
  const { briefs } = useBriefs()
  useScrollMemory()
  useUpdateDiffPoll(me.principal_id)
  const client = useClient()
  const active = portfolio?.commitments.filter((c) => c.status === 'active').length
  return (
    <div className="shell">
      <Navbar heading={heading} />
      <Chevrons
        counts={{
          commitment: active === undefined ? undefined : String(active),
          watch: portfolio ? String(portfolio.watch.flags.length) : undefined,
          reconsider: briefs ? String(briefs.filter((b) => b.state === 'open').length) : undefined,
        }}
      />
      <HeadlineStrip />
      <LookingBackBar />
      <main id={PANEL_ID} role="tabpanel" aria-labelledby={tabId(tab)} className="shell-panel">
        <Outlet />
      </main>
      <footer className="shell-footer">{client.footer}</footer>
    </div>
  )
}
