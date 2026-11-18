import { useQuery } from '@tanstack/react-query'
import { type ReactNode, useMemo } from 'react'
import { Navigate, Outlet, useParams } from 'react-router'
import { ApiError, answer, client as api } from '../api.ts'
import { DemoProvider, type OpenDemo, useClient } from '../features/shared/client.tsx'
import LookingBackBar from '../features/shared/LookingBackBar.tsx'
import { useRouteState } from '../features/shared/routeState.ts'
import { useBriefs } from '../features/shared/useBriefs.ts'
import { useScrollMemory } from '../features/shared/useScrollMemory.ts'
import { usePortfolio } from '../features/shared/usePortfolio.ts'
import { DwGateway } from '../gateway/dw.ts'
import { GatewayProvider } from '../gateway/react.tsx'
import { type UpdateChoice, UpdateContext, useChosenBranch } from '../features/updates/useUpdates.ts'
import { MAIN, isMain } from '../project.ts'
import { startSandbox } from '../writes.ts'
import { Card, Problem } from './Card.tsx'
import Chevrons, { PANEL_ID, tabId } from './Chevrons.tsx'
import { demoFrom, projectFrom } from './demo.ts'
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

export default function Shell() {
  const { org } = useParams()
  return (
    <DemosGate>
      {(demos) => {
        const listing = demos.find((d) => d.org === org)
        return listing ? <OpenDemo key={listing.graph} listing={listing} demos={demos} /> : <FirstDemo demos={demos} />
      }}
    </DemosGate>
  )
}

/** The sandbox's cached answer: the branch the visitor reads and writes in a demo (Navbar sets it on Start over). */
export const sandboxKey = (graph: string) => ['sandbox', graph] as const

function OpenDemo({ listing, demos }: { listing: DemoListing; demos: DemoListing[] }) {
  const content = useQuery({
    queryKey: ['demo', listing.graph],
    queryFn: async () => demoFrom(await answer(api.GET('/v1/projects/{org}/{project}/demo', { params: { path: { org: listing.org, project: listing.project } } }))),
  })
  // The visitor's own branch of the demo, started on opening it so reads and writes always have one (tyapi W11).
  // A visitor who may only read the demo reads its main.
  const sandbox = useQuery({
    queryKey: sandboxKey(listing.graph),
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

  if (sandbox.error) return <Problem what={`open your copy of ${listing.org_name}`} error={sandbox.error} onRetry={() => void sandbox.refetch()} />
  if (content.error) return <Problem what={`open ${listing.org_name}`} error={content.error} onRetry={() => void content.refetch()} />
  if (content.isPending || !branch) return <Card lede={`Opening ${listing.org_name}…`} />
  return <Workspace listing={listing} demos={demos} content={content.data} branch={branch} choice={choice} />
}

/** A project of the user's own, as the URL names it, once it is made; while it is being made, saying so. */
export function ProjectShell() {
  const { org, project } = useParams()
  const { me } = useSession()
  const projects = useProjects()
  return (
    <DemosGate>
      {(demos) => {
        if (projects.isPending) return <Card lede="Opening your projects…" />
        if (projects.error) return <Problem what="list your projects" error={projects.error} onRetry={() => void projects.refetch()} />
        const found = projects.data.projects.find((p) => p.org === org && p.project === project && !p.demo)
        if (!found) return <Card lede={`No project ${org}/${project} is open to ${whoIs(me)}.`} />
        if (found.state === 'creating') return <Card lede={`Making ${found.name}: its graph is being set up. This page opens it when it is ready.`} />
        if (found.state === 'failed') return <Problem what={`make ${found.name}`} error={found.error ?? 'the reconciler did not make its graph'} />
        return <OpenProject key={found.graph} found={found} demos={demos} />
      }}
    </DemosGate>
  )
}

function OpenProject({ found, demos }: { found: ProjectListing; demos: DemoListing[] }) {
  const { me } = useSession()
  const today = new Date().toISOString().slice(0, 10)
  // What the frame and the user menu show, in a demo's shape: the user themselves, at today's date.
  const listing = useMemo(
    (): DemoListing => ({
      graph: found.graph,
      org: found.org,
      org_name: found.org_name,
      project: found.project,
      name: found.name,
      persona: { party: '', actor: '', name: me.display_name ?? me.email ?? 'You', title: found.name },
      frame: { clock: today, timeline_start: today, money_unit: 'USD', footer: '' },
      briefs: 0,
      documents: 0,
    }),
    [found, me, today],
  )
  const content = useMemo(() => projectFrom(found, today), [found, today])
  const { branch, choice } = useChosenBranch(listing, MAIN, writes(found.role))
  return <Workspace listing={listing} demos={demos} content={content} branch={branch ?? MAIN} choice={choice} />
}

/** A demo or project open: its content, a gateway on the branch worked in, and the update choice, around the frame. */
function Workspace({ listing, demos, content, branch, choice }: { listing: DemoListing; demos: DemoListing[]; content: OpenDemo; branch: string; choice: UpdateChoice }) {
  const gateway = useMemo(() => new DwGateway({ ...listing, branch }), [listing, branch])
  return (
    <DemoProvider demo={content}>
      <GatewayProvider client={gateway}>
        <UpdateContext value={choice}>
          <Frame listing={listing} demos={demos} />
        </UpdateContext>
      </GatewayProvider>
    </DemoProvider>
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
 *  graph as of the route's date. */
function Frame({ listing, demos }: { listing: DemoListing; demos: DemoListing[] }) {
  const { me, signOut } = useSession()
  const { tab } = useRouteState()
  const { portfolio } = usePortfolio()
  const { briefs } = useBriefs()
  useScrollMemory()
  const client = useClient()
  const active = portfolio?.commitments.filter((c) => c.status === 'active').length
  return (
    <div className="shell">
      <Navbar demo={listing} demos={demos} me={me} onSignOut={signOut} />
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
