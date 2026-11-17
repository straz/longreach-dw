import { Navigate, type RouteObject, useParams } from 'react-router'
import CommitmentTab from '../features/commitment/CommitmentTab.tsx'
import DraftPage from '../features/draft/DraftPage.tsx'
import ReconsiderTab from '../features/reconsider/ReconsiderTab.tsx'
import UpdatePage from '../features/updates/UpdatePage.tsx'
import WatchTab from '../features/watch/WatchTab.tsx'
import Shell, { DemosGate, FirstDemo } from './Shell.tsx'

// Hash routes, because GitHub Pages has no server rewrites: #/<org>/<tab>/<selection>?asof=. The demo comes
// first; under it, test8's routes, whose optional segments carry the selection: a commitment, a Watch view, a
// brief.
export const routes: RouteObject[] = [
  {
    path: '/:org',
    element: <Shell />,
    children: [
      { index: true, element: <FirstTab /> },
      { path: 'commitment/:slug?', element: <CommitmentTab /> },
      { path: 'draft/:slug?', element: <DraftPage /> },
      { path: 'update', element: <UpdatePage /> },
      { path: 'watch/:view?', element: <WatchTab /> },
      { path: 'reconsider/:brief?', element: <ReconsiderTab /> },
      { path: '*', element: <FirstTab /> },
    ],
  },
  { path: '*', element: <NoDemoNamed /> },
]

/** A demo's first tab. */
function FirstTab() {
  const { org } = useParams()
  return <Navigate to={`/${org}/commitment`} replace />
}

/** A URL that names no demo: the visitor's first. */
function NoDemoNamed() {
  return <DemosGate>{(demos) => <FirstDemo demos={demos} />}</DemosGate>
}
