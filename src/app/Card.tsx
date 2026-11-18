import type { ReactNode } from 'react'
import { say } from '../ui/Notice.tsx'
import './SignIn.css'

// The page outside a demo or project: signing in, waiting, and what went wrong, in the API's own words. Inside the
// frame, a screen says the same with ui/Notice.tsx.

export function Card({ lede, children }: { lede?: string; children?: ReactNode }) {
  return (
    <main className="signin">
      <div className="signin-card">
        <img className="signin-logo" src={`${import.meta.env.BASE_URL}longreach-logo.svg`} alt="Longreach" width={31} height={38} />
        <h1 className="signin-title">Decision Watch</h1>
        {lede && <p className="signin-lede">{lede}</p>}
        {children}
      </div>
    </main>
  )
}

/** What did not happen, why, and a way to try again. */
export function Problem({ what, error, onRetry }: { what: string; error: unknown; onRetry?: () => void }) {
  return (
    <Card>
      <p className="signin-problem" role="alert">
        Longreach did not {what}: {say(error)}
      </p>
      {onRetry && (
        <button type="button" className="btn-line signin-button" onClick={onRetry}>
          Try again
        </button>
      )}
    </Card>
  )
}
