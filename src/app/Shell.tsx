import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { Navigate, Outlet, useParams } from 'react-router'
import { ApiError, answer, client as api } from '../api.ts'
import { DemoProvider, useClient } from '../features/shared/client.tsx'
import LookingBackBar from '../features/shared/LookingBackBar.tsx'
import { useRouteState } from '../features/shared/routeState.ts'
import { useBriefs } from '../features/shared/useBriefs.ts'
import { useScrollMemory } from '../features/shared/useScrollMemory.ts'
import { usePortfolio } from '../features/shared/usePortfolio.ts'
import { DwGateway } from '../gateway/dw.ts'
import { GatewayProvider } from '../gateway/react.tsx'
import { startSandbox } from '../writes.ts'
import { Card, Problem } from './Card.tsx'
import Chevrons, { PANEL_ID, tabId } from './Chevrons.tsx'
import { demoFrom } from './demo.ts'
import HeadlineStrip from './HeadlineStrip.tsx'
import Navbar from './Navbar.tsx'
import { type Demo, defaultDemo, useDemos, useSession } from './session.ts'
import './Shell.css'

// One demo, as the URL names it (#/<org>/…): its content from tyapi (GET /v1/projects/{org}/{project}/demo), and a
// gateway reading the visitor's sandbox of its graph, around test8's frame. A demo the visitor cannot open goes to
// their first.

export default function Shell() {
  const { org } = useParams()
  const demos = useDemos()
  const listing = demos.data?.find((d) => d.org === org)
  const content = useQuery({
    queryKey: ['demo', listing?.graph],
    queryFn: async () =>
      demoFrom(await answer(api.GET('/v1/projects/{org}/{project}/demo', { params: { path: { org: listing!.org, project: listing!.project } } }))),
    enabled: !!listing,
  })
  // The visitor's own branch of the demo, started on opening it so reads and writes always have one (tyapi W11).
  // A visitor who may only read the demo reads its main.
  const sandbox = useQuery({
    queryKey: ['sandbox', listing?.graph],
    queryFn: async () => {
      try {
        return (await startSandbox(listing!)).branch
      } catch (e) {
        if (e instanceof ApiError && e.status === 403) return 'main'
        throw e
      }
    },
    enabled: !!listing,
    staleTime: Infinity,
  })
  const branch = sandbox.data
  const gateway = useMemo(() => (listing && branch ? new DwGateway({ ...listing, branch }) : undefined), [listing?.graph, branch])

  if (demos.isPending) return <Card lede="Opening your demos…" />
  if (demos.error) return <Problem what="list your demos" error={demos.error} onRetry={() => void demos.refetch()} />
  if (!listing) return <FirstDemo demos={demos.data} />
  if (sandbox.error) return <Problem what={`open your copy of ${listing.org_name}`} error={sandbox.error} onRetry={() => void sandbox.refetch()} />
  if (content.isPending || !gateway) return <Card lede={`Opening ${listing.org_name}…`} />
  if (content.error) return <Problem what={`open ${listing.org_name}`} error={content.error} onRetry={() => void content.refetch()} />
  return (
    <DemoProvider demo={content.data}>
      <GatewayProvider client={gateway}>
        <Frame listing={listing} demos={demos.data} />
      </GatewayProvider>
    </DemoProvider>
  )
}

/** Where a URL that names no demo the visitor can open goes: their first, or word that they have none. */
export function FirstDemo({ demos }: { demos: Demo[] }) {
  const { me, signOut } = useSession()
  const first = defaultDemo(demos)
  if (first) return <Navigate to={`/${first.org}`} replace />
  return (
    <Card lede={`No demo is open to ${me.email ?? me.display_name}. Ask Longreach to add you to Decision Watch's visitors.`}>
      <button type="button" className="btn-line signin-button" onClick={signOut}>
        Log out
      </button>
    </Card>
  )
}

/** The frame every tab shares, from test8 (its docs/PLAN.md §4.1). Counts and headline figures come from the
 *  graph as of the route's date. */
function Frame({ listing, demos }: { listing: Demo; demos: Demo[] }) {
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
