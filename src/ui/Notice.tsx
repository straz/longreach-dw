import './notice.css'

// What a screen inside the frame says while it waits, or when something did not happen: a line in the panel, not
// the full-page card of signing in (app/Card.tsx).

/** An error's words: the API's own message, or the thrown value. */
export const say = (e: unknown) => (e instanceof Error ? e.message : String(e))

export function PanelNote({ children }: { children: string }) {
  return <p className="panel-note">{children}</p>
}

/** What did not happen, why, and a way to try again. */
export function PanelProblem({ what, error, onRetry }: { what: string; error: unknown; onRetry?: () => void }) {
  return (
    <div className="panel-note" role="alert">
      <p>
        Longreach did not {what}: {say(error)}
      </p>
      {onRetry && (
        <button type="button" className="btn-line is-small" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  )
}
