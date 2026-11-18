import { Navigate, type RouteObject, useParams } from 'react-router'
import CommitmentTab from '../features/commitment/CommitmentTab.tsx'
import DraftPage from '../features/draft/DraftPage.tsx'
import ReconsiderTab from '../features/reconsider/ReconsiderTab.tsx'
import UpdatePage from '../features/updates/UpdatePage.tsx'
import WatchTab from '../features/watch/WatchTab.tsx'
import { basePath } from '../features/shared/routeState.ts'
import ConnectAiPage from './ConnectAiPage.tsx'
import ConsentPage from './ConsentPage.tsx'
import NewProjectPage from './NewProjectPage.tsx'
import DemoShell, { DemosGate, FirstDemo, ProjectShell } from './Shell.tsx'

// Hash routes, because GitHub Pages has no server rewrites: #/<org>/<tab>/<selection>?asof= for a demo, and
// #/p/<org>/<project>/<tab>/… for a project of the user's own. Under either, test8's routes, whose optional segments
// carry the selection: a commitment, a Watch view, a brief. #/new-project makes a project, #/connect-ai connects
// the user's AI assistant, and #/model-consent is an org's consent to model providers.
const tabs: RouteObject[] = [
  { index: true, element: <FirstTab /> },
  { path: 'commitment/:slug?', element: <CommitmentTab /> },
  { path: 'draft/:slug?', element: <DraftPage /> },
  { path: 'update', element: <UpdatePage /> },
  { path: 'watch/:view?', element: <WatchTab /> },
  { path: 'reconsider/:brief?', element: <ReconsiderTab /> },
  { path: '*', element: <FirstTab /> },
]

export const routes: RouteObject[] = [
  { path: '/new-project', element: <NewProjectPage /> },
  { path: '/connect-ai', element: <ConnectAiPage /> },
  { path: '/model-consent', element: <ConsentPage /> },
  { path: '/p/:org/:project', element: <ProjectShell />, children: tabs },
  { path: '/:org', element: <DemoShell />, children: tabs },
  { path: '*', element: <NoDemoNamed /> },
]

/** A demo's or project's first tab. */
function FirstTab() {
  return <Navigate to={`${basePath(useParams())}/commitment`} replace />
}

/** A URL that names no demo: the visitor's first. */
function NoDemoNamed() {
  return <DemosGate>{(demos) => <FirstDemo demos={demos} />}</DemosGate>
}
