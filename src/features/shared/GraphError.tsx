import { ApiError } from '../../api.ts'
import './GraphError.css'

// What a tab shows when the graph does not answer (docs/PLAN.md §7.5): what
// happened, the gateway's code, and what to do next.

const CODE_TEXT: Record<string, string> = {
  unavailable: 'The graph service is not answering.',
  unknown_query: 'The graph does not know one of the questions this screen asks; the app and the graph are out of step.',
}

export default function GraphError({ error }: { error: Error }) {
  const code = error instanceof ApiError ? error.code : undefined
  return (
    <div className="graph-error" role="alert">
      <h1>The commitments graph did not answer</h1>
      <p>{(code && CODE_TEXT[code]) ?? error.message}</p>
      <p>Reload the page to try again. Nothing you changed is lost.</p>
      {code && <p className="graph-error-code">Code: {code}</p>}
    </div>
  )
}
