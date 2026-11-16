import { useParams, useSearchParams } from 'react-router'
import { usePortfolio } from '../shared/usePortfolio.ts'
import CommitmentDetail from './CommitmentDetail.tsx'
import CommitmentList from '../shared/CommitmentList.tsx'
import GraphError from '../shared/GraphError.tsx'
import ImportSheet from './ImportSheet.tsx'
import NewCommitment from './NewCommitment.tsx'
import Runway from './Runway.tsx'
import './CommitmentTab.css'

// The Commitment tab (docs/layouts.md, "Chosen layout"): the grouped list on
// the left; the window runway when nothing is selected; the selected
// commitment's detail and date spine otherwise.
export default function CommitmentTab() {
  const { slug } = useParams()
  const { portfolio, error } = usePortfolio()
  const [search, setSearch] = useSearchParams()
  if (error) return <GraphError error={error} />
  const closeSheet = () => {
    const next = new URLSearchParams(search)
    next.delete('new')
    setSearch(next)
  }
  return (
    <div className="ctab">
      <CommitmentList
        portfolio={portfolio}
        selected={slug}
        tools={<NewCommitment />}
        overview={{ label: 'What closes when', to: '/commitment' }}
        rowPath={(s) => `/commitment/${s}`}
      />
      <div className="ctab-main">{slug ? <CommitmentDetail slug={slug} /> : <Runway portfolio={portfolio} />}</div>
      {search.get('new') === 'import' && <ImportSheet onClose={closeSheet} />}
    </div>
  )
}
